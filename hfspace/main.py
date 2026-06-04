from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from pymongo import MongoClient
from datetime import datetime
import os, json, asyncio
from concurrent.futures import ThreadPoolExecutor

app = FastAPI()

# CORS — allow your Vercel domain to call this
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # after testing, replace * with your vercel URL
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# Clients (initialized once on startup)
nvidia = OpenAI(
    api_key=os.environ["NVIDIA_API_KEY"],
    base_url="https://integrate.api.nvidia.com/v1",
    timeout=60.0  # 60 seconds timeout to prevent infinite hanging
)
mongo = MongoClient(os.environ["MONGODB_URI"])
db = mongo["cgl_core_db"]

API_SECRET = os.environ["API_SECRET"]
executor = ThreadPoolExecutor(max_workers=10)


class AnalyzeRequest(BaseModel):
    imagesBase64: list[str]
    userId: str = "anonymous"
    examType: str = "SSC CGL"
    subject: str = "Mixed"
    questionCount: int = 5


# Health check — also used as wake-up ping
@app.get("/")
async def root():
    return {"status": "online", "service": "cgl-analyze"}


@app.post("/analyze")
async def analyze(
    body: AnalyzeRequest,
    x_api_secret: str = Header(None)
):
    # Security check
    if x_api_secret != API_SECRET:
        print("Forbidden access attempt: X-API-Secret header mismatch.")
        raise HTTPException(status_code=403, detail="Forbidden")

    print(f"[{datetime.utcnow()}] Received analyze request for User ID: {body.userId}")
    print(f"Parameters: Exam={body.examType}, Subject={body.subject}, Questions={body.questionCount}")
    print(f"Processing {len(body.imagesBase64)} note images...")

    # --- STEP 1: Run OCR on all images concurrently ---
    def ocr_single(img_base64: str) -> str:
        print("Starting OCR extraction for a note page...")
        try:
            resp = nvidia.chat.completions.create(
                model="meta/llama-3.2-11b-vision-instruct",
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract all text, lists, facts, vocabulary words, and handwritten notes from this image with absolute precision. Do not summarize or format. Return only raw text data."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{img_base64}"
                            }
                        }
                    ]
                }]
            )
            content = resp.choices[0].message.content or ""
            print(f"Finished OCR extraction. Extracted {len(content)} characters.")
            return content
        except Exception as e:
            print(f"OCR extraction failed for page: {str(e)}")
            raise e

    # Run all OCR calls sequentially one-by-one to avoid hitting concurrency limits on the free tier
    ocr_results = []
    for idx, img in enumerate(body.imagesBase64):
        print(f"Processing page {idx + 1} of {len(body.imagesBase64)}...")
        page_text = await asyncio.to_thread(ocr_single, img)
        ocr_results.append(page_text)
    raw_text = "\n\n--- NEXT NOTE PAGE ---\n\n".join(ocr_results)

    if not raw_text.strip():
        print("Error: OCR extraction yielded zero usable data.")
        raise HTTPException(status_code=422, detail="OCR extraction yielded zero usable data")

    print(f"Extracted raw text combined size: {len(raw_text)} characters.")
    print("Generating MCQs using Nemotron model...")

    # --- STEP 2: Generate MCQs from extracted text ---
    system_prompt = f"""
You are an expert {body.examType} Content Generator. Review the following raw textbook/note data and perform two tasks:
1. Extract all high-priority English vocabulary words or advanced facts found.
2. Construct exactly {body.questionCount} tough Multiple Choice Questions (MCQs) mimicking the TCS examination style for the subject/section "{body.subject}" based strictly on the text.

You must respond ONLY with a raw, valid JSON object following this exact syntax:
{{
    "vocabWords": [
        {{ "word": "string", "meaning": "string", "contextFromNotes": "string" }}
    ],
    "quiz": [
        {{
            "question": "string",
            "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
            "correctAnswer": "A/B/C/D",
            "explanation": "Detailed exam-oriented breakdown explaining why this choice is correct."
        }}
    ]
}}
"""

    def generate_mcq():
        try:
            return nvidia.chat.completions.create(
                model="meta/llama-3.3-70b-instruct",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Here is the raw extracted text from the study notes:\n\n{raw_text}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.3
            )
        except Exception as e:
            print(f"MCQ generation call failed: {str(e)}")
            raise e

    gen_response = await asyncio.to_thread(generate_mcq)
    output = json.loads(gen_response.choices[0].message.content)
    print(f"Successfully synthesized {len(output.get('quiz', []))} MCQs and {len(output.get('vocabWords', []))} vocab words.")

    # --- STEP 3: Save to MongoDB ---
    print("Connecting to MongoDB to log the generated mock quiz...")
    quiz_doc = db["quizzes"].insert_one({
        "creatorId": body.userId,
        "createdAt": datetime.utcnow(),
        "questions": output.get("quiz", []),
        "imagesBase64": body.imagesBase64,
        "examType": body.examType,
        "subject": body.subject,
        "questionCount": body.questionCount,
        "sharedWith": []
    })
    print(f"Mock quiz saved successfully. ID: {quiz_doc.inserted_id}")

    vocab_words = output.get("vocabWords", [])
    if vocab_words:
        db["vocab_vault"].insert_many([{
            "userId": body.userId,
            "word": v["word"],
            "meaning": v["meaning"],
            "context": v.get("contextFromNotes", ""),
            "mastered": False,
            "addedAt": datetime.utcnow()
        } for v in vocab_words])

    return {
        "success": True,
        "quizId": str(quiz_doc.inserted_id),
        "quizData": output.get("quiz", []),
        "vocabData": vocab_words
    }
