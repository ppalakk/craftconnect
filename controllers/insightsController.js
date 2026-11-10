// CraftConnect Demand & Trend Intelligence Controller
// Replaced hardcoded simulated values with real-world verified data layer
const marketIntelligenceService = require('../services/marketIntelligenceService');

/**
 * GET /api/insights
 * Returns real verified market intelligence, trend signals, regional demand clusters,
 * and personalized AI production recommendations grounded in authentic handicraft data.
 */
exports.getDemandInsights = async (req, res) => {
  try {
    const period = req.query.period || "30";
    const category = req.query.category || "all";
    const forceRefresh = req.query.refresh === "true" || req.query.refresh === "1";
    const user = (req.session && req.session.user) ? req.session.user : null;

    const insights = await marketIntelligenceService.getDemandInsights({
      period,
      category,
      user,
      forceRefresh
    });

    res.json(insights);
  } catch (error) {
    console.error("[insightsController.getDemandInsights] Error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to generate market demand intelligence",
      message: error.message,
      data: {
        overviewCards: [],
        trendingRightNow: [],
        emergingOpportunities: [],
        regionalDemand: [],
        aiRecommendations: []
      }
    });
  }
};
