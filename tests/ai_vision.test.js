const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');

const {
  parseAndValidateAnalysis,
  normalizeCategory,
  formatPriceRange,
  sanitizePrice,
  normalizeGeminiError,
  analyzeProductImage,
  CATEGORY_LABELS,
} = require('../services/geminiVisionService');

describe('AI Vision Analysis & Product Cataloging Tests', () => {
  /* ================= 1. DISTINCT PRODUCT ANALYSIS ================= */
  describe('1. Distinct Craft Analysis (Bamboo, Terracotta, Textile)', () => {
    const bambooSample = {
      productTitle: 'Handcrafted Bamboo Storage Basket with Handle',
      category: 'Bamboo & Wood',
      craftType: 'Bamboo Basketry & Weaving',
      description: 'Cylindrical artisan basket handwoven from natural cured bamboo strips with a reinforced arch handle.',
      materials: ['Cured Bamboo Splits', 'Cane Binding'],
      visualFeatures: [
        'Close-knit hexagonal wicker weave pattern',
        'Sturdy double-layered circular base',
        'Natural golden-yellow unbleached bamboo finish',
      ],
      tags: ['BambooCraft', 'SustainableStorage', 'ArtisanBasket', 'EcoFriendly'],
      targetBuyers: ['Home organizers', 'Zero-waste lifestyle consumers', 'Eco-conscious shoppers'],
      suggestedPriceMin: 450,
      suggestedPriceMax: 800,
      optimalSellingPrice: 650,
      confidence: 90,
    };

    const terracottaSample = {
      productTitle: 'Handmade Terracotta Clay Water Pitcher (Matka)',
      category: 'Terracotta & Clay',
      craftType: 'Wheel-thrown Pottery',
      description: 'Traditional earthen pot shaped on a potters wheel with natural porous red clay and burnished exterior.',
      materials: ['Natural Riverbed Clay', 'Red Ochre Slurry'],
      visualFeatures: [
        'Curved bulbous body with narrow neck',
        'Wheel-turned spiral groove accents',
        'Earthy terracotta matte finish with subtle kiln marks',
      ],
      tags: ['TerracottaPottery', 'ClayCraft', 'TraditionalMatka', 'Kitchenware'],
      targetBuyers: ['Traditional home cooks', 'Summer natural cooling enthusiasts', 'Rustic decor collectors'],
      suggestedPriceMin: 250,
      suggestedPriceMax: 500,
      optimalSellingPrice: 380,
      confidence: 85,
    };

    const textileSample = {
      productTitle: 'Hand-Embroidered Phulkari Silk Stole',
      category: 'Textiles & Weaving',
      craftType: 'Phulkari Hand Embroidery',
      description: 'Vibrant silk dupatta featuring dense geometric floral embroidery stitched with glossy untwisted silk floss.',
      materials: ['Tussar Silk Fabric', 'Pat Silk Thread'],
      visualFeatures: [
        'Dense darning stitch geometric floral patterns',
        'Contrasting magenta and mustard silk floss embroidery',
        'Hand-finished fringed borders',
      ],
      tags: ['Phulkari', 'HandEmbroidered', 'HeritageTextiles', 'SilkStole'],
      targetBuyers: ['Festive wear buyers', 'Heritage fashion connoisseurs', 'Wedding shoppers'],
      suggestedPriceMin: 1200,
      suggestedPriceMax: 2400,
      optimalSellingPrice: 1850,
      confidence: 94,
    };

    test('1a. Bamboo basket yields bamboo category and specific attributes', () => {
      const res = parseAndValidateAnalysis(bambooSample);
      assert.equal(res.category, 'Bamboo & Wood');
      assert.equal(res.title, 'Handcrafted Bamboo Storage Basket with Handle');
      assert.equal(res.craftType, 'Bamboo Basketry & Weaving');
      assert.ok(res.materials.includes('Cured Bamboo Splits'));
      assert.equal(res.features.length, 3);
      assert.ok(res.features[0].includes('hexagonal wicker weave'));
      assert.equal(res.recommendedPrice, 650);
      assert.equal(res.priceRange, '₹450 – ₹800');
      assert.equal(res.confidence, 90);
    });

    test('1b. Terracotta pot yields terracotta category and pottery attributes', () => {
      const res = parseAndValidateAnalysis(terracottaSample);
      assert.equal(res.category, 'Terracotta & Clay');
      assert.equal(res.title, 'Handmade Terracotta Clay Water Pitcher (Matka)');
      assert.equal(res.craftType, 'Wheel-thrown Pottery');
      assert.ok(res.materials.includes('Natural Riverbed Clay'));
      assert.ok(res.features[0].includes('Curved bulbous body'));
      assert.equal(res.recommendedPrice, 380);
      assert.equal(res.priceRange, '₹250 – ₹500');
      assert.equal(res.confidence, 85);
    });

    test('1c. Embroidered textile yields textiles category and embroidery attributes', () => {
      const res = parseAndValidateAnalysis(textileSample);
      assert.equal(res.category, 'Textiles & Weaving');
      assert.equal(res.title, 'Hand-Embroidered Phulkari Silk Stole');
      assert.equal(res.craftType, 'Phulkari Hand Embroidery');
      assert.ok(res.materials.includes('Tussar Silk Fabric'));
      assert.ok(res.features[0].includes('floral patterns'));
      assert.equal(res.recommendedPrice, 1850);
      assert.equal(res.priceRange, '₹1,200 – ₹2,400');
      assert.equal(res.confidence, 94);
    });

    test('1d. The three products have completely distinct metadata (no shared hardcoding)', () => {
      const bamboo = parseAndValidateAnalysis(bambooSample);
      const terracotta = parseAndValidateAnalysis(terracottaSample);
      const textile = parseAndValidateAnalysis(textileSample);

      // Verify categories are all different
      assert.notEqual(bamboo.category, terracotta.category);
      assert.notEqual(bamboo.category, textile.category);
      assert.notEqual(terracotta.category, textile.category);

      // Verify titles are all different
      assert.notEqual(bamboo.title, terracotta.title);
      assert.notEqual(bamboo.title, textile.title);

      // Verify descriptions are completely distinct
      assert.notEqual(bamboo.description, terracotta.description);
      assert.notEqual(bamboo.description, textile.description);

      // Verify prices and ranges are different
      assert.notEqual(bamboo.recommendedPrice, terracotta.recommendedPrice);
      assert.notEqual(bamboo.recommendedPrice, textile.recommendedPrice);

      // Verify visual features do not bleed into each other
      assert.ok(!JSON.stringify(bamboo.features).includes('Clay'));
      assert.ok(!JSON.stringify(terracotta.features).includes('Bamboo'));
      assert.ok(!JSON.stringify(textile.features).includes('Bamboo'));
    });
  });

  /* ================= 2. CATEGORY & PRICING NORMALIZATION ================= */
  describe('2. Normalization & Sanitization Robustness', () => {
    test('normalizeCategory maps loose inputs to valid dropdown categories', () => {
      assert.equal(normalizeCategory('Bamboo split work'), 'Bamboo & Wood');
      assert.equal(normalizeCategory('Wooden carving'), 'Bamboo & Wood');
      assert.equal(normalizeCategory('Terracotta sculpture'), 'Terracotta & Clay');
      assert.equal(normalizeCategory('Glazed Ceramic Mug'), 'Terracotta & Clay');
      assert.equal(normalizeCategory('Handloom saree weaving'), 'Textiles & Weaving');
      assert.equal(normalizeCategory('Zari embroidery textile'), 'Textiles & Weaving');
      assert.equal(normalizeCategory('Brass dhokra decor'), 'Decor & Gifts');
      assert.equal(normalizeCategory('Madhubani painting gift'), 'Decor & Gifts');
    });

    test('sanitizePrice bounds optimal price between min and max', () => {
      // If optimal is below min, clamped to min
      assert.equal(sanitizePrice(200, 300, 600), 300);
      // If optimal is above max, clamped to max
      assert.equal(sanitizePrice(800, 300, 600), 600);
      // If optimal is within range, preserved
      assert.equal(sanitizePrice(450, 300, 600), 450);
      // If optimal missing, defaults to midpoint
      assert.equal(sanitizePrice(0, 300, 500), 400);
    });

    test('formatPriceRange formats Indian Rupee amounts correctly', () => {
      assert.equal(formatPriceRange(500, 1500), '₹500 – ₹1,500');
      assert.equal(formatPriceRange(0, 800), 'Up to ₹800');
      assert.equal(formatPriceRange(0, 0), 'Price estimate unavailable');
    });

    test('parseAndValidateAnalysis swaps min and max if model returns inverted range', () => {
      const inverted = {
        productTitle: 'Test Craft',
        suggestedPriceMin: 900,
        suggestedPriceMax: 400,
        optimalSellingPrice: 600,
      };
      const res = parseAndValidateAnalysis(inverted);
      assert.ok(res.suggestedPriceMin <= res.suggestedPriceMax);
      assert.equal(res.suggestedPriceMin, 400);
      assert.equal(res.suggestedPriceMax, 900);
      assert.equal(res.priceRange, '₹400 – ₹900');
    });
  });

  /* ================= 3. ERROR HANDLING & SECURITY ================= */
  describe('3. Error Handling & API Key Protection', () => {
    test('Empty image buffer is rejected with 400', async () => {
      await assert.rejects(
        () => analyzeProductImage(null, 'image/jpeg'),
        (err) => err.statusCode === 400 && err.message.includes('No image data')
      );
    });

    test('Unsupported MIME type is rejected with 400', async () => {
      await assert.rejects(
        () => analyzeProductImage(Buffer.from('fake'), 'application/pdf'),
        (err) => err.statusCode === 400 && err.message.includes('Unsupported image type')
      );
    });

    test('normalizeGeminiError identifies invalid API key without leaking it', () => {
      const rawErr = new Error(
        'Error fetching: [400 Bad Request] API key not valid. Please pass a valid API key. AIzaSyB1234567890123456789012345678901'
      );
      const normalized = normalizeGeminiError(rawErr);
      assert.equal(normalized.statusCode, 401);
      assert.ok(normalized.message.includes('invalid or unauthorized'));
      assert.ok(!normalized.message.includes('AIzaSyB1234567890123456789012345678901'), 'Must not leak API key');
    });

    test('normalizeGeminiError identifies rate limit / quota exceeded (429)', () => {
      const rawErr = new Error('Quota exceeded for quota metric generateContent 429 RESOURCE_EXHAUSTED');
      const normalized = normalizeGeminiError(rawErr);
      assert.equal(normalized.statusCode, 429);
      assert.ok(normalized.message.includes('quota or rate limit'));
    });

    test('normalizeGeminiError identifies network connectivity errors', () => {
      const rawErr = new Error('fetch failed: getaddrinfo ENOTFOUND generativelanguage.googleapis.com');
      const normalized = normalizeGeminiError(rawErr);
      assert.equal(normalized.statusCode, 502);
      assert.ok(normalized.message.includes('Network connection'));
    });

    test('Missing / placeholder API key throws 503 configuration error', async () => {
      const prevKey = process.env.GEMINI_API_KEY;
      try {
        process.env.GEMINI_API_KEY = 'your_gemini_api_key_here';
        await assert.rejects(
          () => analyzeProductImage(Buffer.from('fakeimg'), 'image/jpeg'),
          (err) => err.statusCode === 503 && err.message.includes('GEMINI_API_KEY is not configured')
        );
      } finally {
        process.env.GEMINI_API_KEY = prevKey;
      }
    });
  });
});
