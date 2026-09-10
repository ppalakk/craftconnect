from pathlib import Path
import os
import json

from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel


# -----------------------------
# 1. Price Recommendation Schema
# -----------------------------

class PriceRecommendation(BaseModel):
    suggested_price_min: int
    suggested_price_max: int
    recommended_price: int
    currency: str
    reasoning: str
    pricing_factors: list[str]


# -----------------------------
# 2. Project & API Setup
# -----------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

load_dotenv(PROJECT_ROOT / ".env")

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env")

client = genai.Client(api_key=api_key)


# -----------------------------
# 3. Load Catalog
# -----------------------------

catalog_path = PROJECT_ROOT / "ai" / "data" / "catalog.json"

if not catalog_path.exists():
    raise FileNotFoundError(
        "catalog.json not found. Run catalog.py first."
    )

with open(catalog_path, "r", encoding="utf-8") as f:
    product = json.load(f)


# -----------------------------
# 4. Pricing Prompt
# -----------------------------

prompt = f"""
You are the AI pricing assistant for CraftConnect.

CraftConnect helps marginalized artisans sell their
handcrafted products in online and offline markets.

Analyze the following product information and recommend
a realistic selling price in Indian Rupees (INR).

PRODUCT INFORMATION:

Product Name:
{product["product_name"]}

Category:
{product["category"]}

Craft Type:
{product["craft_type"]}

Material:
{product["material"]}

Description:
{product["description"]}

IMPORTANT RULES:

1. Give a realistic price range for an Indian handicraft market.
2. Do not assume the product is made from pure brass unless confirmed.
3. Consider material, craftsmanship, size/complexity,
   decorative value and likely target market.
4. Provide a minimum and maximum suggested price.
5. Provide one recommended price between the range.
6. Explain the reasoning clearly.
7. List the major factors affecting the price.
8. Do not give an extremely high or unrealistic price.
"""


# -----------------------------
# 5. Ask Gemini
# -----------------------------

interaction = client.interactions.create(
    model="gemini-3.6-flash",

    input=prompt,

    response_format={
        "type": "text",
        "mime_type": "application/json",
        "schema": PriceRecommendation.model_json_schema()
    }
)


# -----------------------------
# 6. Convert Response
# -----------------------------

pricing = PriceRecommendation.model_validate_json(
    interaction.output_text
)


# -----------------------------
# 7. Save Pricing Result
# -----------------------------

DATA_DIR = PROJECT_ROOT / "ai" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

pricing_path = DATA_DIR / "pricing.json"

with open(pricing_path, "w", encoding="utf-8") as f:
    json.dump(
        pricing.model_dump(),
        f,
        indent=2,
        ensure_ascii=False
    )


# -----------------------------
# 8. Display Result
# -----------------------------

print("\n====================================")
print("   CRAFTCONNECT AI PRICE ANALYSIS")
print("====================================\n")

print(json.dumps(
    pricing.model_dump(),
    indent=2,
    ensure_ascii=False
))

print(f"\nPricing saved to: {pricing_path}")