const placesService = require('../services/placesService');
const eventsService = require('../services/eventsService');
const marketplacesService = require('../services/marketplacesService');
const connectionStore = require('../lib/connectionStore');
let MarketplaceConnection = null;
try {
  MarketplaceConnection = require('../models/MarketplaceConnection');
} catch (e) {
  // Model loaded when Mongoose is active
}

// In-memory geocode cache
const geocodeCache = new Map();

function getSessionUserId(req) {
  if (req.session && req.session.user && req.session.user.id) {
    return req.session.user.id;
  }
  return "usr_guest_artisan";
}

// Helper to fetch user connections with Mongo fallback to file store
async function getUserConnections(userId) {
  if (MarketplaceConnection && require('mongoose').connection.readyState === 1) {
    try {
      const docs = await MarketplaceConnection.find({ userId }).lean();
      if (docs && docs.length > 0) return docs;
    } catch (e) {
      console.warn("[marketController] Mongo connection query fallback:", e.message);
    }
  }
  return connectionStore.getForUser(userId);
}

// Discover Real Nearby Retail & Craft Businesses (Places API or Verified Hubs)
exports.getNearbyMarkets = async (req, res) => {
  try {
    const { lat, lng, city, category, radius, hasContact } = req.query;

    const parsedLat = lat ? parseFloat(lat) : null;
    const parsedLng = lng ? parseFloat(lng) : null;
    const cleanRadius = radius ? parseInt(radius, 10) : 25;
    const hasContactOnly = hasContact === 'true' || hasContact === '1';

    const result = await placesService.discoverNearbyPlaces({
      lat: parsedLat,
      lng: parsedLng,
      city: city ? String(city).trim() : null,
      category: category || "all",
      radiusKm: cleanRadius,
      hasContactOnly
    });

    res.json({
      ok: true,
      ...result,
      localMarkets: result.places,
      local: result.places
    });
  } catch (error) {
    console.error("[marketController.getNearbyMarkets] Error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to discover nearby markets",
      message: error.message,
      places: [],
      localMarkets: []
    });
  }
};

// Discover Real Upcoming Fairs & Exhibitions
exports.getEvents = async (req, res) => {
  try {
    const { lat, lng, city, category, radius, upcomingOnly } = req.query;

    const parsedLat = lat ? parseFloat(lat) : null;
    const parsedLng = lng ? parseFloat(lng) : null;
    const cleanRadius = radius ? parseInt(radius, 10) : 500;
    const isUpcomingOnly = upcomingOnly !== 'false';

    const result = eventsService.getVerifiedEvents({
      lat: parsedLat,
      lng: parsedLng,
      city: city ? String(city).trim() : null,
      category: category || "all",
      radiusKm: cleanRadius,
      upcomingOnly: isUpcomingOnly
    });

    res.json({
      ok: true,
      ...result
    });
  } catch (error) {
    console.error("[marketController.getEvents] Error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to fetch verified craft exhibitions",
      message: error.message,
      events: []
    });
  }
};

// Online Marketplaces with Dynamic Explainable Matching & User Connection State
exports.getDigitalMarkets = async (req, res) => {
  try {
    const { category } = req.query;
    const userId = getSessionUserId(req);

    const userConnections = await getUserConnections(userId);
    const connMap = new Map();
    userConnections.forEach(c => connMap.set(c.platformId, c));

    const recommendations = marketplacesService.getRecommendations(category || "all");

    // Merge actual user connection state
    const enriched = recommendations.map(platform => {
      const userConn = connMap.get(platform.id);
      return {
        ...platform,
        userConnection: userConn || null,
        connectionStatus: userConn ? userConn.status : "not_started",
        merchantId: userConn ? userConn.merchantId : null,
        isAuthorizedApi: Boolean(userConn && userConn.apiConfig && userConn.apiConfig.isAuthorized)
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error("[marketController.getDigitalMarkets] Error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to load online marketplaces catalog",
      message: error.message
    });
  }
};

// Retrieve User's Marketplace Connections
exports.getConnections = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    const connections = await getUserConnections(userId);
    res.json({
      ok: true,
      userId,
      connections
    });
  } catch (error) {
    console.error("[marketController.getConnections] Error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to fetch marketplace connections",
      message: error.message
    });
  }
};

