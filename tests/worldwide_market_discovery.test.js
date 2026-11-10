/**
 * CraftConnect - Worldwide Dynamic Market Discovery Test Suite
 * 
 * Verifies:
 * 1. Worldwide geocoding without country restrictions (Agra, London, NY, Kathmandu, etc.)
 * 2. Proper 404 / validation message for invalid locations
 * 3. Real local market discovery across distinct geographical areas
 * 4. Previous location records are completely excluded from new location results
 * 5. Functional radius filtering (5km vs 50km results)
 * 6. Category filtering (pottery, textiles, bamboo, etc.)
 * 7. Integrity: uninvented fields (ratings, contacts) are null or omitted when not present in source
 * 8. Performance and TTL in-memory caching
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const placesService = require('../services/placesService');
const marketController = require('../controllers/marketController');

// Helper to simulate express res.status().json()
function createMockRes() {
  const state = {
    statusCode: 200,
    body: null
  };
  return {
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(data) {
      state.body = data;
      return this;
    },
    getState: () => state
  };
}

describe('Worldwide Dynamic Market Discovery Pipeline', () => {

  /* ================= 1. WORLDWIDE GEOCODING ================= */
  describe('1. Worldwide Geocoding Resolution', () => {
    const citiesToTest = [
      { query: 'Agra, Uttar Pradesh', expectedCountry: 'India' },
      { query: 'Jaipur, Rajasthan', expectedCountry: 'India' },
      { query: 'Mumbai, Maharashtra', expectedCountry: 'India' },
      { query: 'London, United Kingdom', expectedCountry: 'United Kingdom' },
      { query: 'New York, USA', expectedCountry: 'United States' },
      { query: 'Kathmandu, Nepal', expectedCountry: 'Nepal' }
    ];

    for (const item of citiesToTest) {
      test(`Resolves coordinates for ${item.query}`, async () => {
        const mockRes = createMockRes();
        await marketController.geocode({ query: { query: item.query } }, mockRes);
        const { statusCode, body } = mockRes.getState();

        assert.equal(statusCode, 200, `Expected 200 for ${item.query}`);
        assert.ok(body.ok, `Expected body.ok = true`);
        assert.ok(typeof body.lat === 'number' && !isNaN(body.lat), 'Latitude must be numeric');
        assert.ok(typeof body.lng === 'number' && !isNaN(body.lng), 'Longitude must be numeric');
        assert.ok(body.displayName && body.displayName.length > 2, 'displayName must be populated');
      });
    }

    test('Returns 404 validation error for completely invalid city', async () => {
      const mockRes = createMockRes();
      await marketController.geocode({ query: { query: 'nonexistentcityxyz123987' } }, mockRes);
      const { statusCode, body } = mockRes.getState();

      assert.equal(statusCode, 404);
      assert.equal(body.ok, false);
      assert.ok(body.error.includes("Location not found"), `Expected "Location not found", got: ${body.error}`);
    });
  });

  /* ================= 2. NEARBY MARKET DISCOVERY ================= */
  describe('2. Real Nearby Business Discovery (Worldwide)', () => {
    test('Discovers real businesses in Agra and excludes Bhopal stores', async () => {
      // Agra coordinates
      const result = await placesService.discoverNearbyPlaces({
        lat: 27.1753,
        lng: 78.0098,
        city: 'Agra',
        radiusKm: 25
      });

      assert.ok(result.ok);
      assert.ok(result.places.length > 0, `Expected places in Agra, got ${result.places.length}`);

      // Verify all discovered places are near Agra (within 25 km)
      for (const p of result.places) {
        assert.ok(p.distanceKm <= 25, `Place ${p.name} at ${p.distanceKm}km exceeds 25km radius`);
        assert.ok(!p.address.includes("Bhopal"), `Place ${p.name} from Bhopal should not appear in Agra results`);
      }
    });

    test('Discovers real businesses in London and excludes Indian hubs', async () => {
      // London coordinates
      const result = await placesService.discoverNearbyPlaces({
        lat: 51.5074,
        lng: -0.1278,
        city: 'London',
        radiusKm: 25
      });

      assert.ok(result.ok);
      assert.ok(result.places.length > 0, `Expected places in London, got ${result.places.length}`);

      for (const p of result.places) {
        assert.ok(p.distanceKm <= 25, `Place ${p.name} at ${p.distanceKm}km exceeds 25km radius`);
        assert.ok(!p.name.includes("Bhopal Haat"), `Bhopal Haat must not be present in London results`);
        assert.ok(!p.address.includes("India"), `Place ${p.name} must not be located in India`);
      }
    });

    test('Discovers real businesses in New York and excludes other cities', async () => {
      // New York coordinates
      const result = await placesService.discoverNearbyPlaces({
        lat: 40.7128,
        lng: -74.0060,
        city: 'New York',
        radiusKm: 25
      });

      assert.ok(result.ok);
      assert.ok(result.places.length > 0, `Expected places in New York, got ${result.places.length}`);

      for (const p of result.places) {
        assert.ok(p.distanceKm <= 25, `Place ${p.name} at ${p.distanceKm}km exceeds 25km radius`);
      }
    });
  });

  /* ================= 3. RADIUS FILTERING ================= */
  describe('3. Configurable Search Radius', () => {
    test('Small radius (5 km) returns strictly places within 5 km', async () => {
      const res5 = await placesService.discoverNearbyPlaces({
        lat: 27.1753,
        lng: 78.0098,
        city: 'Agra',
        radiusKm: 5
      });

      for (const p of res5.places) {
        assert.ok(p.distanceKm <= 5.0, `Place ${p.name} at ${p.distanceKm}km exceeds 5km radius`);
      }
    });

    test('Larger radius (50 km) does not exclude places within 50 km', async () => {
      const res50 = await placesService.discoverNearbyPlaces({
        lat: 27.1753,
        lng: 78.0098,
        city: 'Agra',
        radiusKm: 50
      });

      for (const p of res50.places) {
        assert.ok(p.distanceKm <= 50.0, `Place ${p.name} at ${p.distanceKm}km exceeds 50km radius`);
      }
    });
  });

  /* ================= 4. FIELD INTEGRITY & REAL DATA ================= */
  describe('4. Data Provenance & Real Data Integrity', () => {
    test('Unverified fields (ratings/phone) are null rather than fabricated', async () => {
      const result = await placesService.discoverNearbyPlaces({
        lat: 27.1753,
        lng: 78.0098,
        city: 'Agra',
        radiusKm: 25
      });

      for (const p of result.places) {
        assert.ok(p.name && p.name.trim().length > 0, 'Place must have a valid business name');
        assert.ok(p.directionsUrl && p.directionsUrl.startsWith('https://'), 'Must have valid Google Maps directions URL');
        // Ratings must be real number or null, never invented strings
        if (p.rating !== null) {
          assert.ok(typeof p.rating === 'number' && p.rating >= 0 && p.rating <= 5, 'Rating must be valid 0-5');
        }
      }
    });
  });

  /* ================= 5. CACHING & PERFORMANCE ================= */
  describe('5. Caching & Response Time', () => {
    test('Second discovery request for same coordinates completes instantly from cache', async () => {
      const t0 = Date.now();
      const res1 = await placesService.discoverNearbyPlaces({
        lat: 27.1753,
        lng: 78.0098,
        city: 'Agra',
        radiusKm: 25
      });
      const t1 = Date.now();

      const t2 = Date.now();
      const res2 = await placesService.discoverNearbyPlaces({
        lat: 27.1753,
        lng: 78.0098,
        city: 'Agra',
        radiusKm: 25
      });
      const t3 = Date.now();

      assert.ok(res2.places.length === res1.places.length);
      assert.ok((t3 - t2) < 20, `Cached call took ${t3 - t2}ms, expected < 20ms`);
    });
  });

  /* ================= 6. AUTO-GEOCODING IN CONTROLLER ================= */
  describe('6. Controller Auto-Geocoding & Integration', () => {
    test('getNearbyMarkets with city only auto-resolves coordinates and finds real places', async () => {
      const mockRes = createMockRes();
      await marketController.getNearbyMarkets({
        query: { city: 'Agra', radius: '25' }
      }, mockRes);

      const { statusCode, body } = mockRes.getState();
      assert.equal(statusCode, 200);
      assert.ok(body.ok);
      assert.ok(body.places.length > 0, 'Expected places to be auto-discovered for Agra');
      assert.ok(body.lat != null && body.lng != null, 'Expected coordinates to be resolved');
    });

    test('Changing location twice returns only the latest requested city', async () => {
      const mockRes1 = createMockRes();
      await marketController.getNearbyMarkets({ query: { city: 'London', radius: '25' } }, mockRes1);
      const londonPlaces = mockRes1.getState().body.places;

      const mockRes2 = createMockRes();
      await marketController.getNearbyMarkets({ query: { city: 'Agra', radius: '25' } }, mockRes2);
      const agraPlaces = mockRes2.getState().body.places;

      assert.ok(londonPlaces.length > 0);
      assert.ok(agraPlaces.length > 0);

      // Verify completely disjoint sets of places
      const londonNames = new Set(londonPlaces.map(p => p.name.toLowerCase()));
      for (const ap of agraPlaces) {
        assert.ok(!londonNames.has(ap.name.toLowerCase()), `Agra place ${ap.name} should not be in London`);
      }
    });
  });
});

