from pathlib import Path
import json 
import os
import base64

from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel


# ==========================================
# 1. PRODUCT CATALOG SCHEMA
# ==========================================

class ProductCatalog(BaseModel):
    product_name: str
    category: str
    craft_type: str
    material: str
    description: str
    visual_features: list[str]
    tags: list[str]
    target_market: list[str]


# ==========================================
# 2. PROJECT ROOT
# ==========================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]


# ==========================================
# 3. LOAD API KEY
# ==========================================

load_dotenv(PROJECT_ROOT / ".env")

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env")


# ==========================================
# 4. CREATE GEMINI CLIENT
# ==========================================

client = genai.Client(api_key=api_key)


# ==========================================
# 5. LOAD PRODUCT IMAGE
# ==========================================

image_path = Path(__file__).parent / "product.jpg"

with open(image_path, "rb") as f:
    image_bytes = f.read()

image_base64 = base64.b64encode(image_bytes).decode("utf-8")


# ==========================================
# 6. AI PROMPT
# ==========================================

prompt = """
You are the AI catalog assistant for CraftConnect.

CraftConnect helps marginalized artisans digitally
catalog and sell their handcrafted products.

Analyze the provided product image carefully.

Create a product catalog using ONLY information that
can reasonably be inferred from the image.

Important rules:

- Do not invent exact material if it cannot be identified.
- If the material is uncertain, say "Likely metal" or similar.
- Do not claim that something is handmade unless there
  is visual evidence suggesting it.
- Keep the description suitable for an e-commerce catalog.
- Generate useful tags for searching the product.
- Identify realistic target markets.
"""


# ==========================================
# 7. SEND IMAGE TO GEMINI
# ==========================================

interaction = client.interactions.create(
    model="gemini-3.6-flash",

    input=[
        {
            "type": "text",
            "text": prompt
        },
        {
            "type": "image",
            "data": image_base64,
            "mime_type": "image/jpeg"
        }
    ],

    # Force Gemini to return JSON
    response_format={
        "type": "text",
        "mime_type": "application/json",
        "schema": ProductCatalog.model_json_schema()
    }
)


# ==========================================
# 8. CONVERT RESPONSE INTO PYTHON OBJECT
# ==========================================

catalog = ProductCatalog.model_validate_json(
    interaction.output_text
)


# ==========================================
# 9. DISPLAY RESULT
# ==========================================

print("\n====================================")
print("   CRAFTCONNECT AI PRODUCT CATALOG")
print("====================================\n")

print(catalog.model_dump_json(indent=2))

# Save catalog result
DATA_DIR = PROJECT_ROOT / "ai" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

catalog_path = DATA_DIR / "catalog.json"

with open(catalog_path, "w", encoding="utf-8") as f:
    json.dump(
        catalog.model_dump(),
        f,
        indent=2,
        ensure_ascii=False
    )

print(f"\nCatalog saved to: {catalog_path}")