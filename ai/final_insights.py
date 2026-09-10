from pathlib import Path
import json


# -----------------------------
# 1. Project Paths
# -----------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATA_DIR = PROJECT_ROOT / "ai" / "data"


# -----------------------------
# 2. Load JSON Helper
# -----------------------------

def load_json(filename):
    path = DATA_DIR / filename

    if not path.exists():
        raise FileNotFoundError(
            f"{filename} not found in ai/data/"
        )

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# -----------------------------
# 3. Load AI Results
# -----------------------------

catalog = load_json("catalog.json")
pricing = load_json("pricing.json")
market = load_json("market.json")
trends = load_json("trends.json")


# -----------------------------
# 4. Combine All AI Insights
# -----------------------------

final_insights = {
    "product_catalog": catalog,
    "price_recommendation": pricing,
    "market_recommendation": market,
    "demand_and_trends": trends
}


# -----------------------------
# 5. Save Final Output
# -----------------------------

output_path = DATA_DIR / "final_insights.json"

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(
        final_insights,
        f,
        indent=2,
        ensure_ascii=False
    )


# -----------------------------
# 6. Display Result
# -----------------------------

print("\n====================================")
print("   CRAFTCONNECT FINAL AI INSIGHTS")
print("====================================\n")

print(json.dumps(
    final_insights,
    indent=2,
    ensure_ascii=False
))

print(f"\nFinal insights saved to: {output_path}")