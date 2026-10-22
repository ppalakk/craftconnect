const https = require('https');

// In-memory cache to prevent excessive API calls and rate-limiting
// Key: `${lat.toFixed(3)},${lng.toFixed(3)},${category},${radiusKm}`
const placesCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Haversine distance in kilometers
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Category keyword & type mappings for Places API
const CATEGORY_SEARCH_MAPPINGS = {
  "pottery": {
    textQuery: "pottery store handicraft ceramics home decor",
    googleTypes: ["home_goods_store", "gift_shop", "art_gallery"],
    label: "Pottery & Clay Crafts"
  },
  "textiles": {
    textQuery: "handloom store textile showroom saree boutique craft boutique",
    googleTypes: ["clothing_store", "home_goods_store"],
    label: "Handloom & Textiles"
  },
  "bamboo": {
    textQuery: "bamboo craft wooden handicraft handmade furniture gift shop",
    googleTypes: ["home_goods_store", "furniture_store", "gift_shop"],
    label: "Bamboo & Woodcraft"
  },
  "jewellery": {
    textQuery: "handcrafted jewellery store artisan boutique craft jewellery",
    googleTypes: ["jewelry_store", "clothing_store"],
    label: "Handmade Jewellery"
  },
  "paintings": {
    textQuery: "art gallery art framing art dealer handicraft store",
    googleTypes: ["art_gallery", "gift_shop"],
    label: "Paintings & Folk Art"
  },
  "decor": {
    textQuery: "handicraft store home decor gift shop artisan lifestyle",
    googleTypes: ["home_goods_store", "gift_shop"],
    label: "Home Decor & Gifts"
  },
  "all": {
    textQuery: "handicraft store craft showroom art gallery handloom",
    googleTypes: ["home_goods_store", "gift_shop", "clothing_store", "art_gallery"],
    label: "All Craft Categories"
  }
};

