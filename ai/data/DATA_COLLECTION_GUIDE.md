# Handicraft Real Pricing Data Collection Guide

This guide establishes the protocols, rules, and best practices for collecting authentic, verifiable real-world handicraft pricing data for CraftConnect.

---

## Data Collection Template File
All collected records should be appended directly to:
[`ai/data/handicraft_pricing_real_template.csv`](file:///c:/Users/harjy/OneDrive/Desktop/craftconnect%20-%202/ai/data/handicraft_pricing_real_template.csv)

Header Schema:
`product_name,craft_category,craft_type,primary_material,crafting_time,size_complexity,artisan_region,utility_type,target_demographic,actual_price,price_range,source_url`

---

## Data Collection Protocol & Guidelines

### 1. Authentic & Traceable Listings Only
* Every record added must correspond to a real, existing handicraft product from a verifiable online marketplace, government artisan portal, NGO catalog, or direct artisan listing.
* **No fake, synthetic, or estimated records** are allowed under any circumstances.

### 2. Mandatory Source Provenance (`source_url`)
* `source_url` must contain the direct, full URL pointing to the exact product or source listing page.
* **ML Rule:** `source_url` is strictly a metadata provenance field for verification and auditing. It **MUST NOT** be used as a predictor feature during machine learning model training.

### 3. Exact INR Selling Price (`actual_price`)
* `actual_price` must record the exact listed selling price in Indian Rupees (INR / ₹).
* Do not invent, round up/down arbitrarily, or speculate on prices. Record the exact price as listed on the source page.

### 4. Handling Missing or Uncertain Attributes
* Do not guess or infer product attributes without clear textual or visual evidence from the source listing.
* If a specific attribute (e.g., `crafting_time` or `target_demographic`) cannot be reliably determined from the product listing, enter **`Unknown`**.

### 5. Deduplication
* Do not add duplicate listings for the same product. Ensure each row represents a unique handicraft item or listing.

### 6. Handling `price_range` (Target Label)
* **DO NOT** invent arbitrary price thresholds during collection.
* Leave the `price_range` field **BLANK** during initial raw data collection.
* Once the target dataset volume (e.g., 500+ records) is compiled, the empirical price distribution will be analyzed to define objective, statistically grounded class boundaries (`Budget`, `Mid-range`, `Premium`).

### 7. Column Discipline
* Do not add extra columns to the CSV file (such as collection dates or scraper notes). If collection notes or timestamps are recorded, keep them in external logs—do not modify the standardized 12-column CSV schema.

### 8. Target Volume & Diversity Goals
* **Target Dataset Size:** Collect at least **500+ verified records** minimum (aiming for 1,000+ for production readiness).
* **Diversity Requirements:** Ensure diverse coverage across Indian handicraft categories (Textiles, Metalwork, Woodcraft, Pottery, Cane/Bamboo, Leather, Stone, Glassware, Tribal Art) and geographic artisan clusters across states.
