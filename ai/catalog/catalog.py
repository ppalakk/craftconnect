from pathlib import Path
import json 
import os
import base64

from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel


# ==========================================
# 1. PRODUCT CATALOG SCHEMA (HANDICRAFT REDESIGN)
# ==========================================

class ProductCatalog(BaseModel):
    product_name: str
    craft_category: str
    craft_type: str
    primary_material: str
    crafting_time: str
    size_complexity: str
    artisan_region: str
    utility_type: str
    target_market: list[str]
    description: str
    visual_features: list[str]
    tags: list[str]


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

if not image_path.exists():
    # Fallback to sitadevi.png if product.jpg doesn't exist
    image_path = PROJECT_ROOT / "sitadevi.png"

with open(image_path, "rb") as f:
    image_bytes = f.read()

image_base64 = base64.b64encode(image_bytes).decode("utf-8")


# ==========================================
# 6. AI PROMPT WITH STRICT UNKNOWN FALLBACKS
# ==========================================

prompt = """
You are the AI catalog assistant for CraftConnect.
CraftConnect helps marginalized Indian artisans digitally catalog and sell their handcrafted products.

Analyze the provided product image carefully and generate structured catalog fields:

Required JSON fields:
1. product_name: Descriptive title of the product.
2. craft_category: Primary craft sector (e.g., "Pottery & Terracotta", "Bamboo & Cane", "Handloom Textiles", "Metalwork & Brassware", "Woodcraft", "Folk Painting & Tribal Art").
3. craft_type: Specific craft technique (e.g., "Dhokra Casting", "Clay Pottery", "Madhubani Painting", "Block Printing", "Basketry", "Wood Carving").
4. primary_material: Dominant raw material visible (e.g., "Terracotta Clay", "Bamboo", "Pure Brass", "Sheesham Wood", "Cotton Handloom"). If uncertain, set to "Unknown".
5. crafting_time: Estimated craft labor category ("< 5 Hours", "1-3 Days", "4-7 Days", "> 1 Week", or "Unknown"). Set to "Unknown" if not determinable.
6. size_complexity: Product scale/complexity ("Small/Miniature", "Medium/Standard", "Large/Display", "Intricate Multi-piece Set").
7. artisan_region: Traditional origin or state if known from visual style. Set to "Unknown" if region cannot be visually confirmed. NEVER invent an artisan region or GI tag.
8. utility_type: Main purpose ("Home Decor / Exhibition", "Kitchenware / Utility", "Festive & Ritual", "Wearable Fashion").
9. target_market: List of target buyer segments.
10. description: Rich e-commerce product description.
11. visual_features: List of notable visual features.
12. tags: Relevant search tags starting with #.

CRITICAL RULES:
- If a field (like artisan_region, crafting_time, or primary_material) cannot reliably be confirmed from the image alone, set its value to "Unknown".
- NEVER invent a specific artisan region, GI origin, crafting time, or exact material.
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