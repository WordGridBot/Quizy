from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from pymongo import MongoClient
from datetime import datetime
import os, json, asyncio

app = FastAPI()

# CORS — allow Vercel domains to call this
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# Load API Keys (supports single key or comma-separated list of keys for rotation)
API_KEYS = [k.strip() for k in os.environ.get("NVIDIA_API_KEY", "").split(",") if k.strip()]
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()

# Initialize a queue containing indices of all free keys
free_keys_queue = asyncio.Queue()
for i in range(len(API_KEYS)):
    free_keys_queue.put_nowait(i)

def get_nvidia_client(index: int = 0) -> OpenAI:
    if not API_KEYS:
        raise ValueError("NVIDIA_API_KEY environment variable is missing or empty.")
    selected_key = API_KEYS[index % len(API_KEYS)]
    masked_key = selected_key[:10] + "..." + selected_key[-5:] if len(selected_key) > 15 else "..."
    print(f"Allocating API Key index {index % len(API_KEYS)}: {masked_key}", flush=True)
    return OpenAI(
        api_key=selected_key,
        base_url="https://integrate.api.nvidia.com/v1",
        timeout=180.0  # 180 seconds timeout
    )

groq_client = None
if GROQ_API_KEY:
    print("GROQ_API_KEY detected. Initializing Groq client.", flush=True)
    groq_client = OpenAI(
        api_key=GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1",
        timeout=180.0
    )
else:
    print("Warning: GROQ_API_KEY environment variable is missing. Will fall back to NVIDIA for MCQ generation.", flush=True)

class AnalyzeRequest(BaseModel):
    imagesBase64: list[str]
    userId: str = "anonymous"
    examType: str = "SSC CGL"
    subject: str = "Mixed"


# Health check — also used as wake-up ping
@app.get("/")
async def root():
    return {"status": "online", "service": "cgl-analyze"}


@app.post("/analyze")
async def analyze(
    body: AnalyzeRequest,
    x_api_secret: str = Header(None)
):
    API_SECRET = os.environ["API_SECRET"]
    # Security check
    if x_api_secret != API_SECRET:
        print("Forbidden access attempt: X-API-Secret header mismatch.", flush=True)
        raise HTTPException(status_code=403, detail="Forbidden")

    print(f"[{datetime.utcnow()}] Received analyze request for User ID: {body.userId}", flush=True)
    print(f"Parameters: Exam={body.examType}, Subject={body.subject}", flush=True)
    print(f"Processing {len(body.imagesBase64)} note images...", flush=True)

    # --- STEP 1: OCR + MCQ generation per page ---
    def process_page_sync(img_base64: str, page_idx: int, client: OpenAI) -> dict:
        print(f"Starting pipeline for Page {page_idx + 1}...", flush=True)
        
        # 1. OCR Step
        try:
            print(f"Page {page_idx + 1}: Querying vision model Llama 3.2 11B...", flush=True)
            ocr_resp = client.chat.completions.create(
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
            raw_text = ocr_resp.choices[0].message.content or ""
            print(f"Page {page_idx + 1}: OCR finished. Extracted {len(raw_text)} characters.", flush=True)
        except Exception as e:
            print(f"Page {page_idx + 1}: OCR failed with error: {str(e)}", flush=True)
            raise e

        if not raw_text.strip():
            print(f"Page {page_idx + 1}: OCR returned empty text.", flush=True)
            return {"quiz": [], "vocabWords": []}

        # 2. MCQ Generation Step
        system_prompt = f"""
You are an expert {body.examType} Content Generator. Review the following raw textbook/note data and perform two tasks:
1. Extract all high-priority English vocabulary words or advanced facts.
2. Construct as many tough Multiple Choice Questions (MCQs) as possible from the text, mimicking the TCS examination style for the subject/section "{body.subject}".
DO NOT exceed 25 MCQs.

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
        # Determine whether to use Groq or fall back to NVIDIA
        mcq_client = groq_client
        mcq_model = "llama-3.3-70b-versatile"
        if not mcq_client:
            print(f"Page {page_idx + 1}: GROQ_API_KEY not configured. Falling back to NVIDIA for MCQ generation.", flush=True)
            mcq_client = client
            mcq_model = "meta/llama-3.3-70b-instruct"

        try:
            print(f"Page {page_idx + 1}: Querying MCQ generator {mcq_model}...", flush=True)
            mcq_resp = mcq_client.chat.completions.create(
                model=mcq_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Here is the raw extracted text from the study notes:\n\n{raw_text}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.3
            )
            output = json.loads(mcq_resp.choices[0].message.content)
            print(f"Page {page_idx + 1}: Synthesis finished with {mcq_model}. Generated {len(output.get('quiz', []))} MCQs.", flush=True)
            return output
        except Exception as e:
            print(f"Page {page_idx + 1}: MCQ generation failed with error: {str(e)}", flush=True)
            raise e

    async def process_page(img_base64: str, page_idx: int) -> dict:
        # Request a free API key index
        print(f"Page {page_idx + 1}: Requesting API Key lock...", flush=True)
        key_idx = await free_keys_queue.get()
        client = get_nvidia_client(key_idx)
        try:
            # Run the synchronous function in a worker thread
            result = await asyncio.to_thread(process_page_sync, img_base64, page_idx, client)
            return result
        finally:
            # Release the API key index back to the queue
            print(f"Page {page_idx + 1}: Releasing API Key lock index {key_idx}...", flush=True)
            free_keys_queue.put_nowait(key_idx)

    try:
        # Run all note pages in parallel (limited by the number of API keys/Semaphore queue)
        tasks = [
            process_page(img, idx)
            for idx, img in enumerate(body.imagesBase64)
        ]
        results = await asyncio.gather(*tasks)
        
        # Merge all results
        combined_quiz = []
        combined_vocab = []
        for r in results:
            if r.get("quiz"):
                combined_quiz.extend(r["quiz"])
            if r.get("vocabWords"):
                combined_vocab.extend(r["vocabWords"])

        print(f"Pipeline finished. Total merged questions: {len(combined_quiz)}, vocab words: {len(combined_vocab)}", flush=True)
        return {
            "success": True,
            "quizData": combined_quiz,
            "vocabData": combined_vocab
        }
    except Exception as error:
        print(f"Pipeline failure: {str(error)}", flush=True)
        raise HTTPException(status_code=500, detail="Server failed to process images: " + str(error))
