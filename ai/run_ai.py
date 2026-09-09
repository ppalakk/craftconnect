from pathlib import Path
import json


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "ai" / "data"


def load_json(filename):
    path = DATA_DIR / filename

    if not path.exists():
        raise FileNotFoundError(
            f"{filename} not found in ai/data/"
        )

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def main():

    print("\n")
    print("=" * 60)
    print("       CRAFTCONNECT AI PIPELINE")
    print("=" * 60)

    print("\n📂 Loading existing AI results...")

    catalog = load_json("catalog.json")
    print("✅ Product Catalog loaded")

    pricing = load_json("pricing.json")
    print("✅ Price Recommendation loaded")

    market = load_json("market.json")
    print("✅ Market Recommendation loaded")

    trends = load_json("trends.json")
    print("✅ Demand & Trends loaded")

    final_insights = {
        "product_catalog": catalog,
        "price_recommendation": pricing,
        "market_recommendation": market,
        "demand_and_trends": trends
    }

    output_path = DATA_DIR / "final_insights.json"

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(
            final_insights,
            f,
            indent=2,
            ensure_ascii=False
        )

    print("\n" + "=" * 60)
    print("       🎉 AI PIPELINE COMPLETED")
    print("=" * 60)

    print("\nAll existing CraftConnect AI results")
    print("have been combined successfully.")

    print(f"\n📁 Final file:")
    print(output_path)


if __name__ == "__main__":
    main()