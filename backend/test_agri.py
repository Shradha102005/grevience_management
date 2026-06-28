import os, sys, json
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv('.env')
from groq import Groq

c = Groq(api_key=os.getenv('GROQ_API_KEY'))

system_prompt = (
    "You are an expert Indian agricultural scientist. "
    "Based on the farmer's crop symptom description, respond ONLY with a valid JSON object "
    "in this exact format (no markdown, no extra text):\n"
    '{"diagnosis": "<disease or condition name>", "confidence": <integer 60-99>, '
    '"treatment": ["<step 1>", "<step 2>", "<step 3>", "<step 4>"], '
    '"schemes": ["<scheme 1>", "<scheme 2>", "<scheme 3>"]}'
)

user_msg = (
    "A farmer reports the following crop symptoms: white powdery coating on tomato leaves. "
    "Diagnose the most likely disease or deficiency, give a confidence percentage, "
    "4 specific treatment steps, and 3 relevant Indian government schemes."
)

try:
    resp = c.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=700,
        temperature=0.4,
        response_format={"type": "json_object"},
    )
    raw = (resp.choices[0].message.content or "").strip()
    print("Raw response:", raw[:300])
    data = json.loads(raw)
    print("Diagnosis:", data.get("diagnosis"))
    print("Confidence:", data.get("confidence"))
    print("is_mock: False — WORKING!")
except Exception as e:
    print("ERROR:", type(e).__name__, e)
