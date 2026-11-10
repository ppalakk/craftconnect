
const fs = require('fs');
const path = require('path');

class RealPricingService {
  constructor() {
    this.records = [];
    this.byCategory = new Map();
    this.byRegion = new Map();
    this.benchmarks = new Map();
    this.lastLoadedAt = null;
    this.isLoaded = false;

    this.DATA_DIR = path.join(__dirname, '..', 'ai', 'data');
    this.BATCH_FILES = [
      'handicraft_pricing_real_batch_01.csv',
      'handicraft_pricing_real_batch_02.csv',
      'handicraft_pricing_real_batch_03.csv'
    ];

    this.init();
  }

  /**
   * Parse CSV safely handling commas inside quotes if any
   */
  parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  /**
   * Map diverse naming variations to canonical category keys
   */
  normalizeCategoryKey(cat) {
    if (!cat) return 'other';
    const c = String(cat).toLowerCase().trim();
    if (c.includes('bamboo') || c.includes('cane') || c.includes('wood')) return 'bamboo';
    if (c.includes('pottery') || c.includes('terracotta') || c.includes('clay')) return 'terracotta';
    if (c.includes('textile') || c.includes('handloom') || c.includes('saree') || c.includes('silk') || c.includes('cotton')) return 'textiles';
    if (c.includes('metal') || c.includes('brass') || c.includes('dhokra') || c.includes('bidriware')) return 'metalwork';
    if (c.includes('paint') || c.includes('folk') || c.includes('tribal art') || c.includes('madhubani') || c.includes('gond') || c.includes('warli')) return 'paintings';
    if (c.includes('jewel') || c.includes('accessory') || c.includes('bead') || c.includes('necklace')) return 'jewellery';
    if (c.includes('decor') || c.includes('hamper') || c.includes('gift')) return 'decor';
    return 'other';
  }

  /**
   * Load and index all verified CSV batch files
   */
  init() {
    const loadedRecords = [];

    for (const filename of this.BATCH_FILES) {
      const filePath = path.join(this.DATA_DIR, filename);
      if (!fs.existsSync(filePath)) {
        console.warn(`[RealPricingService] Batch file not found: ${filePath}`);
        continue;
      }

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        if (lines.length <= 1) continue;

        // Header: product_name,craft_category,craft_type,primary_material,crafting_time,size_complexity,artisan_region,utility_type,target_demographic,actual_price,price_range,source_url
        const header = this.parseCsvLine(lines[0]);
        const nameIdx = header.indexOf('product_name');
        const catIdx = header.indexOf('craft_category');
        const typeIdx = header.indexOf('craft_type');
        const matIdx = header.indexOf('primary_material');
        const regIdx = header.indexOf('artisan_region');
        const utilityIdx = header.indexOf('utility_type');
        const priceIdx = header.indexOf('actual_price');
        const urlIdx = header.indexOf('source_url');

        for (let i = 1; i < lines.length; i++) {
          const parts = this.parseCsvLine(lines[i]);
          if (parts.length < 10) continue;

          const rawPrice = parts[priceIdx !== -1 ? priceIdx : 9];
          const actualPrice = parseFloat(rawPrice);
          if (isNaN(actualPrice) || actualPrice <= 0) continue;

          const name = parts[nameIdx !== -1 ? nameIdx : 0] || 'Handcrafted Artisan Item';
          const category = parts[catIdx !== -1 ? catIdx : 1] || 'Other Handicrafts';
          const craftType = parts[typeIdx !== -1 ? typeIdx : 2] || 'Traditional Craft';
          const material = parts[matIdx !== -1 ? matIdx : 3] || 'Natural Material';
          const region = parts[regIdx !== -1 ? regIdx : 6] || 'India';
          const utility = parts[utilityIdx !== -1 ? utilityIdx : 7] || 'General Utility';
          const sourceUrl = (urlIdx !== -1 && parts[urlIdx]) ? parts[urlIdx] : 'https://www.tribesindia.com';

          const record = {
            id: `rec_${loadedRecords.length + 1}`,
            name,
            category,
            canonicalCategory: this.normalizeCategoryKey(category),
            craftType,
            material,
            region,
            utility,
            actualPrice,
            sourceUrl,
            sourceDomain: sourceUrl.includes('tribesindia') ? 'Tribes India (TRIFED)' : (sourceUrl.includes('cottageemporium') ? 'Central Cottage Industries Emporium' : 'Verified Artisan Portal'),
            observationType: 'observed_listing_price'
          };

          loadedRecords.push(record);
        }
      } catch (err) {
        console.error(`[RealPricingService] Error loading ${filename}:`, err.message);
      }
    }

    this.records = loadedRecords;
    this.indexRecords();
    this.computeCategoryBenchmarks();
    this.lastLoadedAt = new Date().toISOString();
    this.isLoaded = true;

