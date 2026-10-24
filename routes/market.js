const express = require("express");
const router = express.Router();

const marketController = require("../controllers/marketController");

/* ============ Market Discovery API ============ */

// GET /api/markets — combined local + digital + events
router.get("/", marketController.getCombinedMarkets);

// GET /api/markets/nearby — real nearby craft businesses
router.get("/nearby", marketController.getNearbyMarkets);

// GET /api/markets/events — upcoming fairs & exhibitions
router.get("/events", marketController.getEvents);

// GET /api/markets/platforms — online marketplace recommendations
router.get("/platforms", marketController.getDigitalMarkets);

// GET /api/markets/connections — user's marketplace connections
router.get("/connections", marketController.getConnections);

// POST /api/markets/connections — update/save a connection
router.post("/connections", marketController.updateConnection);

// DELETE /api/markets/connections/:platformId — disconnect from a platform
router.delete("/connections/:platformId", marketController.deleteConnection);

// GET /api/markets/geocode — server-side geocoding
router.get("/geocode", marketController.geocode);

module.exports = router;