// Update or Save Marketplace Connection / Onboarding Stage
exports.updateConnection = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    const { platformId, status, merchantId, sellerStoreName, apiCredentials, onboardingNotes } = req.body;

    if (!platformId) {
      return res.status(400).json({ ok: false, error: "platformId is required" });
    }

    const platform = marketplacesService.getPlatformById(platformId);
    if (!platform) {
      return res.status(404).json({ ok: false, error: "Unknown marketplace platform" });
    }

    const validStatuses = ['not_started', 'external_registration', 'awaiting_approval', 'connected', 'expired', 'error'];
    const newStatus = validStatuses.includes(status) ? status : 'external_registration';

    let isAuthorized = false;
    let clientId = null;

    // Check if API credentials were provided
    if (apiCredentials && typeof apiCredentials === 'object') {
      clientId = apiCredentials.clientId || apiCredentials.appId || null;
      // In a real OAuth flow or developer key setup, we verify non-empty key structure
      if (clientId && (apiCredentials.clientSecret || apiCredentials.appSecret)) {
        isAuthorized = true;
      }
    }

    const updatePayload = {
      platformId,
      platformName: platform.name,
      status: newStatus,
      merchantId: merchantId || null,
      sellerStoreName: sellerStoreName || null,
      apiConfig: {
        isAuthorized: isAuthorized || (newStatus === 'connected'),
        clientId: clientId,
        lastSyncAt: isAuthorized ? new Date() : null
      },
      onboardingNotes: onboardingNotes || "",
      updatedAt: new Date()
    };

    let saved = null;
    if (MarketplaceConnection && require('mongoose').connection.readyState === 1) {
      try {
        saved = await MarketplaceConnection.findOneAndUpdate(
          { userId, platformId },
          { $set: updatePayload },
          { upsert: true, new: true }
        ).lean();
      } catch (e) {
        console.warn("[marketController] Mongo connection update fallback:", e.message);
      }
    }

    if (!saved) {
      saved = connectionStore.upsert(userId, platformId, updatePayload);
    }

    res.json({
      ok: true,
      message: `Connection status updated for ${platform.name}`,
      connection: saved
    });
  } catch (error) {
    console.error("[marketController.updateConnection] Error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to update connection",
      message: error.message
    });
  }
};

// Disconnect or Reset Connection
exports.deleteConnection = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    const { platformId } = req.params;

    if (!platformId) {
      return res.status(400).json({ ok: false, error: "platformId is required" });
    }

    if (MarketplaceConnection && require('mongoose').connection.readyState === 1) {
      try {
        await MarketplaceConnection.deleteOne({ userId, platformId });
      } catch (e) {
        console.warn("[marketController] Mongo delete connection fallback:", e.message);
      }
    }

    connectionStore.remove(userId, platformId);

    res.json({
      ok: true,
      message: `Reset connection for platform ${platformId}`
    });
  } catch (error) {
    console.error("[marketController.deleteConnection] Error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to delete connection",
      message: error.message
    });
  }
};