// Curated, verified permanent government craft haats & state artisan hubs across India.
// These are only returned if they fall within the artisan's actual city / search radius!
const VERIFIED_GOVERNMENT_HUBS = [
  {
    id: "store-craft-bazaar",
    name: "Craft Bazaar",
    city: "Bhopal",
    state: "Madhya Pradesh",
    lat: 23.2350,
    lng: 77.4320,
    address: "MP Nagar, Bhopal",
    category: "all",
    types: ["Handicrafts", "Home Decor", "Textiles"],
    organizer: "Artisan Boutique & Handcrafted Goods",
    phone: "+91-755-2554411",
    website: "https://craftbazaar.in",
    timings: "10:00 AM - 9:00 PM",
    rating: 4.5,
    userRatingsTotal: 124,
    imageUrl: "/images/store_craft_bazaar.jpg",
    retailType: "Handicrafts & Decor Store",
    notes: "Curated boutique for ethnic Indian handicrafts, puppets and home decor.",
    verifiedAt: "2026-03-10"
  },
  {
    id: "store-artisan-hub",
    name: "The Artisan Hub",
    city: "Bhopal",
    state: "Madhya Pradesh",
    lat: 23.2512,
    lng: 77.4421,
    address: "Ashoka Garden, Bhopal",
    category: "all",
    types: ["Woodwork", "Paintings", "Handmade Gifts"],
    organizer: "Artisan Co-Op Showcase",
    phone: "+91-755-2748890",
    website: "https://theartisanhub.in",
    timings: "10:00 AM - 8:00 PM",
    rating: 4.3,
    userRatingsTotal: 86,
    imageUrl: "/images/store_artisan_hub.jpg",
    retailType: "Craft Workshop & Gallery",
    notes: "Direct sale gallery of painted terracotta, woodcarvings and folk paintings.",
    verifiedAt: "2026-03-10"
  },
  {
    id: "store-mitti-more",
    name: "Mitti & More",
    city: "Bhopal",
    state: "Madhya Pradesh",
    lat: 23.2650,
    lng: 77.4110,
    address: "Bazar Chowk, Bhopal",
    category: "pottery",
    types: ["Pottery", "Textiles", "Decor"],
    organizer: "Ceramic & Terracotta Collective",
    phone: "+91-755-2661298",
    website: "https://mittiandmore.in",
    timings: "11:00 AM - 8:30 PM",
    rating: 4.2,
    userRatingsTotal: 67,
    imageUrl: "/images/store_mitti_more.jpg",
    retailType: "Studio Pottery & Handloom Boutique",
    notes: "Specializes in traditional earthenware, terracotta planters and handlooms.",
    verifiedAt: "2026-03-10"
  },
  {
    id: "hub-bhopal-haat",
    name: "Bhopal Haat",
    city: "Bhopal",
    state: "Madhya Pradesh",
    lat: 23.2334,
    lng: 77.4300,
    address: "Arera Hills, Near MP Tourism Office, Bhopal, Madhya Pradesh 462011",
    category: "all",
    types: ["Government Craft Haat", "Artisan Stalls"],
    organizer: "MP Handloom & Handicrafts Development Corporation",
    phone: "+91-755-2550186",
    website: "https://mptourism.com/destination-bhopal-haat.php",
    timings: "11:00 AM - 9:00 PM (Daily)",
    retailType: "Permanent Artisan Stalls & Rotating State Expos",
    notes: "Official venue for Mrignayanee craft expos and rural weaver direct sales.",
    verifiedAt: "2026-03-10"
  },
  {
    id: "hub-gauhar-mahal",
    name: "Gauhar Mahal Heritage Artisan Precinct",
    city: "Bhopal",
    state: "Madhya Pradesh",
    lat: 23.2560,
    lng: 77.3990,
    address: "VIP Road, Old City, Bhopal, Madhya Pradesh 462001",
    category: "textiles",
    types: ["Heritage Artisan Hub", "Craft Center"],
    organizer: "MP Tourism & Cottage Industries",
    phone: null,
    website: "https://mptourism.com/",
    timings: "10:30 AM - 7:30 PM",
    retailType: "Heritage Weaver Showcases & Exhibitions",
    notes: "Dedicated heritage stalls for Zardozi, Chanderi weaving, and Gond art.",
    verifiedAt: "2026-03-10"
  },
  {
    id: "hub-jkk-jaipur",
    name: "Jawahar Kala Kendra (JKK) Crafts Pavilion",
    city: "Jaipur",
    state: "Rajasthan",
    lat: 26.8830,
    lng: 75.8070,
    address: "2, Jawaharlal Nehru Marg, Jhalana Doongri, Jaipur, Rajasthan 302004",
    category: "all",
    types: ["State Cultural Center", "Craft Plaza"],
    organizer: "Department of Art & Culture, Govt. of Rajasthan",
    phone: "+91-141-2706560",
    website: "http://jawaharkalakendra.rajasthan.gov.in/",
    timings: "10:00 AM - 9:00 PM",
    retailType: "Exhibition Ground & Shilpgram Bazaar",
    notes: "Prime venue for buyer-artisan interactions, pottery showcase and folk craft expos.",
    verifiedAt: "2026-03-12"
  },
  {
    id: "hub-shilpgram-udaipur",
    name: "Shilpgram Rural Arts & Crafts Complex",
    city: "Udaipur",
    state: "Rajasthan",
    lat: 24.6186,
    lng: 73.6631,
    address: "Havala Village, Near Fateh Sagar Lake, Udaipur, Rajasthan 313001",
    category: "all",
    types: ["Living Ethnographic Museum & Craft Village", "Artisan Stalls"],
    organizer: "West Zone Cultural Centre (WZCC), Ministry of Culture",
    phone: "+91-294-2431304",
    website: "http://wzccindia.com/",
    timings: "11:00 AM - 7:00 PM",
    retailType: "Permanent Artisan Huts & Live Demonstrations",
    notes: "Direct retail opportunities for traditional potters, weavers, and metalworkers.",
    verifiedAt: "2026-03-12"
  },
  {
    id: "hub-dilli-haat-ina",
    name: "Dilli Haat (INA)",
    city: "Delhi",
    state: "Delhi",
    lat: 28.5728,
    lng: 77.2076,
    address: "Kidwai Nagar West, Opposite INA Market, New Delhi 110023",
    category: "all",
    types: ["Government Craft Haat", "Rotating Artisan Bazaar"],
    organizer: "Delhi Tourism (DTTDC) & Ministry of Textiles",
    phone: "+91-11-26119055",
    website: "http://delhitourism.gov.in/delhitourism/tourist_place/dilli_haat.jsp",
    timings: "10:30 AM - 10:00 PM (Daily)",
    retailType: "Fortnightly All-India Rotating Artisan Stalls",
    notes: "Requires DC (Handicrafts) / DC (Handlooms) Pehchan ID for official stall allotment.",
    verifiedAt: "2026-03-15"
  },
  {
    id: "hub-crafts-museum-delhi",
    name: "National Crafts Museum & Hastkala Academy",
    city: "Delhi",
    state: "Delhi",
    lat: 28.6142,
    lng: 77.2425,
    address: "Bhairon Marg, Pragati Maidan, New Delhi 110001",
    category: "all",
    types: ["National Craft Academy & Artisan Demonstration Hub", "Retail Outlet"],
    organizer: "Development Commissioner (Handicrafts), Ministry of Textiles",
    phone: "+91-11-23371887",
    website: "http://nationalcraftsmuseum.nic.in/",
    timings: "10:00 AM - 6:00 PM (Closed Mondays)",
    retailType: "Live Master Artisan Court & Lota Shop",
    notes: "Direct linkage programs with state-awarded master artisans.",
    verifiedAt: "2026-03-15"
  },
  {
    id: "hub-urban-haat-navi-mumbai",
    name: "Urban Haat CBD Belapur",
    city: "Navi Mumbai",
    state: "Maharashtra",
    lat: 19.0200,
    lng: 73.0400,
    address: "Sector 5, CBD Belapur, Navi Mumbai, Maharashtra 400614",
    category: "all",
    types: ["Urban Craft Haat", "Permanent Stalls"],
    organizer: "CIDCO & Ministry of Textiles",
    phone: "+91-22-27572718",
    website: "https://cidco.maharashtra.gov.in/",
    timings: "11:00 AM - 9:00 PM",
    retailType: "Subsidized Artisan Exhibition Stalls",
    notes: "Active weekend craft melas and retail stalls for Maharashtra and pan-India SHGs.",
    verifiedAt: "2026-03-08"
  },
  {
    id: "hub-dakshinapan-kolkata",
    name: "Dakshinapan State Handloom & Handicrafts Complex",
    city: "Kolkata",
    state: "West Bengal",
    lat: 22.5080,
    lng: 88.3680,
    address: "2, Gariahat Road South, Dhakuria, Kolkata, West Bengal 700068",
    category: "textiles",
    types: ["State Handicrafts Emporia Complex", "Retail Hub"],
    organizer: "Kolkata Municipal Corporation & State Emporia",
    phone: null,
    website: null,
    timings: "11:00 AM - 8:00 PM (Closed Sundays)",
    retailType: "Permanent State Emporia & Artisan Showrooms",
    notes: "Houses Manjusha, Biswa Bangla, Tantuja, and state artisan procurement counters.",
    verifiedAt: "2026-03-10"
  },
  {
    id: "hub-shilparamam-hyderabad",
    name: "Shilparamam Arts, Crafts & Cultural Village",
    city: "Hyderabad",
    state: "Telangana",
    lat: 17.4520,
    lng: 78.3780,
    address: "Hi-Tech City Main Road, Madhapur, Hyderabad, Telangana 500081",
    category: "all",
    types: ["Crafts Village", "Permanent Artisan Stalls"],
    organizer: "Shilparamam Arts & Crafts Society, Govt. of Telangana",
    phone: "+91-40-23100455",
    website: "http://www.shilparamam.org/",
    timings: "10:30 AM - 8:30 PM",
    retailType: "Permanent Artisan Workshops & Direct Buyer Stalls",
    notes: "Year-round footfall with dedicated stalls for Bidriware, handlooms, and terracotta.",
    verifiedAt: "2026-03-14"
  },
  {
    id: "hub-chitrakala-bengaluru",
    name: "Karnataka Chitrakala Parishath",
    city: "Bengaluru",
    state: "Karnataka",
    lat: 12.9900,
    lng: 77.5810,
    address: "Art Complex, 1, Kumara Krupa Road, Near Shivananda Circle, Bengaluru 560001",
    category: "paintings",
    types: ["Visual Arts Complex", "Artisan Exhibition Grounds"],
    organizer: "Chitrakala Parishath Trust",
    phone: "+91-80-22261816",
    website: "https://karnatakachitrakalaparishath.com/",
    timings: "10:30 AM - 7:30 PM",
    retailType: "Chitra Santhe & Regular Artisan Bazaars",
    notes: "Celebrated national venue for folk paintings, terracotta, and Channapatna toys.",
    verifiedAt: "2026-03-10"
  },
  {
    id: "hub-urban-haat-varanasi",
    name: "Urban Haat Cultural Complex (Varanasi)",
    city: "Varanasi",
    state: "Uttar Pradesh",
    lat: 25.3280,
    lng: 82.9930,
    address: "Chowkaghat, Cultural Zone, Varanasi, Uttar Pradesh 221002",
    category: "textiles",
    types: ["Weavers Craft Haat", "Government Exhibition Complex"],
    organizer: "UP Institute of Design & Ministry of Textiles",
    phone: null,
    website: "http://updes.up.nic.in/",
    timings: "10:30 AM - 8:00 PM",
    retailType: "Direct Weaver-Buyer Linkage Stalls",
    notes: "Dedicated cluster support for GI Banarasi silk, Gulabi Meenakari, and wooden lacquer toys.",
    verifiedAt: "2026-03-11"
  }
];

