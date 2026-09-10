from pathlib import Path
import re
import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.ensemble import RandomForestClassifier


# -----------------------------------------
# PATHS
# -----------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

HANDICRAFT_DATA_PATH = PROJECT_ROOT / "ai" / "data" / "handicraft_pricing_dataset.csv"
LEGACY_DATA_PATH = PROJECT_ROOT / "ai" / "data" / "pricing_dataset.csv"
MODEL_PATH = PROJECT_ROOT / "ai" / "models" / "price_range_model.pkl"


# -----------------------------------------
# TEXT SANITIZATION & LEAKAGE PREVENTION
# -----------------------------------------

def sanitize_text(text: str) -> str:
    """
    Strips explicit price tier words and currency strings from product text
    to strictly prevent data leakage prior to TF-IDF vectorization.
    """
    if not isinstance(text, str):
        return ""
    
    # Remove price tier keywords (case-insensitive)
    leakage_terms = [
        r'\bbudget\b', r'\bmid-range\b', r'\bmidrange\b', r'\bpremium\b',
        r'\brs\.?\s*\d+\b', r'₹\s*\d+', r'\binr\s*\d+\b', r'\bcheap\b', r'\bexpensive\b'
    ]
    
    sanitized = text
    for term in leakage_terms:
        sanitized = re.sub(term, '', sanitized, flags=re.IGNORECASE)
    
    return sanitized.strip()


# -----------------------------------------
# LOAD & PREPARE DATASET
# -----------------------------------------

if HANDICRAFT_DATA_PATH.exists():
    df = pd.read_csv(HANDICRAFT_DATA_PATH)
    print(f"Loaded Handicraft Dataset: {HANDICRAFT_DATA_PATH.name} shape: {df.shape}")
elif LEGACY_DATA_PATH.exists():
    print("Handicraft dataset not found. Adapting legacy dataset to new schema format...")
    df_raw = pd.read_csv(LEGACY_DATA_PATH)
    
    # Map legacy dataset columns to new schema format
    df = pd.DataFrame()
    df["product_name"] = df_raw["product_name"]
    df["craft_category"] = df_raw["primary_category"]
    df["craft_type"] = df_raw["secondary_category"]
    df["primary_material"] = df_raw["tertiary_category"]
    df["crafting_time"] = "Unknown"
    df["size_complexity"] = "Medium/Standard"
    df["artisan_region"] = "Unknown"
    df["utility_type"] = df_raw["product_type"]
    df["target_demographic"] = df_raw["target_demographic"]
    df["actual_price"] = np.nan
    df["price_range"] = df_raw["price_range"]
else:
    raise FileNotFoundError("No pricing dataset found in ai/data/")

# Clean text column to prevent leakage
df["product_name"] = df["product_name"].astype(str).apply(sanitize_text)

# -----------------------------------------
# FEATURE SELECTION (EXCLUDING TARGETS & LEAKAGE)
# -----------------------------------------

features = [
    "product_name",
    "craft_category",
    "craft_type",
    "primary_material",
    "crafting_time",
    "size_complexity",
    "artisan_region",
    "utility_type",
    "target_demographic"
]

target = "price_range"

df = df[features + [target]].dropna(subset=[target])

X = df[features]
y = df[target]

print(f"Dataset target distribution:\n{y.value_counts()}")


# -----------------------------------------
# TRAIN / TEST SPLIT (STRATIFIED)
# -----------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


# -----------------------------------------
# PREPROCESSING PIPELINE (FITTED ONLY ON TRAIN DATA)
# -----------------------------------------

categorical_features = [
    "craft_category",
    "craft_type",
    "primary_material",
    "crafting_time",
    "size_complexity",
    "artisan_region",
    "utility_type",
    "target_demographic"
]

preprocessor = ColumnTransformer(
    transformers=[
        (
            "product_name",
            TfidfVectorizer(
                max_features=1000,
                ngram_range=(1, 2)
            ),
            "product_name"
        ),
        (
            "categorical",
            OneHotEncoder(
                handle_unknown="ignore"
            ),
            categorical_features
        )
    ]
)


# -----------------------------------------
# MODEL PIPELINE
# -----------------------------------------

model = RandomForestClassifier(
    n_estimators=300,
    random_state=42,
    class_weight="balanced"
)

pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("model", model)
    ]
)


# -----------------------------------------
# STRATIFIED 5-FOLD CROSS VALIDATION
# -----------------------------------------

print("\nExecuting Stratified 5-Fold Cross-Validation...")
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

cv_results = cross_validate(
    pipeline,
    X,
    y,
    cv=skf,
    scoring=["accuracy", "f1_macro", "f1_weighted"]
)

print(f"5-Fold CV Accuracy: {cv_results['test_accuracy'].mean():.2%} (+/- {cv_results['test_accuracy'].std():.2%})")
print(f"5-Fold CV Macro F1: {cv_results['test_f1_macro'].mean():.4f}")
print(f"5-Fold CV Weighted F1: {cv_results['test_f1_weighted'].mean():.4f}")


# -----------------------------------------
# FINAL MODEL TRAINING ON TRAIN SET
# -----------------------------------------

print("\nTraining final model pipeline on training split...")
pipeline.fit(X_train, y_train)


# -----------------------------------------
# HOLDOUT TEST EVALUATION
# -----------------------------------------

predictions = pipeline.predict(X_test)
accuracy = accuracy_score(y_test, predictions)
cm = confusion_matrix(y_test, predictions, labels=pipeline.classes_)

print("\n==============================================")
print("     HANDICRAFT PRICE MODEL TEST RESULTS      ")
print("==============================================")

print(f"\nHoldout Test Accuracy: {accuracy:.2%}")

print("\nClassification Report (Precision, Recall, F1):")
print(classification_report(y_test, predictions))

print("\nConfusion Matrix:")
cm_df = pd.DataFrame(cm, index=pipeline.classes_, columns=pipeline.classes_)
print(cm_df)


# -----------------------------------------
# SAVE TRAINED PIPELINE
# -----------------------------------------

MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
joblib.dump(pipeline, MODEL_PATH)

print("\nModel saved successfully:")
print(MODEL_PATH)
