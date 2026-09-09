from pathlib import Path
import os

from dotenv import load_dotenv
from google import genai

# Find project root
PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Load .env
load_dotenv(PROJECT_ROOT / ".env")

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env")

# Create Gemini client
client = genai.Client(api_key=api_key)

# Simple Gemini test
interaction = client.interactions.create(
    model="gemini-3.6-flash",
    input="Say hello to CraftConnect in one sentence."
)

print(interaction.output_text)