from pathlib import Path
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report
from sklearn.ensemble import RandomForestClassifier


# -----------------------------------------
# PATHS
# -----------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_PATH = PROJECT_ROOT / "ai" / "data" / "pricing_dataset.csv"
MODEL_PATH = PROJECT_ROOT / "ai" / "models" / "price_range_model.pkl"


# -----------------------------------------
# LOAD DATA
# -----------------------------------------

df = pd.read_csv(DATA_PATH)

print("Dataset loaded:", df.shape)


# -----------------------------------------
# SELECT FEATURES
# -----------------------------------------

features = [
    "product_name",
    "primary_category",
    "secondary_category",
    "tertiary_category",
    "product_type",
    "target_demographic",
    "seasonal_relevance",
    "purchase_frequency"
]

target = "price_range"

df = df[features + [target]].dropna()


X = df[features]
y = df[target]


# -----------------------------------------
# TRAIN / TEST SPLIT
# -----------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


# -----------------------------------------
# PREPROCESSING
# -----------------------------------------

categorical_features = [
    "primary_category",
    "secondary_category",
    "tertiary_category",
    "product_type",
    "target_demographic",
    "seasonal_relevance",
    "purchase_frequency"
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
# MODEL
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
# TRAIN
# -----------------------------------------

print("\nTraining model...")

pipeline.fit(X_train, y_train)


# -----------------------------------------
# EVALUATION
# -----------------------------------------

predictions = pipeline.predict(X_test)

accuracy = accuracy_score(
    y_test,
    predictions
)

print("\n==============================")
print("PRICE RANGE MODEL RESULTS")
print("==============================")

print(f"\nAccuracy: {accuracy:.2%}")

print("\nClassification Report:")
print(
    classification_report(
        y_test,
        predictions
    )
)


# -----------------------------------------
# SAVE MODEL
# -----------------------------------------

MODEL_PATH.parent.mkdir(
    parents=True,
    exist_ok=True
)

joblib.dump(
    pipeline,
    MODEL_PATH
)

print("\nModel saved successfully:")
print(MODEL_PATH)
