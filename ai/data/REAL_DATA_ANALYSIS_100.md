# Empirical Data Analysis of 100 Real Handicraft Pricing Records

## Executive Summary
This document provides a comprehensive, read-only statistical analysis of the **100 verified real handicraft product records** compiled across Batch 01 ([`ai/data/handicraft_pricing_real_batch_01.csv`](file:///c:/Users/harjy/OneDrive/Desktop/craftconnect%20-%202/ai/data/handicraft_pricing_real_batch_01.csv)) and Batch 02 ([`ai/data/handicraft_pricing_real_batch_02.csv`](file:///c:/Users/harjy/OneDrive/Desktop/craftconnect%20-%202/ai/data/handicraft_pricing_real_batch_02.csv)).

---

## 1. Overview & Data Integrity

| Metric | Empirical Result | Status |
| :--- | :--- | :--- |
| **Total Real Records** | **100** | ✅ Validated |
| **Duplicate Product Names** | **0 (0.0%)** | ✅ 100% Unique |
| **Duplicate Source URLs** | **0 (0.0%)** | ✅ 100% Unique |
| **Numeric Price Validity** | **100.0%** | ✅ All numeric INR values |
| **Source Traceability** | **100.0%** | ✅ Verified listing URLs |

---

## 2. Overall Price Distribution Statistics

* **Minimum Price:** ₹118.80
* **Maximum Price:** ₹80,465.00
* **Mean Price:** ₹2,880.36
* **Median Price (Q2 / 50th Percentile):** ₹1,150.00
* **Standard Deviation:** ₹8,467.27
* **Skewness:** `8.12` (Highly right-skewed / heavy upper tail)

### Price Quartiles & Percentiles

| Percentile | Price (INR / ₹) | Description |
| :--- | :--- | :--- |
| **10th Percentile** | ₹317.00 | Lower 10% bound |
| **20th Percentile** | ₹418.00 | Lower 20% bound |
| **25th Percentile (Q1)** | **₹450.00** | Lower Quartile |
| **33rd Percentile (T1)** | **₹640.10** | 33.3% Tertile Split |
| **50th Percentile (Q2 / Median)** | **₹1,150.00** | Median Price |
| **66th Percentile (T2)** | **₹1,784.00** | 66.6% Tertile Split |
| **75th Percentile (Q3)** | **₹2,332.50** | Upper Quartile |
| **80th Percentile** | ₹2,810.00 | Upper 20% bound |
| **90th Percentile** | ₹4,710.90 | Upper 10% bound |
| **95th Percentile** | ₹8,930.00 | Upper 5% bound |
| **99th Percentile** | ₹24,762.65 | Extreme upper bound |
| **Interquartile Range (IQR)** | **₹1,882.50** | Q3 - Q1 |

---

## 3. Price Distribution Statistics by `craft_category`

All 8 main craft categories are well-represented at the top level (10 to 16 records per category), showing distinct price profiles:

| Craft Category | Record Count | Min Price (₹) | Median Price (₹) | Mean Price (₹) | Max Price (₹) | Std Dev (₹) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Handloom Textiles** | 16 | ₹480.00 | ₹2,975.00 | ₹3,995.63 | ₹12,500.00 | ₹3,399.19 |
| **Metalwork & Brassware** | 15 | ₹750.00 | ₹2,400.00 | ₹9,479.40 | ₹80,465.00 | ₹20,537.39 |
| **Jewellery & Accessories** | 13 | ₹118.80 | ₹363.00 | ₹502.52 | ₹1,450.00 | ₹416.80 |
| **Folk Painting & Tribal Art** | 12 | ₹850.00 | ₹2,025.00 | ₹2,524.98 | ₹6,200.00 | ₹1,625.10 |
| **Woodcraft** | 12 | ₹280.00 | ₹1,098.50 | ₹1,861.42 | ₹9,500.00 | ₹2,532.05 |
| **Bamboo & Cane** | 11 | ₹180.00 | ₹420.00 | ₹585.45 | ₹1,650.00 | ₹424.70 |
| **Other Handicrafts** | 11 | ₹195.00 | ₹950.00 | ₹956.82 | ₹1,850.00 | ₹550.56 |
| **Pottery & Terracotta** | 10 | ₹220.00 | ₹550.00 | ₹578.00 | ₹1,200.00 | ₹289.97 |

---

## 4. Geographic Distribution (`artisan_region`)

The dataset spans **25 distinct state and regional craft clusters** across India:

| Artisan Region / State | Record Count | Artisan Region / State | Record Count |
| :--- | :---: | :--- | :---: |
| **Rajasthan** | 13 | **Tamil Nadu** | 3 |
| **Uttar Pradesh** | 11 | **Jammu & Kashmir** | 3 |
| **Odisha** | 8 | **Assam** | 3 |
| **Gujarat** | 7 | **Telangana** | 3 |
| **Karnataka** | 7 | **Tripura, Bihar, Jharkhand, Nagaland, Kerala, Maharashtra, Uttarakhand** | 2 each |
| **Andhra Pradesh** | 6 | **South India, Himachal Pradesh, Mizoram, Andaman & Nicobar** | 1 each |
| **West Bengal** | 6 | **Total** | **100** |
| **Chhattisgarh** | 5 | | |
| **Madhya Pradesh** | 4 | | |
| **Manipur** | 3 | | |

---

## 5. Sub-Feature Diversity & Granularity

### Primary Material Diversity (62 Distinct Materials)
- **Top Materials:** Terracotta Clay (8), Pure Brass (7), Bamboo (5), Zinc Copper Alloy & Silver (5), Sheesham Wood (4), Tussar Silk (3), Cotton (3), Canvas & Natural Pigments (3).
- **Sparsity Note:** 54 out of 62 materials appear in **only 1 or 2 records**.

### Craft Type Diversity (71 Distinct Craft Types)
- **Top Craft Types:** Dhokra Casting (7), Bidriware Silver Inlay (5), Wood Carving (5), Clay Pottery (5), Ikat Weaving (2), Copper Metalwork (2), Tribal Silver Craft (2), Brass Sheet Craft (2), Banjara Embroidery (2), Bamboo Craft (2), Gond Painting (2), Pithora Painting (2), Grass Weaving (2), Cane Craft (2), Basketry (2).
- **Sparsity Note:** 56 out of 71 craft types appear in **only 1 single record**.

---

## 6. Missing Values ("Unknown" Count per Feature)

| Feature | "Unknown" Count | Coverage % |
| :--- | :---: | :---: |
| `product_name` | 0 | 100% Complete |
| `craft_category` | 0 | 100% Complete |
| `craft_type` | 0 | 100% Complete |
| `primary_material` | 0 | 100% Complete |
| `crafting_time` | **100** | **0% Available (Missing from e-commerce sites)** |
| `size_complexity` | 8 | 92% Complete |
| `artisan_region` | 0 | 100% Complete |
| `utility_type` | 0 | 100% Complete |
| `target_demographic` | **100** | **0% Available (Missing from listing schemas)** |
| `actual_price` | 0 | 100% Complete |
| `price_range` | 0 (all blank) | Intentionally unlabelled |
| `source_url` | 0 | 100% Complete |

---

## 7. Statistical Outliers in `actual_price`

Using the standard 1.5 × IQR Rule:
$$\text{Upper Threshold} = Q3 + 1.5 \times \text{IQR} = ₹2,332.50 + 1.5 \times (₹1,882.50) = \mathbf{₹5,156.25}$$

**9 Statistical Outliers Identified (> ₹5,156.25):**

| Product Name | Craft Category | Actual Price (₹) | Source Domain |
| :--- | :--- | :---: | :--- |
| Bidriware Suray Vase | Metalwork & Brassware | ₹80,465.00 | `tribesindia.com` |
| Bidriware Star Pattern Elephant Statue | Metalwork & Brassware | ₹24,200.00 | `tribesindia.com` |
| Handloom Banarasi Silk Saree with Brocade | Handloom Textiles | ₹12,500.00 | `tribesindia.com` |
| Handmade Kartik Swami Bell Metal Statue | Metalwork & Brassware | ₹10,725.00 | `tribesindia.com` |
| Hand-carved Teak Wooden Temple Mandir | Woodcraft | ₹9,500.00 | `tribesindia.com` |
| Handloom Pochampally Ikat Silk Saree | Handloom Textiles | ₹8,900.00 | `tribesindia.com` |
| Handloom Pure Pashmina Wool Shawl | Handloom Textiles | ₹8,500.00 | `tribesindia.com` |
| Handwoven Eri Silk Shawl | Handloom Textiles | ₹6,450.00 | `tribesindia.com` |
| Handpainted Tanjore Gold Leaf Wooden Frame | Folk Painting & Tribal Art | ₹6,200.00 | `tribesindia.com` |

*Note: As instructed, outliers are identified for statistical documentation only and are **not** removed from the dataset.*

---

## 8. Empirical Price Distribution Options for Future `price_range` Labeling

Based on the empirical price percentiles of the 100 collected real records, two objective, data-driven partitioning strategies can be considered when labeling `price_range`:

### Option A: 3-Tier Model (Tertile Split - Balanced ~33% Per Class)
* **Budget Tier:** $\le ₹640.00$ (33 records)
* **Mid-range Tier:** $> ₹640.00$ to $\le ₹1,784.00$ (33 records)
* **Premium Tier:** $> ₹1,784.00$ (34 records)

### Option B: 4-Tier Model (Quartile Split - Balanced ~25% Per Class)
* **Economy / Budget:** $\le ₹450.00$ (Q1 - 25 records)
* **Mid-range Low:** $> ₹450.00$ to $\le ₹1,150.00$ (Q1 to Median - 25 records)
* **Mid-range High:** $> ₹1,150.00$ to $\le ₹2,332.50$ (Median to Q3 - 25 records)
* **Premium / Luxury:** $> ₹2,332.50$ (Q3 - 25 records)

---

## 9. Final Recommendation

### **RECOMMENDATION: B) Collect more data before training**

### **Statistical & Technical Justification:**

1. **Severe High-Cardinality Feature Sparsity ($p \gg n$ per sub-feature):**
   * While the dataset has 100 rows, it contains **71 unique `craft_type` values** and **62 unique `primary_material` values**.
   * Over 75% of craft types and materials appear in **only 1 single record**.
   * A Random Forest or gradient boosting model will fail to learn meaningful generalization rules for these features, resulting in decision trees that memorize single training instances.

2. **Incomplete Feature Columns:**
   * `crafting_time` and `target_demographic` are **100% Unknown**. Relying solely on categorical attributes without labor-hour context will increase price variance across similar-looking items.

3. **High Price Skewness ($8.12$):**
   * The price range spans from ₹118.80 to ₹80,465.00, driven by luxury heritage items (e.g., Bidriware, pure Pashmina, Banarasi silk).
   * Expanding the dataset to **300 – 500+ records** will populate each `craft_type` with at least 5–10 samples across price tiers, allowing the model to learn true feature interactions rather than noise.
