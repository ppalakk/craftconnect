from pathlib import Path
import json
import joblib
import pandas as pd


# -----------------------------------------
# PATHS
# -----------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

MODEL_PATH = PROJECT_ROOT / "ai" / "models" / "price_range_model.pkl"
CATALOG_PATH = PROJECT_ROOT / "ai" / "data" / "catalog.json"


# -----------------------------------------
# LOAD MODEL
# -----------------------------------------

model = joblib.load(MODEL_PATH)


# -----------------------------------------
# LOAD CATALOG
# -----------------------------------------

with open(CATALOG_PATH, "r", encoding="utf-8") as f:
    catalog = json.load(f)


# -----------------------------------------
# CONVERT CATALOG → MODEL INPUT
# -----------------------------------------

product = {
    "product_name": catalog["product_name"],
    "primary_category": catalog["category"],
    "secondary_category": catalog["craft_type"],
    "tertiary_category": catalog["material"],
    "product_type": catalog["category"],
    "target_demographic": ", ".join(catalog["target_market"]),
    "seasonal_relevance": "Festive",
    "purchase_frequency": "Occasionally"
}

input_data = pd.DataFrame([product])


# -----------------------------------------
# PREDICT
# -----------------------------------------

prediction = model.predict(input_data)[0]

probabilities = model.predict_proba(input_data)[0]

classes = model.classes_

confidence = probabilities.max()


# -----------------------------------------
# DISPLAY
# -----------------------------------------

print("\n==============================")
print("CRAFTCONNECT PRICE PREDICTION")
print("==============================")

print(f"\nProduct: {product['product_name']}")

print(f"Predicted Price Range: {prediction}")

print(f"Confidence: {confidence:.2%}")

print("\nClass probabilities:")

for class_name, probability in zip(classes, probabilities):
    print(f"{class_name}: {probability:.2%}")


# -----------------------------------------
# SAVE RESULT
# -----------------------------------------

result = {
    "product_name": product["product_name"],
    "predicted_price_range": prediction,
    "confidence": round(float(confidence), 4),
    "class_probabilities": {
        class_name: round(float(probability), 4)
        for class_name, probability in zip(classes, probabilities)
    }
}

output_path = PROJECT_ROOT / "ai" / "data" / "ml_price_prediction.json"

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print("\nPrediction saved to:")
print(output_path)