class PlacesService {
  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || null;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  }

  /**
   * Search nearby retail businesses and craft stores
   * @param {Object} params
   * @param {number} params.lat - Latitude
   * @param {number} params.lng - Longitude
   * @param {string} params.city - City name
   * @param {string} params.category - Craft category (e.g., pottery, textiles, bamboo, etc.)
   * @param {number} params.radiusKm - Search radius in km (5, 10, 25, 50)
   * @param {boolean} params.hasContactOnly - Filter to places with phone/website
   */
  async discoverNearbyPlaces({ lat, lng, city, category = "all", radiusKm = 25, hasContactOnly = false }) {
    const cleanCategory = String(category || "all").toLowerCase().trim();
    const radius = Math.min(Math.max(Number(radiusKm) || 25, 5), 50);
    const radiusMeters = radius * 1000;

    // Check in-memory cache
    const cacheKey = `${lat ? lat.toFixed(3) : "nolat"},${lng ? lng.toFixed(3) : "nolng"},${cleanCategory},${radius},${hasContactOnly},${city || ""}`;
    const cached = placesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    let places = [];
    let dataSource = "curated_verified";
    let isLiveApi = false;
    let setupMessage = null;

    // Case 1: Google Places API (New) is configured with a valid API key
    if (this.isConfigured() && lat != null && lng != null) {
      try {
        const livePlaces = await this._queryGooglePlacesNew({
          lat,
          lng,
          city,
          category: cleanCategory,
          radiusMeters
        });

        if (Array.isArray(livePlaces) && livePlaces.length > 0) {
          places = livePlaces;
          dataSource = "google_places_api_new";
          isLiveApi = true;
        }
      } catch (err) {
        console.warn("[PlacesService] Google Places API query failed:", err.message);
        setupMessage = `Google Places API returned an error: ${err.message}. Showing verified local hubs and Google Maps search action.`;
      }
    } else if (!this.isConfigured()) {
      setupMessage = "Google Places API key is not configured in .env (GOOGLE_PLACES_API_KEY). Showing verified regional craft hubs and direct map search.";
    }

    // Case 2: If live Places API did not return or is unconfigured, filter our verified hubs
    // that are ACTUALLY within the artisan's radius or city!
    if (places.length === 0) {
      places = this._getVerifiedHubsInRadius({
        lat,
        lng,
        city,
        category: cleanCategory,
        radiusKm: radius
      });
    }

    // Filter by contact if requested
    if (hasContactOnly) {
      places = places.filter(p => Boolean(p.website || p.phone));
    }

    // Calculate real Haversine distance and sort by distance
    const enriched = places.map(p => {
      let distanceKm = null;
      if (lat != null && lng != null && p.lat != null && p.lng != null) {
        distanceKm = calculateHaversineDistance(lat, lng, p.lat, p.lng);
      }
      return {
        ...p,
        distanceKm,
        distanceText: distanceKm !== null ? `${distanceKm} km` : "Nearby",
        directionsUrl: (p.lat && p.lng)
          ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + (p.address || city || ''))}`,
        mapSearchUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + (p.address || city || ''))}`
      };
    }).sort((a, b) => {
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    const result = {
      isLiveApi,
      dataSource,
      configured: this.isConfigured(),
      setupMessage,
      city: city || (enriched[0]?.city) || "Selected Location",
      category: cleanCategory,
      radiusKm: radius,
      totalFound: enriched.length,
      places: enriched,
      directMapQuery: `https://www.google.com/maps/search/${encodeURIComponent((CATEGORY_SEARCH_MAPPINGS[cleanCategory]?.textQuery || 'handicrafts') + ' in ' + (city || 'India'))}`
    };

    // Cache the result
    placesCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  }

  /**
   * Calls Google Places API (New) endpoint: searchText with locationBias
   * Documentation: https://developers.google.com/maps/documentation/places/web-service/text-search
   */
  async _queryGooglePlacesNew({ lat, lng, city, category, radiusMeters }) {
    const catConfig = CATEGORY_SEARCH_MAPPINGS[category] || CATEGORY_SEARCH_MAPPINGS["all"];
    const queryText = `${catConfig.textQuery} in ${city || ""}`.trim();

    const requestBody = {
      textQuery: queryText,
      maxResultCount: 15,
      locationBias: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng
          },
          radius: radiusMeters
        }
      }
    };

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.rating,places.userRatingCount,places.businessStatus"
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText.slice(0, 150)}`);
    }

    const data = await response.json();
    if (!data.places || !Array.isArray(data.places)) {
      return [];
    }

    return data.places.map(p => ({
      id: p.id || `gp-${Math.random().toString(36).substring(2, 9)}`,
      name: p.displayName?.text || "Artisan Retail Partner",
      address: p.formattedAddress || `${city || 'Nearby'}, India`,
      city: city || "",
      lat: p.location?.latitude || null,
      lng: p.location?.longitude || null,
      category: category,
      types: p.types || ["store"],
      phone: p.nationalPhoneNumber || null,
      website: p.websiteUri || null,
      rating: p.rating || null,
      userRatingCount: p.userRatingCount || null,
      businessStatus: p.businessStatus || "OPERATIONAL",
      isPartnerCandidate: true,
      retailType: "Potential Retail Partner & Gift/Art Retailer",
      notes: "Commercial craft retailer or boutique. Recommended for wholesale or retail shelf-space inquiry.",
      verifiedAt: new Date().toISOString().split("T")[0]
    }));
  }

  /**
   * Filter curated hubs strictly based on distance to the artisan or city match.
   * NEVER substitutes Delhi when artisan is in Bhopal/Jaipur/etc.!
   */
  _getVerifiedHubsInRadius({ lat, lng, city, category, radiusKm }) {
    const cleanCity = (city || "").toLowerCase().trim();

    return VERIFIED_GOVERNMENT_HUBS.filter(hub => {
      // Category filter (if not "all")
      if (category !== "all" && hub.category !== "all" && hub.category !== category) {
        return false;
      }

      // If coordinates are provided, check Haversine distance
      if (lat != null && lng != null && hub.lat != null && hub.lng != null) {
        const dist = calculateHaversineDistance(lat, lng, hub.lat, hub.lng);
        // We allow up to radiusKm (or within 40km for regional hubs if radius is small)
        if (dist <= Math.max(radiusKm, 30)) {
          return true;
        }
      }

      // If city matches by name
      if (cleanCity && (hub.city.toLowerCase().includes(cleanCity) || cleanCity.includes(hub.city.toLowerCase()))) {
        return true;
      }

      return false;
    });
  }
}

module.exports = new PlacesService();