// Server-side Geocoding & Reverse Geocoding with Caching & Rate Protection
exports.geocode = async (req, res) => {
  try {
    const { query, lat, lng } = req.query;

    if (lat && lng) {
      const pLat = parseFloat(lat);
      const pLng = parseFloat(lng);
      const cacheKey = `rev_${pLat.toFixed(4)}_${pLng.toFixed(4)}`;
      if (geocodeCache.has(cacheKey)) {
        return res.json(geocodeCache.get(cacheKey));
      }

      const revUrl = `https://nominatim.openstreetmap.org/reverse?lat=${pLat}&lon=${pLng}&format=json&zoom=14`;
      const response = await fetch(revUrl, {
        headers: { 'User-Agent': 'CraftConnect-ArtisanApp/2.0 (craftconnect@artisan.gov)' },
        signal: AbortSignal.timeout(6000)
      });
      if (!response.ok) throw new Error("Reverse geocoding service unavailable");

      const data = await response.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.municipality || addr.village || addr.county || addr.state_district || "Current Location";
      const state = addr.state || "";

      const result = {
        ok: true,
        type: "reverse",
        lat: pLat,
        lng: pLng,
        city,
        state,
        displayName: `${city}${state ? ', ' + state : ''}`,
        rawAddress: addr
      };

      geocodeCache.set(cacheKey, result);
      return res.json(result);
    }

    if (query) {
      const cleanQ = String(query).trim();
      const cacheKey = `fwd_${cleanQ.toLowerCase()}`;
      if (geocodeCache.has(cacheKey)) {
        return res.json(geocodeCache.get(cacheKey));
      }

      const fwdUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQ)}&format=json&countrycodes=in&limit=1`;
      const response = await fetch(fwdUrl, {
        headers: { 'User-Agent': 'CraftConnect-ArtisanApp/2.0 (craftconnect@artisan.gov)' },
        signal: AbortSignal.timeout(6000)
      });
      if (!response.ok) throw new Error("Forward geocoding service unavailable");

      const data = await response.json();
      if (!data || data.length === 0) {
        return res.status(404).json({ ok: false, error: "Location not found in India. Please check city name spelling." });
      }

      const item = data[0];
      const parts = item.display_name.split(',').map(s => s.trim());
      const city = parts[0] || cleanQ;
      const state = parts.length > 2 ? parts[parts.length - 2] : "";

      const result = {
        ok: true,
        type: "forward",
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        city,
        state,
        displayName: item.display_name
      };

      geocodeCache.set(cacheKey, result);
      return res.json(result);
    }

    res.status(400).json({ ok: false, error: "Must specify either query or lat & lng" });
  } catch (error) {
    console.error("[marketController.geocode] Error:", error);
    res.status(500).json({
      ok: false,
      error: "Geocoding request failed",
      message: error.message
    });
  }
};

// Combined Markets Endpoint (Backwards-compatible for existing callers)
exports.getCombinedMarkets = async (req, res) => {
  try {
    const { lat, lng, city, category, radius } = req.query;
    const parsedLat = lat ? parseFloat(lat) : null;
    const parsedLng = lng ? parseFloat(lng) : null;
    const cleanRadius = radius ? parseInt(radius, 10) : 25;
    const cleanCategory = category || "all";

    const placesResult = await placesService.discoverNearbyPlaces({
      lat: parsedLat,
      lng: parsedLng,
      city,
      category: cleanCategory,
      radiusKm: cleanRadius
    });

    const eventsResult = eventsService.getVerifiedEvents({
      lat: parsedLat,
      lng: parsedLng,
      city,
      category: cleanCategory,
      radiusKm: 500,
      upcomingOnly: true
    });

    const digitalPlatforms = marketplacesService.getRecommendations(cleanCategory);

    res.json({
      ok: true,
      city: placesResult.city,
      category: cleanCategory,
      radiusKm: cleanRadius,
      localMarkets: placesResult.places,
      local: placesResult.places,
      events: eventsResult.events,
      digitalMarkets: digitalPlatforms,
      digital: digitalPlatforms
    });
  } catch (error) {
    console.error("[marketController.getCombinedMarkets] Error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to load combined markets",
      message: error.message
    });
  }
};

exports.renderMarketsPage = (req, res) => {
  res.render('dashboard/markets', {
    user: (req.session && req.session.user) || null
  });
};
