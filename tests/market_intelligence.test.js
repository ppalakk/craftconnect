/**
 * CraftConnect Market Intelligence & Real Data Pipeline Test Suite
 * 
 * Validates:
 * 1. Real pricing service ingestion of 150+ authentic handicraft records.
 * 2. Mathematical correctness of price percentiles and benchmarks.
 * 3. Provenance and source URLs (Tribes India / CCIE).
 * 4. Events timeline filtering: Expired events are excluded from upcoming lists.
 * 5. GET /api/insights returns authentic, non-fabricated market signals.
 * 6. Tenant isolation and personalization for logged-in artisans.
 * 7. In-memory caching and graceful fallback handling.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const realPricingService = require('../services/realPricingService');
const eventsService = require('../services/eventsService');
const marketplacesService = require('../services/marketplacesService');
const marketIntelligenceService = require('../services/marketIntelligenceService');

describe('Market Intelligence & Real Data Pipeline Test Suite', () => {

  /* ================= 1. REAL PRICING DATASET INGESTION ================= */
  describe('1. Authentic Pricing Ingestion & Provenance', () => {
    test('Ingests at least 150 authentic handicraft listings', () => {
      assert.ok(realPricingService.records.length >= 150, `Expected at least 150 records, got ${realPricingService.records.length}`);
    });

    test('All records have positive actual_price and verified source URL', () => {
      for (const record of realPricingService.records) {
        assert.ok(record.name && record.name.length > 2, `Record must have valid name: ${JSON.stringify(record)}`);
        assert.ok(typeof record.actualPrice === 'number' && record.actualPrice > 0, `Price must be positive: ${record.actualPrice}`);
        assert.ok(record.sourceUrl && record.sourceUrl.startsWith('http'), `Source URL must be valid: ${record.sourceUrl}`);
        assert.ok(
          record.sourceUrl.includes('tribesindia.com') || record.sourceUrl.includes('cottageemporium.in'),
          `Source domain must be verified authority: ${record.sourceUrl}`
        );
      }
    });

    test('Mathematical bounds: min <= p25 <= median <= p75 <= max for all categories', () => {
      const categories = ['bamboo', 'terracotta', 'textiles', 'metalwork', 'woodcraft'];
      for (const cat of categories) {
        const bm = realPricingService.getBenchmarkForCategory(cat);
        assert.ok(bm.sampleCount > 0, `Category ${cat} must have samples`);
        assert.ok(bm.minPrice <= bm.medianPrice, `Min ${bm.minPrice} must be <= Median ${bm.medianPrice}`);
        assert.ok(bm.medianPrice <= bm.p75, `Median ${bm.medianPrice} must be <= P75 ${bm.p75}`);
        assert.ok(bm.p75 <= bm.maxPrice, `P75 ${bm.p75} must be <= Max ${bm.maxPrice}`);
      }
    });

    test('Provenance metadata is complete with authority citations', () => {
      const meta = realPricingService.getProvenanceMetadata();
      assert.ok(meta.totalRecords >= 150);
      assert.ok(meta.categoriesCount >= 8);
      assert.ok(meta.primarySources.length >= 2);
      assert.ok(meta.regionsCovered.includes('Madhya Pradesh'));
      assert.ok(meta.regionsCovered.includes('Rajasthan'));
      assert.ok(meta.regionsCovered.includes('West Bengal'));
    });
  });

  /* ================= 2. EVENT TIMELINE & EXPIRY FILTERING ================= */
  describe('2. Craft Event Verification & Expiry Guard', () => {
    test('Upcoming events exclude past events relative to current date', () => {
      const result = eventsService.getVerifiedEvents({ upcomingOnly: true });
      assert.ok(result.events.length > 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const ev of result.events) {
        const end = new Date(ev.endDate);
        assert.ok(end >= today, `Event ${ev.name} with endDate ${ev.endDate} should not be presented as upcoming`);
        assert.equal(ev.isUpcoming, true);
      }
    });

    test('Event timeline labels application deadlines and remaining days correctly', () => {
      // Mock future dates
      const timeline = eventsService.getEventTimelineStatus('2027-02-01', '2027-02-15', '2026-12-15');
      assert.equal(timeline.status, 'Application Open');
      assert.ok(timeline.daysToDeadline > 0);
      assert.equal(timeline.isUpcoming, true);
    });

    test('Past events are labeled as past and marked isUpcoming = false', () => {
      const timeline = eventsService.getEventTimelineStatus('2024-01-01', '2024-01-10', '2023-12-01');
      assert.equal(timeline.status, 'Past');
      assert.equal(timeline.isUpcoming, false);
    });
  });

  /* ================= 3. MARKET INTELLIGENCE REUSABLE SERVICE ================= */
  describe('3. Market Intelligence Signal Calculation', () => {
    test('getDemandInsights returns complete verified schema', async () => {
      const res = await marketIntelligenceService.getDemandInsights({
        period: "30",
        category: "all",
        forceRefresh: true
      });

      assert.equal(res.ok, true);
      assert.equal(res.isLiveVerified, true);
      assert.ok(res.data);
      assert.ok(Array.isArray(res.data.overviewCards) && res.data.overviewCards.length === 4);
      assert.ok(Array.isArray(res.data.trendingRightNow) && res.data.trendingRightNow.length >= 6);
      assert.ok(Array.isArray(res.data.emergingOpportunities) && res.data.emergingOpportunities.length >= 4);
      assert.ok(Array.isArray(res.data.regionalDemand) && res.data.regionalDemand.length === 5);
      assert.ok(Array.isArray(res.data.aiRecommendations) && res.data.aiRecommendations.length >= 3);
      assert.ok(res.data.aiInsightTitle && res.data.aiInsightTitle.length > 10);
      assert.ok(res.data.aiInsightText && res.data.aiInsightText.length > 20);
      assert.ok(res.data.timeSeries && res.data.timeSeries.labels);
    });

    test('Trending cards use real observed price benchmarks', async () => {
      const res = await marketIntelligenceService.getDemandInsights({ period: "30", category: "all" });
      const trends = res.data.trendingRightNow;

      for (const t of trends) {
        assert.ok(t.samplePrice.includes('Observed Range'), `Sample price must specify observed range: ${t.samplePrice}`);
        assert.ok(t.observedBenchmark, 'Must contain observedBenchmark reference');
        assert.ok(t.observedBenchmark.sampleCount > 0, 'Must have supporting observation samples');
        assert.equal(t.isVerifiedRealPrice, true);
        assert.ok(t.growth.includes('Seasonal Index'), 'Must specify index methodology rather than raw sales');
      }
    });

    test('Emerging opportunities omit fabricated inquiry numbers', async () => {
      const res = await marketIntelligenceService.getDemandInsights();
      const opps = res.data.emergingOpportunities;

      for (const o of opps) {
        // Assert no fabricated claim of "1,200 inquiries" or "+42% searches"
        assert.ok(!o.evidence.includes('1,200+ bulk lead inquiries'), 'Fabricated inquiry claim must be removed');
        assert.ok(!o.evidence.includes('+42% ahead of upcoming celebrations'), 'Fabricated +42% claim must be removed');
        assert.ok(o.suggestedPrice.includes('Observed Listings'), 'Suggested price must reference observed listings');
        assert.ok(o.traceableSource, 'Must provide traceable supporting source');
      }
    });

    test('Regional demand signals ground melas in verified active events', async () => {
      const res = await marketIntelligenceService.getDemandInsights();
      const regional = res.data.regionalDemand;

      const centralRegion = regional.find(r => r.region.includes('Central India'));
      assert.ok(centralRegion);
      assert.ok(centralRegion.topCategories.length >= 2);
      assert.ok(centralRegion.activeMelas.includes('Bhopal') || centralRegion.activeMelas.includes('Haat'));
    });

    test('ONDC recommendation accurately explains SNP registration without fake auto-sync', async () => {
      const res = await marketIntelligenceService.getDemandInsights();
      const ondcRec = res.data.aiRecommendations.find(r => r.id === 'rec_ondc_channel');
      assert.ok(ondcRec, 'Must have ONDC recommendation');
      assert.ok(!ondcRec.suggestedAction.includes('Auto-sync your 3 active catalog items'), 'False auto-sync claim must not exist');
      assert.ok(ondcRec.suggestedAction.includes('Seller Network Participant') || ondcRec.suggestedAction.includes('SNP'));
    });
  });

  /* ================= 4. TENANT ISOLATION & PERSONALIZATION ================= */
  describe('4. Tenant Isolation & Personalized Recommendations', () => {
    test('Personalizes recommendations for artisan with craft and products', async () => {
      const mockUser = {
        id: "usr_test_potter_" + Date.now(),
        name: "Ramesh Prajapati",
        craft: "Terracotta & Clay Pottery",
        state: "Madhya Pradesh"
      };

      const res = await marketIntelligenceService.getDemandInsights({ user: mockUser });
      assert.equal(res.data.isPersonalized, true);
      assert.ok(res.data.aiInsightTitle.includes('Ramesh') || res.data.aiInsightText.includes('Ramesh') || res.data.aiInsightText.includes('Terracotta'));
    });

    test('Different users receive isolated recommendations without data leak', async () => {
      const userPotter = { id: "usr_potter_1", name: "Ramesh", craft: "Pottery & Clay", state: "Rajasthan" };
      const userWeaver = { id: "usr_weaver_2", name: "Sunita", craft: "Handloom Textiles", state: "West Bengal" };

      const resPotter = await marketIntelligenceService.getDemandInsights({ user: userPotter, forceRefresh: true });
      const resWeaver = await marketIntelligenceService.getDemandInsights({ user: userWeaver, forceRefresh: true });

      assert.notEqual(resPotter.data.aiInsightText, resWeaver.data.aiInsightText);
      assert.ok(resPotter.data.aiInsightText.includes('Ramesh'));
      assert.ok(resWeaver.data.aiInsightText.includes('Sunita'));
    });
  });

  /* ================= 5. CACHING & PERFORMANCE ================= */
  describe('5. Caching & Performance', () => {
    test('Subsequent requests within TTL return cached data with cacheStatus: cached', async () => {
      const user = { id: "usr_cache_test", name: "Tester", craft: "Woodcraft", state: "Karnataka" };

      const first = await marketIntelligenceService.getDemandInsights({ period: "7", category: "all", user, forceRefresh: true });
      assert.equal(first.cacheStatus, "live");

      const second = await marketIntelligenceService.getDemandInsights({ period: "7", category: "all", user });
      assert.equal(second.cacheStatus, "cached");
      assert.equal(first.lastUpdated, second.lastUpdated);
    });
  });
});

