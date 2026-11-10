/**
 * CraftConnect – Market-Specific Images Test Suite
 *
 * Verifies:
 * 1. Dynamic craft category detection based on name, types, and tags.
 * 2. Strict image source priority (Official business photos -> OSM photos -> Category fallbacks).
 * 3. Data integrity: actual photos vs category fallbacks are clearly demarcated.
 * 4. Image dispersion: stores of the same category receive diverse representative photos.
 * 5. Robust fallbacks: local static fallback URLs are always present.
 * 6. placesService integration: places returned by discoverNearbyPlaces have resolved image fields.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveMarketImage,
  detectCraftCategory,
  getCategoryFallbackImage,
  CATEGORY_PHOTO_POOLS,
  LOCAL_CATEGORY_FALLBACKS
} = require('../services/marketImageService');
const placesService = require('../services/placesService');

describe('Market-Specific Dynamic Image Mapping System', () => {

  /* ================= 1. DYNAMIC CATEGORY DETECTION ================= */
  describe('1. Craft Discipline Detection', () => {
    const testCases = [
      { name: 'Mitti Kala Terracotta Studio', types: ['shop'], expected: 'pottery' },
      { name: 'Kumhar Pottery Works', types: ['craft'], expected: 'pottery' },
      { name: 'Indore Clay & Ceramics Center', types: ['artisan'], expected: 'pottery' },

      { name: 'Chanderi Handloom Weavers Boutique', types: ['clothing_store'], expected: 'textiles' },
      { name: 'Banarasi Saree Showroom', types: ['textiles'], expected: 'textiles' },
      { name: 'Traditional Khadi & Silk Fabric Emporium', types: ['fashion'], expected: 'textiles' },

      { name: 'Tribal Silver Jewellery & Filigree', types: ['jewelry_store'], expected: 'jewellery' },
      { name: 'Dokra Bead Jewellery Studio', types: ['craft'], expected: 'jewellery' },

      { name: 'Assam Bamboo & Cane Handicrafts', types: ['furniture'], expected: 'bamboo' },
      { name: 'Wicker & Tokri Basket Works', types: ['craft'], expected: 'bamboo' },

      { name: 'Saharanpur Woodcraft & Furniture', types: ['carpenter'], expected: 'woodcraft' },
      { name: 'Sandalwood Carving Workshop', types: ['artisan'], expected: 'woodcraft' },

      { name: 'Gond Folk Art Gallery', types: ['art_gallery'], expected: 'paintings' },
      { name: 'Madhubani Painting Studio', types: ['art'], expected: 'paintings' },

      { name: 'Shilpgram Artisan Village Complex', types: ['cultural_center'], expected: 'village' },
      { name: 'Bhopal Haat Artisan Market', types: ['marketplace'], expected: 'market' }
    ];

    for (const tc of testCases) {
      test(`Correctly detects '${tc.expected}' for '${tc.name}'`, () => {
        const detected = detectCraftCategory(tc.name, tc.types);
        assert.equal(detected, tc.expected, `Expected ${tc.expected} for "${tc.name}", got ${detected}`);
      });
    }
  });

  /* ================= 2. IMAGE SOURCE PRIORITY ================= */
  describe('2. Image Source Priority & Data Integrity', () => {
    test('Priority 1: Uses Google Places business photo when provided', () => {
      const resolved = resolveMarketImage({
        name: 'Madhya Pradesh Emporium',
        types: ['gift_shop'],
        category: 'decor',
        googlePhotoName: 'places/ChIJ12345/photos/AUc7-sample-photo',
        googleApiKey: 'AIzaSySampleKey12345',
        id: 'gp-123'
      });

      assert.equal(resolved.isActualPhoto, true, 'Google Places photo must be marked as actual business photo');
      assert.equal(resolved.imageSource, 'google_places_photo');
      assert.ok(resolved.imageUrl.includes('places/ChIJ12345/photos/AUc7-sample-photo'));
      assert.ok(resolved.imageUrl.includes('key=AIzaSySampleKey12345'));
    });

    test('Priority 2: Uses Foursquare venue photo when provided', () => {
      const resolved = resolveMarketImage({
        name: 'The Clay & Glaze Studio',
        types: ['pottery'],
        category: 'pottery',
        fsqPhotoUrl: 'https://fastly.4sqi.net/img/general/640x480/sample.jpg',
        id: 'fsq-456'
      });

      assert.equal(resolved.isActualPhoto, true, 'Foursquare photo must be marked as actual venue photo');
      assert.equal(resolved.imageSource, 'foursquare_photo');
      assert.equal(resolved.imageUrl, 'https://fastly.4sqi.net/img/general/640x480/sample.jpg');
    });

    test('Priority 3: Uses OpenStreetMap licensed photo tag when present', () => {
      const resolved = resolveMarketImage({
        name: 'Hastkala Craft Center',
        types: ['craft'],
        category: 'decor',
        osmImageUrl: 'https://upload.wikimedia.org/wikipedia/commons/sample_hastkala.jpg',
        id: 'osm-node-789'
      });

      assert.equal(resolved.isActualPhoto, true, 'OSM licensed photo must be marked as actual photo');
      assert.equal(resolved.imageSource, 'osm_licensed_image');
      assert.equal(resolved.imageUrl, 'https://upload.wikimedia.org/wikipedia/commons/sample_hastkala.jpg');
    });

    test('Priority 4: Uses category-specific fallback when no official photo exists', () => {
      const pottery = resolveMarketImage({
        name: 'Indore Clay Works',
        types: ['pottery', 'ceramics'],
        category: 'pottery',
        id: 'osm-pottery-1'
      });

      assert.equal(pottery.isActualPhoto, false, 'Category fallback must NOT claim to be actual business photo');
      assert.equal(pottery.imageSource, 'category_representative_pottery');
      assert.equal(pottery.category, 'pottery');
      assert.ok(pottery.imageUrl.startsWith('https://images.unsplash.com/'));
      assert.equal(pottery.fallbackUrl, LOCAL_CATEGORY_FALLBACKS.pottery);

      const textiles = resolveMarketImage({
        name: 'Varanasi Weavers Corner',
        types: ['textiles', 'handloom'],
        category: 'textiles',
        id: 'osm-textiles-1'
      });

      assert.equal(textiles.isActualPhoto, false);
      assert.equal(textiles.imageSource, 'category_representative_textiles');
      assert.equal(textiles.category, 'textiles');
      assert.notEqual(textiles.imageUrl, pottery.imageUrl, 'Textile image must not be same as pottery image');
    });
  });

  /* ================= 3. DISPERSION & STABILITY ================= */
  describe('3. Image Dispersion across multiple stores in the same category', () => {
    test('Two different pottery stores get distinct representative images', () => {
      const store1 = resolveMarketImage({
        name: 'Kumbhar Potter Workshop A',
        types: ['pottery'],
        category: 'pottery',
        id: 'osm-node-1001'
      });

      const store2 = resolveMarketImage({
        name: 'Terracotta Artisans Corner B',
        types: ['pottery'],
        category: 'pottery',
        id: 'osm-node-2002'
      });

      assert.ok(store1.imageUrl, 'Store 1 must have an image');
      assert.ok(store2.imageUrl, 'Store 2 must have an image');
      // Verify both are pottery-specific images from the pool
      const potteryUrls = CATEGORY_PHOTO_POOLS.pottery.map(p => p.url);
      assert.ok(potteryUrls.includes(store1.imageUrl), 'Store 1 image must be from pottery pool');
      assert.ok(potteryUrls.includes(store2.imageUrl), 'Store 2 image must be from pottery pool');
      // With different IDs, the hash should select different images
      assert.notEqual(store1.imageUrl, store2.imageUrl, 'Adjacent stores in same category should get varied images');
    });

    test('Same store consistently receives the same deterministic image', () => {
      const run1 = resolveMarketImage({
        name: 'Chanderi Boutique',
        types: ['textiles'],
        category: 'textiles',
        id: 'store-chanderi-99'
      });

      const run2 = resolveMarketImage({
        name: 'Chanderi Boutique',
        types: ['textiles'],
        category: 'textiles',
        id: 'store-chanderi-99'
      });

      assert.equal(run1.imageUrl, run2.imageUrl, 'Same store must receive stable deterministic image');
    });
  });

  /* ================= 4. LOCAL FALLBACKS ================= */
  describe('4. Reliable Local Fallbacks', () => {
    const categories = ['pottery', 'textiles', 'jewellery', 'bamboo', 'woodcraft', 'paintings', 'decor', 'all'];

    for (const cat of categories) {
      test(`Category '${cat}' has a valid local fallback path`, () => {
        const fallback = getCategoryFallbackImage(cat);
        assert.ok(fallback && fallback.startsWith('/images/'), `Fallback for ${cat} must be in /images/`);
      });
    }
  });

  /* ================= 5. PLACES SERVICE INTEGRATION ================= */
  describe('5. Integration with PlacesService', () => {
    test('Verified government hubs have resolved image metadata', () => {
      const hubs = placesService._getVerifiedHubsInRadius({
        lat: 23.2334,
        lng: 77.4300,
        category: 'all',
        radiusKm: 50
      });

      assert.ok(hubs.length > 0, 'Should find hubs near Bhopal');
      for (const hub of hubs) {
        assert.ok(hub.imageUrl, `Hub ${hub.name} must have an imageUrl`);
        assert.ok(hub.imageSource, `Hub ${hub.name} must have imageSource`);
        assert.equal(typeof hub.isActualPhoto, 'boolean', `Hub ${hub.name} isActualPhoto must be boolean`);
        assert.ok(hub.fallbackUrl, `Hub ${hub.name} must have fallbackUrl`);
      }
    });

    test('Overpass OSM parsed places receive resolved market image', async () => {
      const places = await placesService.discoverNearbyPlaces({
        lat: 23.2334,
        lng: 77.4300,
        city: 'Bhopal',
        category: 'all',
        radiusKm: 25
      });

      assert.ok(places.ok);
      assert.ok(places.places.length > 0, 'Should return places');
      for (const p of places.places) {
        assert.ok(p.imageUrl, `Place ${p.name} must have imageUrl`);
        assert.ok(p.imageSource, `Place ${p.name} must have imageSource`);
        assert.ok(p.fallbackUrl, `Place ${p.name} must have fallbackUrl`);
        // Verify not all places have the exact same hardcoded image
        assert.ok(typeof p.isActualPhoto === 'boolean');
      }

      // Check diversity: across results, multiple distinct images exist
      const uniqueImages = new Set(places.places.map(p => p.imageUrl));
      assert.ok(uniqueImages.size > 1, `Expected diverse images across results, found ${uniqueImages.size} distinct image(s) for ${places.places.length} places`);
    });
  });
});