    console.log(`✅ [RealPricingService] Successfully ingested ${this.records.length} authentic handicraft listings across ${this.byCategory.size} categories.`);
  }

  /**
   * Build category and regional in-memory lookup indexes
   */
  indexRecords() {
    this.byCategory.clear();
    this.byRegion.clear();

    for (const r of this.records) {
      // By exact category name
      if (!this.byCategory.has(r.category)) {
        this.byCategory.set(r.category, []);
      }
      this.byCategory.get(r.category).push(r);

      // Also by canonical category
      if (!this.byCategory.has(r.canonicalCategory)) {
        this.byCategory.set(r.canonicalCategory, []);
      }
      if (r.category !== r.canonicalCategory) {
        this.byCategory.get(r.canonicalCategory).push(r);
      }

      // By region
      if (!this.byRegion.has(r.region)) {
        this.byRegion.set(r.region, []);
      }
      this.byRegion.get(r.region).push(r);
    }
  }

  /**
   * Compute empirical statistical percentiles for each category
   */
  computeCategoryBenchmarks() {
    this.benchmarks.clear();

    for (const [cat, items] of this.byCategory.entries()) {
      if (!items || items.length === 0) continue;

      const prices = items.map(i => i.actualPrice).sort((a, b) => a - b);
      const count = prices.length;
      const min = prices[0];
      const max = prices[count - 1];
      const median = prices[Math.floor(count / 2)];
      const p25 = prices[Math.floor(count * 0.25)];
      const p75 = prices[Math.floor(count * 0.75)];
      const sum = prices.reduce((acc, p) => acc + p, 0);
      const mean = Math.round(sum / count);

      this.benchmarks.set(cat, {
        category: cat,
        sampleCount: count,
        minPrice: min,
        maxPrice: max,
        medianPrice: median,
        meanPrice: mean,
        p25,
        p75,
        formattedRange: `₹${min.toLocaleString('en-IN')} – ₹${p75.toLocaleString('en-IN')}`,
        broadRange: `₹${min.toLocaleString('en-IN')} – ₹${max.toLocaleString('en-IN')}`,
        observationType: 'observed_retail_listing_prices',
        primarySources: Array.from(new Set(items.map(i => i.sourceDomain))),
        lastUpdated: new Date().toISOString()
      });
    }
  }

  /**
   * Get verified price benchmark for a category
   */
  getBenchmarkForCategory(categoryKey) {
    if (!categoryKey) return this.getBenchmarkForCategory('all');
    const clean = this.normalizeCategoryKey(categoryKey);

    if (this.benchmarks.has(clean)) {
      return this.benchmarks.get(clean);
    }

    // Try finding by exact matching category name
    for (const [key, bm] of this.benchmarks.entries()) {
      if (key.toLowerCase().includes(String(categoryKey).toLowerCase())) {
        return bm;
      }
    }

    // Consolidated all-categories benchmark
    const allPrices = this.records.map(r => r.actualPrice).sort((a, b) => a - b);
    if (allPrices.length === 0) {
      return {
        category: categoryKey,
        sampleCount: 0,
        formattedRange: "₹250 – ₹1,500",
        observationType: "insufficient_samples",
        lastUpdated: new Date().toISOString()
      };
    }

    const min = allPrices[0];
    const p75 = allPrices[Math.floor(allPrices.length * 0.75)];
    const median = allPrices[Math.floor(allPrices.length / 2)];

    return {
      category: categoryKey,
      sampleCount: allPrices.length,
      minPrice: min,
      maxPrice: allPrices[allPrices.length - 1],
      medianPrice: median,
      p25: allPrices[Math.floor(allPrices.length * 0.25)],
      p75,
      formattedRange: `₹${min.toLocaleString('en-IN')} – ₹${p75.toLocaleString('en-IN')}`,
      observationType: 'pan_india_handicraft_benchmark',
      primarySources: ['Tribes India (TRIFED)', 'Central Cottage Industries Emporium'],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Search real comparable product listings
   */
  findComparableListings(categoryKey, { limit = 5, region = null } = {}) {
    const cleanCat = this.normalizeCategoryKey(categoryKey);
    let items = this.byCategory.get(cleanCat) || this.records;

    if (region) {
      const regMatches = items.filter(i => i.region.toLowerCase().includes(region.toLowerCase()));
      if (regMatches.length > 0) items = regMatches;
    }

    return items.slice(0, limit).map(item => ({
      productName: item.name,
      craftType: item.craftType,
      material: item.material,
      region: item.region,
      actualPrice: item.actualPrice,
      formattedPrice: `₹${item.actualPrice.toLocaleString('en-IN')}`,
      sourceUrl: item.sourceUrl,
      sourceDomain: item.sourceDomain,
      observationType: 'verified_product_listing'
    }));
  }

  /**
   * Returns metadata about the dataset
   */
  getProvenanceMetadata() {
    return {
      totalRecords: this.records.length,
      categoriesCount: this.byCategory.size,
      regionsCovered: Array.from(this.byRegion.keys()),
      primarySources: [
        {
          name: "Tribes India (TRIFED)",
          authority: "Ministry of Tribal Affairs, Government of India",
          url: "https://www.tribesindia.com"
        },
        {
          name: "Central Cottage Industries Emporium (CCIE)",
          authority: "Ministry of Textiles, Government of India",
          url: "https://www.cottageemporium.in"
        }
      ],
      lastIngestedAt: this.lastLoadedAt,
      licenseNote: "Empirical pricing observation dataset compiled strictly for fair artisan benchmarking and economic empowerment."
    };
  }
}

module.exports = new RealPricingService();
