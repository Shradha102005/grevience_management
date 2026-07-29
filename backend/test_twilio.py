"""Quick Twilio diagnostics script."""
import os
from twilio.rest import Client

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")

if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
    raise RuntimeError("Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN env vars before running this script.")

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

twiml = '<Response><Say language="en-IN">Hello! This is a test call from CivicSaathi. Twilio is working.</Say><Hangup/></Response>'
print('Making test call...')
try:
    call = client.calls.create(
        twiml=twiml,
        from_=os.environ.get("TWILIO_FROM_NUMBER", ""),
        to=os.environ.get("TWILIO_TO_NUMBER", ""),
    )
    print('SUCCESS! SID:', call.sid, '| Status:', call.status)
except Exception as e:
    print('FAILED:', e)
