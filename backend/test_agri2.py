import os, sys, io, json, re

os.environ['GROQ_API_KEY'] = open('.env').read().split('GROQ_API_KEY=')[1].split()[0].strip()

from groq import Groq
_groq = Groq(api_key=os.environ['GROQ_API_KEY'])

symptom = 'white powdery coating on tomato leaves'

system_prompt = (
    "You are an expert Indian agricultural scientist. "
    "Based on the farmer's crop symptom description, respond ONLY with a valid JSON object "
    "in this exact format (no markdown, no extra text):\n"
    '{"diagnosis": "<disease or condition name>", "confidence": <integer 60-99>, '
    '"treatment": ["<step 1>", "<step 2>", "<step 3>", "<step 4>"], '
    '"schemes": ["<scheme 1>", "<scheme 2>", "<scheme 3>"]}'
)

user_msg = (
    f"A farmer reports the following crop symptoms: {symptom}. "
    "Diagnose the most likely disease or deficiency, give a confidence percentage, "
    "4 specific treatment steps, and 3 relevant Indian government schemes."
)

try:
    resp = _groq.chat.completions.create(
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
    data = json.loads(raw)
    print("SUCCESS - Diagnosis:", data.get("diagnosis"), "| Confidence:", data.get("confidence"))
except Exception as e:
    print("EXCEPTION:", type(e).__name__, "-", e)
