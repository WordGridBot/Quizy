import os
import time
import json
from openai import OpenAI
from dotenv import load_dotenv

# Load env variables
script_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(script_dir, "..", ".env.local")
load_dotenv(dotenv_path=dotenv_path)

nvidia = OpenAI(
    api_key=os.environ["NVIDIA_API_KEY"],
    base_url="https://integrate.api.nvidia.com/v1"
)

# Sample text extracted from notes to test MCQ generation
sample_notes_text = """
MOST REPEATED SYNONYMS & ANTONYMS IN COMPETITIVE EXAMS:
1. Reprove (verb) - To criticize or correct someone gently.
   Synonyms: Admonish, chide, rebuke, reprimand.
   Antonyms: Praise, commend, applaud.
2. Capricious (adj) - Given to sudden and unaccountable changes of mood or behavior.
   Synonyms: Fickle, volatile, erratic, arbitrary.
   Antonyms: Consistent, stable, constant.
3. Exculpate (verb) - Show or declare that someone is not guilty of wrongdoing.
   Synonyms: Acquit, exonerate, vindicate, absolve.
   Antonyms: Condemn, convict, blame.
"""

system_prompt = """
You are an expert SSC CGL Content Generator. Review the raw textbook/note data and:
1. Extract all high-priority English vocabulary words.
2. Construct exactly 2 Multiple Choice Questions (MCQs) mimicking the TCS examination style based strictly on the text.

You must respond ONLY with a raw, valid JSON object matching this syntax:
{
    "vocabWords": [
        { "word": "string", "meaning": "string", "contextFromNotes": "string" }
    ],
    "quiz": [
        {
            "question": "string",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": "A/B/C/D",
            "explanation": "Detailed explanation."
        }
    ]
}
"""

models_to_test = [
    {"name": "Llama 3.3 Nemotron 49B (Current)", "id": "nvidia/llama-3.3-nemotron-super-49b-v1.5"},
    {"name": "Llama 3.1 8B (Small/Fastest)", "id": "meta/llama-3.1-8b-instruct"},
    {"name": "Gemma 3 12B (Lightweight/Fast)", "id": "google/gemma-3-12b-it"},
    {"name": "Llama 3.3 70B (High Quality/Balanced)", "id": "meta/llama-3.3-70b-instruct"}
]

print("============================================================")
print("  MCQ GENERATION SPEED BENCHMARK")
print("============================================================\n")

for model in models_to_test:
    print(f"Testing model: {model['name']} ({model['id']})...")
    start = time.time()
    try:
        resp = nvidia.chat.completions.create(
            model=model['id'],
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": sample_notes_text}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        duration = time.time() - start
        
        # Verify JSON
        content = resp.choices[0].message.content
        output = json.loads(content)
        questions_count = len(output.get("quiz", []))
        
        print(f"✅ Success in {duration:.2f} seconds! (Generated {questions_count} MCQs)")
    except Exception as e:
        duration = time.time() - start
        print(f"❌ Failed in {duration:.2f} seconds: {str(e)}")
    print("-" * 60)
