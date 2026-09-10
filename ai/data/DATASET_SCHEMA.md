# Handicraft Pricing Dataset Schema & Provenance Guidelines

## Overview
This document defines the official dataset schema for CraftConnect's handicraft pricing machine learning pipeline. It outlines feature roles, data types, example values, targets, and provenance requirements for real handicraft pricing records.

---

## Dataset Schema

| Column Name | Role / ML Status | Expected Data Type | Meaning / Description | Example Value(s) |
| :--- | :--- | :--- | :--- | :--- |
| `product_name` | **ML Feature** | String | Descriptive title or name of the handicraft item | `Handwoven Bamboo Fruit Basket`, `Handloom Pure Pashmina Shawl` |
| `craft_category` | **ML Feature** | Categorical (String) | Broad classification of the craft domain | `Bamboo & Cane`, `Handloom Textiles`, `Metalwork & Brassware` |
| `craft_type` | **ML Feature** | Categorical (String) | Specific artisan technique, weaving style, or art tradition | `Basketry`, `Dhokra Casting`, `Madhubani Painting`, `Pashmina Weaving` |
| `primary_material` | **ML Feature** | Categorical (String) | Primary raw material used in construction | `Bamboo`, `Pure Brass`, `Mulberry Silk`, `Terracotta Clay` |
| `crafting_time` | **ML Feature** | Ordinal / Categorical | Time duration required by the artisan to complete the piece | `< 5 Hours`, `1-3 Days`, `4-7 Days`, `> 1 Week` |
| `size_complexity` | **ML Feature** | Categorical (String) | Dimensional scale and intricacy of decorative work | `Small/Miniature`, `Medium/Standard`, `Large/Display` |
| `artisan_region` | **ML Feature** | Categorical (String) | Geographical cluster or state of origin (often tied to GI tags) | `Assam`, `Bastar Chhattisgarh`, `Jaipur Rajasthan`, `Varanasi UP` |
| `utility_type` | **ML Feature** | Categorical (String) | Intended usage context or functional purpose | `Kitchenware & Utility`, `Home Decor / Exhibition`, `Wearable Fashion` |
| `target_demographic` | **ML Feature** | Categorical (String) | Target consumer or buyer profile | `Home Decor Enthusiasts`, `Luxury & Festive Buyers`, `Daily Consumer` |
| `actual_price` | **Numeric Target** | Float / Integer | Real market price in INR (₹) | `350`, `1450`, `8500`, `12500` |
| `price_range` | **Classification Target** | Categorical Enum (`Budget`, `Mid-range`, `Premium`) | Target label for price classification | `Budget` (≤ ₹550), `Mid-range` (₹750 - ₹1,650), `Premium` (≥ ₹2,400) |
| `source_url` | **Provenance Only** | String (URL) | URL or verified reference source where the record was collected | `https://example.org/crafts/bamboo-basket-101` |

---

## Feature & Target Definitions

### 1. ML Feature Columns (Inputs)
The following 9 columns are predictor features used to train price estimation and classification models:
- `product_name`, `craft_category`, `craft_type`, `primary_material`, `crafting_time`, `size_complexity`, `artisan_region`, `utility_type`, `target_demographic`.

### 2. ML Target Columns (Outputs)
- `price_range`: Primary classification target (`Budget`, `Mid-range`, `Premium`).
- `actual_price`: Continuous numeric target for regression models or pricing validation.

### 3. Provenance Column (`source_url`)
- **Purpose:** Tracks data lineage, authenticity, and verification source for real artisan pricing records.
- **CRITICAL RULE:** `source_url` is strictly a metadata/provenance field. It **MUST NOT** be fed into machine learning feature transformers or model training pipelines.

---

## Guidelines for Real Dataset Collection
1. **No Synthetic Rows:** Do not include generated, simulated, or unverified records.
2. **Provenance Mandatory:** All newly ingested pricing records must populate `source_url` with a valid verification link or catalog source reference.
3. **Preserve Exact Column Names:** ML pipelines rely on exact column string matches.
