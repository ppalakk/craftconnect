const https = require('https');
const { resolveMarketImage, detectCraftCategory } = require('./marketImageService');

// In-memory cache to prevent excessive API calls and rate-limiting
// Key: `${lat.toFixed(3)},${lng.toFixed(3)},${category},${radiusKm},${hasContactOnly},${searchQuery || ''}`
const placesCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Overpass API mirror endpoints (ordered by reliability and speed)
const OVERPASS_ENDPOINTS = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

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

// Category keyword & type mappings for Places API & Overpass queries
const CATEGORY_SEARCH_MAPPINGS = {
  "pottery": {
    textQuery: "pottery ceramics terracotta clay studio craft store",
    shopRegex: "pottery|ceramics|craft",
    craftRegex: "pottery|ceramics",
    googleTypes: ["home_goods_store", "art_gallery", "gift_shop"],
    label: "Pottery & Clay Crafts",
    defaultImage: "/images/store_mitti_more.jpg",
    tags: ["Pottery", "Ceramics", "Terracotta"]
  },
  "textiles": {
    textQuery: "handloom store textile showroom saree boutique craft boutique fabric",
    shopRegex: "textiles|fabric|clothes|boutique|handloom|tailor",
    craftRegex: "weaver|tailor|embroiderer",
    googleTypes: ["clothing_store", "home_goods_store"],
    label: "Handloom & Textiles",
    defaultImage: "/images/hero_crafts.jpg",
    tags: ["Handloom", "Textiles", "Fabrics"]
  },
  "bamboo": {
    textQuery: "bamboo craft wooden handicraft handmade furniture gift shop woodcraft",
    shopRegex: "furniture|craft|gift|wood",
    craftRegex: "carpenter|basket_maker|woodcrafter",
    googleTypes: ["home_goods_store", "furniture_store", "gift_shop"],
    label: "Bamboo & Woodcraft",
    defaultImage: "/images/store_artisan_hub.jpg",
    tags: ["Bamboo", "Woodwork", "Handicrafts"]
  },
  "jewellery": {
    textQuery: "handcrafted jewellery store artisan boutique craft jewellery silver beads",
    shopRegex: "jewelry|jewellery",
    craftRegex: "jewelry|jeweller",
    googleTypes: ["jewelry_store", "clothing_store"],
    label: "Handmade Jewellery",
    defaultImage: "/images/store_craft_bazaar.jpg",
    tags: ["Jewellery", "Handcrafted", "Accessories"]
  },
  "paintings": {
    textQuery: "art gallery art framing art dealer handicraft store folk art",
    shopRegex: "art|frame|craft",
    craftRegex: "painter|artist",
    googleTypes: ["art_gallery", "gift_shop"],
    label: "Paintings & Folk Art",
    defaultImage: "/images/store_artisan_hub.jpg",
    tags: ["Folk Art", "Paintings", "Art Gallery"]
  },
  "decor": {
    textQuery: "handicraft store home decor gift shop artisan lifestyle souvenir",
    shopRegex: "gift|interior_decoration|craft|houseware|souvenir",
    craftRegex: "handicraft",
    googleTypes: ["home_goods_store", "gift_shop"],
    label: "Home Decor & Gifts",
    defaultImage: "/images/store_craft_bazaar.jpg",
    tags: ["Home Decor", "Gifts", "Handicrafts"]
  },
  "all": {
    textQuery: "handicraft store craft showroom art gallery handloom pottery artisan market",
    shopRegex: "craft|pottery|ceramics|gift|art|textiles|fabric|jewelry|jewellery|boutique|souvenir|carpet|handicraft|marketplace|antique",
    craftRegex: "pottery|ceramics|carpenter|weaver|handicraft|jewelry|tailor",
    googleTypes: ["home_goods_store", "gift_shop", "clothing_store", "art_gallery"],
    label: "All Craft Categories",
    defaultImage: "/images/store_craft_bazaar.jpg",
    tags: ["Handicrafts", "Artisan Goods", "Local Market"]
  }
};

// Generic retail shops to exclude so results stay relevant to artisans
const EXCLUDED_OSM_SHOPS = new Set([
  'supermarket', 'convenience', 'car_parts', 'car', 'car_repair', 'motorcycle',
  'bicycle', 'pet', 'hairdresser', 'beauty', 'chemist', 'pharmacy', 'optician',
  'electronics', 'mobile_phone', 'tobacco', 'beverages', 'alcohol', 'kiosk',
  'hardware', 'doityourself', 'laundry', 'dry_cleaning', 'bakery', 'butcher'
]);

// Curated verified permanent government craft haats & state artisan hubs across India.
// Included if within radius of the artisan's coordinates.
const VERIFIED_GOVERNMENT_HUBS = [
  {
    id: "hub-bhopal-haat",
    name: "Bhopal Haat",
    city: "Bhopal",
    state: "Madhya Pradesh",
    country: "India",
    lat: 23.2334,
    lng: 77.4300,
    address: "Arera Hills, Near MP Tourism Office, Bhopal, Madhya Pradesh 462011",
    category: "all",
    types: ["Government Craft Haat", "Artisan Stalls"],
    organizer: "MP Handloom & Handicrafts Development Corporation",
    phone: "+91-755-2550186",
    website: "https://mptourism.com/destination-bhopal-haat.php",
    timings: "11:00 AM - 9:00 PM (Daily)",
    imageUrl: "/images/store_craft_bazaar.jpg",
    retailType: "Permanent Artisan Stalls & Rotating State Expos",
    verifiedAt: "2026-03-10"
  },
  {
    id: "hub-gauhar-mahal",
    name: "Gauhar Mahal Heritage Artisan Precinct",
    city: "Bhopal",
    state: "Madhya Pradesh",
    country: "India",
    lat: 23.2560,
    lng: 77.3990,
    address: "VIP Road, Old City, Bhopal, Madhya Pradesh 462001",
    category: "textiles",
    types: ["Heritage Artisan Hub", "Craft Center"],
    organizer: "MP Tourism & Cottage Industries",
    phone: "+91-755-2737490",
    website: "https://mptourism.com/",
    timings: "10:30 AM - 7:30 PM",
    imageUrl: "/images/hero_crafts.jpg",
    retailType: "Heritage Weaver Showcases & Exhibitions",
    verifiedAt: "2026-03-10"
  },
  {
    id: "hub-jkk-jaipur",
    name: "Jawahar Kala Kendra (JKK) Crafts Pavilion",
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    lat: 26.8830,
    lng: 75.8070,
    address: "2, Jawaharlal Nehru Marg, Jhalana Doongri, Jaipur, Rajasthan 302004",
    category: "all",
    types: ["State Cultural Center", "Craft Plaza"],
    organizer: "Department of Art & Culture, Govt. of Rajasthan",
    phone: "+91-141-2706560",
    website: "http://jawaharkalakendra.rajasthan.gov.in/",
    timings: "10:00 AM - 9:00 PM",
    imageUrl: "/images/store_artisan_hub.jpg",
    retailType: "Exhibition Ground & Shilpgram Bazaar",
    verifiedAt: "2026-03-12"
  },
  {
    id: "hub-shilpgram-udaipur",
    name: "Shilpgram Rural Arts & Crafts Complex",
    city: "Udaipur",
    state: "Rajasthan",
    country: "India",
    lat: 24.6186,
    lng: 73.6631,
    address: "Havala Village, Near Fateh Sagar Lake, Udaipur, Rajasthan 313001",
    category: "all",
    types: ["Living Ethnographic Museum & Craft Village", "Artisan Stalls"],
    organizer: "West Zone Cultural Centre (WZCC), Ministry of Culture",
    phone: "+91-294-2431304",
    website: "http://wzccindia.com/",
    timings: "11:00 AM - 7:00 PM",
    imageUrl: "/images/hero_pots.jpg",
    retailType: "Permanent Artisan Huts & Live Demonstrations",
    verifiedAt: "2026-03-12"
  },
  {
    id: "hub-dilli-haat-ina",
    name: "Dilli Haat (INA)",
    city: "Delhi",
    state: "Delhi",
    country: "India",
    lat: 28.5728,
    lng: 77.2076,
    address: "Kidwai Nagar West, Opposite INA Market, New Delhi 110023",
    category: "all",
    types: ["Government Craft Haat", "Rotating Artisan Bazaar"],
    organizer: "Delhi Tourism (DTTDC) & Ministry of Textiles",
    phone: "+91-11-26119055",
    website: "http://delhitourism.gov.in/delhitourism/tourist_place/dilli_haat.jsp",
    timings: "10:30 AM - 10:00 PM (Daily)",
    imageUrl: "/images/store_craft_bazaar.jpg",
    retailType: "Fortnightly All-India Rotating Artisan Stalls",
    verifiedAt: "2026-03-15"
  },
  {
    id: "hub-urban-haat-navi-mumbai",
    name: "Urban Haat CBD Belapur",
    city: "Navi Mumbai",
    state: "Maharashtra",
    country: "India",
    lat: 19.0200,
    lng: 73.0400,
    address: "Sector 5, CBD Belapur, Navi Mumbai, Maharashtra 400614",
    category: "all",
    types: ["Urban Craft Haat", "Permanent Stalls"],
    organizer: "CIDCO & Ministry of Textiles",
    phone: "+91-22-27572718",
    website: "https://cidco.maharashtra.gov.in/",
    timings: "11:00 AM - 9:00 PM",
    imageUrl: "/images/store_artisan_hub.jpg",
    retailType: "Subsidized Artisan Exhibition Stalls",
    verifiedAt: "2026-03-08"
  },
  {
    id: "hub-shilparamam-hyderabad",
    name: "Shilparamam Arts, Crafts & Cultural Village",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    lat: 17.4520,
    lng: 78.3780,
    address: "Hi-Tech City Main Road, Madhapur, Hyderabad, Telangana 500081",
    category: "all",
    types: ["Crafts Village", "Permanent Artisan Stalls"],
    organizer: "Shilparamam Arts & Crafts Society, Govt. of Telangana",
    phone: "+91-40-23100455",
    website: "http://www.shilparamam.org/",
    timings: "10:30 AM - 8:30 PM",
    imageUrl: "/images/store_craft_bazaar.jpg",
    retailType: "Permanent Artisan Workshops & Direct Buyer Stalls",
    verifiedAt: "2026-03-14"
  },
  {
    id: "hub-urban-haat-varanasi",
    name: "Urban Haat Cultural Complex (Varanasi)",
    city: "Varanasi",
    state: "Uttar Pradesh",
    country: "India",
    lat: 25.3280,
    lng: 82.9930,
    address: "Chowkaghat, Cultural Zone, Varanasi, Uttar Pradesh 221002",
    category: "textiles",
    types: ["Weavers Craft Haat", "Government Exhibition Complex"],
    organizer: "UP Institute of Design & Ministry of Textiles",
    phone: null,
    website: "http://updes.up.nic.in/",
    timings: "10:30 AM - 8:00 PM",
    imageUrl: "/images/hero_crafts.jpg",
    retailType: "Direct Weaver-Buyer Linkage Stalls",
    verifiedAt: "2026-03-11"
  }
];

class PlacesService {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_PLACES_API_KEY || null;
    this.foursquareApiKey = process.env.FOURSQUARE_API_KEY || null;
  }

  isGoogleConfigured() {
    return Boolean(this.googleApiKey && this.googleApiKey.trim().length > 10);
  }

  isFoursquareConfigured() {
    return Boolean(this.foursquareApiKey && this.foursquareApiKey.trim().length > 10);
  }

  /**
   * Worldwide Discovery of Real Nearby Retail & Craft Businesses
   * Provider precedence:
   * 1. Google Places API (New) (if configured)
   * 2. Foursquare Places API (if configured)
   * 3. OpenStreetMap Overpass Live API (worldwide coverage, live businesses)
   * 4. OpenStreetMap Nominatim POI search fallback
   * 5. Verified regional craft haats & clusters within radius
   */
  async discoverNearbyPlaces({
    lat,
    lng,
    city = null,
    state = null,
    country = null,
    category = "all",
    radiusKm = 25,
    hasContactOnly = false,
    searchQuery = null
  }) {
    const cleanCategory = String(category || "all").toLowerCase().trim();
    // Clamp radius between 5 km and 100 km
    const radius = Math.min(Math.max(Number(radiusKm) || 25, 5), 100);
    const radiusMeters = radius * 1000;

    // Cache key
    const cacheKey = `${lat ? lat.toFixed(3) : "nolat"},${lng ? lng.toFixed(3) : "nolng"},${cleanCategory},${radius},${hasContactOnly},${searchQuery || ""},${city || ""}`;
    const cached = placesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    let places = [];
    let dataSource = "osm_overpass_worldwide";
    let isLiveApi = false;
    let setupMessage = null;

    // 1. Google Places API (if configured and coordinates provided)
    if (this.isGoogleConfigured() && lat != null && lng != null) {
      try {
        const gpPlaces = await this._queryGooglePlacesNew({
          lat,
          lng,
          city,
          category: cleanCategory,
          radiusMeters
        });
        if (Array.isArray(gpPlaces) && gpPlaces.length > 0) {
          places = gpPlaces;
          dataSource = "google_places_api_new";
          isLiveApi = true;
        }
      } catch (err) {
        console.warn("[PlacesService] Google Places query error, falling back to OSM Overpass:", err.message);
      }
    }

    // 2. Foursquare Places API (if configured and Google not used)
    if (places.length === 0 && this.isFoursquareConfigured() && lat != null && lng != null) {
      try {
        const fsqPlaces = await this._queryFoursquarePlaces({
          lat,
          lng,
          category: cleanCategory,
          radiusMeters
        });
        if (Array.isArray(fsqPlaces) && fsqPlaces.length > 0) {
          places = fsqPlaces;
          dataSource = "foursquare_places_api";
          isLiveApi = true;
        }
      } catch (err) {
        console.warn("[PlacesService] Foursquare query error:", err.message);
      }
    }

    // 3. OpenStreetMap Overpass Live API (Primary Free Live Worldwide Engine)
    if (places.length === 0 && lat != null && lng != null) {
      try {
        const osmPlaces = await this._queryOverpassPlaces({
          lat,
          lng,
          category: cleanCategory,
          radiusMeters,
          city,
          state,
          country
        });
        if (Array.isArray(osmPlaces) && osmPlaces.length > 0) {
          places = osmPlaces;
          dataSource = "osm_overpass_live";
          isLiveApi = true;
        }
      } catch (err) {
        console.warn("[PlacesService] Overpass query error, falling back to Nominatim POI:", err.message);
      }
    }

    // 4. OpenStreetMap Nominatim POI fallback (Worldwide structured search)
    if (places.length === 0 && (city || (lat != null && lng != null))) {
      try {
        const nomPlaces = await this._queryNominatimPoi({
          lat,
          lng,
          city,
          category: cleanCategory,
          radiusKm: radius
        });
        if (Array.isArray(nomPlaces) && nomPlaces.length > 0) {
          places = nomPlaces;
          dataSource = "osm_nominatim_poi";
          isLiveApi = true;
        }
      } catch (err) {
        console.warn("[PlacesService] Nominatim POI query error:", err.message);
      }
    }

    // 5. Merge verified regional craft haats if within user's radius
    const nearbyVerifiedHubs = this._getVerifiedHubsInRadius({
      lat,
      lng,
      category: cleanCategory,
      radiusKm: radius
    });

    if (nearbyVerifiedHubs.length > 0) {
      places = [...nearbyVerifiedHubs, ...places];
    }

    // Deduplicate places by normalized name & close proximity (< 300m)
    places = this._deduplicatePlaces(places);

    // Filter by contact if requested
    if (hasContactOnly) {
      places = places.filter(p => Boolean(p.website || p.phone));
    }

    // Filter by text search query if provided
    if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      places = places.filter(p => {
        const searchable = `${p.name} ${(p.types || []).join(' ')} ${p.address || ''} ${p.category || ''} ${p.retailType || ''}`.toLowerCase();
        return searchable.includes(q);
      });
    }

    // Calculate real Haversine distance and sort strictly by distance
    const enriched = places.map(p => {
      let distanceKm = p.distanceKm != null ? p.distanceKm : null;
      if (distanceKm == null && lat != null && lng != null && p.lat != null && p.lng != null) {
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
    })
    // Strictly filter out any places exceeding the selected radius
    .filter(p => p.distanceKm == null || p.distanceKm <= radius)
    .sort((a, b) => {
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    const result = {
      ok: true,
      isLiveApi,
      dataSource,
      city: city || (enriched[0]?.city) || "Selected Location",
      state: state || (enriched[0]?.state) || "",
      country: country || (enriched[0]?.country) || "",
      lat,
      lng,
      category: cleanCategory,
      radiusKm: radius,
      totalFound: enriched.length,
      places: enriched,
      directMapQuery: `https://www.google.com/maps/search/${encodeURIComponent((CATEGORY_SEARCH_MAPPINGS[cleanCategory]?.textQuery || 'handicrafts') + ' in ' + (city || 'nearby'))}`
    };

    // Cache the result
    placesCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  }

  /**
   * Query OpenStreetMap Overpass API for craft, textile, pottery, market, and gift places
   */
  async _queryOverpassPlaces({ lat, lng, category, radiusMeters, city, state, country }) {
    const catConfig = CATEGORY_SEARCH_MAPPINGS[category] || CATEGORY_SEARCH_MAPPINGS["all"];
    const shopRegex = catConfig.shopRegex;
    const craftRegex = catConfig.craftRegex || "handicraft";

    // Lightweight targeted Overpass QL
    const ql = `[out:json][timeout:12];
(
  node(around:${radiusMeters},${lat},${lng})["shop"~"${shopRegex}"];
  node(around:${radiusMeters},${lat},${lng})["craft"~"${craftRegex}"];
  node(around:${radiusMeters},${lat},${lng})["amenity"="marketplace"];
);
out center 35;`;

    let data = null;
    let selectedEndpoint = null;

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'CraftConnect-App/2.0 (contact@craftconnect.org)'
          },
          body: 'data=' + encodeURIComponent(ql),
          signal: AbortSignal.timeout(9000)
        });

        if (response.ok) {
          data = await response.json();
          selectedEndpoint = endpoint;
          if (data && data.elements && data.elements.length > 0) {
            break;
          }
        }
      } catch (e) {
        // Try next mirror
      }
    }

    if (!data || !data.elements || !Array.isArray(data.elements)) {
      return [];
    }

    const defaultImg = catConfig.defaultImage || "/images/store_craft_bazaar.jpg";

    return data.elements
      .filter(el => {
        if (!el.tags) return false;
        const name = el.tags.name || el.tags['name:en'] || el.tags['name:hi'];
        if (!name || name.trim().length < 2) return false;
        // Exclude generic supermarkets / car parts / etc.
        const shopVal = (el.tags.shop || '').toLowerCase();
        if (EXCLUDED_OSM_SHOPS.has(shopVal)) return false;
        return true;
      })
      .map(el => {
        const tags = el.tags;
        const name = tags.name || tags['name:en'] || tags['name:hi'];
        const pLat = el.lat != null ? el.lat : (el.center ? el.center.lat : null);
        const pLng = el.lon != null ? el.lon : (el.center ? el.center.lon : null);

        const shopType = tags.shop || tags.craft || tags.amenity || 'craft';
        const friendlyType = this._formatOsmShopType(shopType);

        // Address formatting
        const street = tags['addr:street'] || tags['addr:full'] || tags['addr:suburb'] || '';
        const houseNumber = tags['addr:housenumber'] || '';
        const addrCity = tags['addr:city'] || city || '';
        const postcode = tags['addr:postcode'] || '';

        const addressParts = [
          houseNumber ? `${houseNumber} ${street}`.trim() : street,
          tags['addr:suburb'],
          addrCity,
          state,
          country,
          postcode
        ].filter(Boolean);

        const formattedAddress = addressParts.length > 0 ? addressParts.join(', ') : `${name}, ${city || 'Local area'}`;

        const tagList = [friendlyType];
        if (tags.craft) tagList.push('Artisan Craft');
        if (tags.amenity === 'marketplace') tagList.push('Traditional Market');
        if (tags.handmade === 'yes' || tags.craft) tagList.push('Handmade');

        const osmImg = tags.image || tags['image:0'] || tags['contact:image'] || null;
        const resolved = resolveMarketImage({
          name: name.trim(),
          types: tagList,
          category,
          osmImageUrl: osmImg,
          id: `osm-${el.type || 'node'}-${el.id}`
        });

        return {
          id: `osm-${el.type || 'node'}-${el.id}`,
          name: name.trim(),
          address: formattedAddress,
          city: addrCity || city || '',
          state: state || '',
          country: country || '',
          lat: pLat,
          lng: pLng,
          category: category,
          types: tagList,
          retailType: friendlyType,
          phone: tags.phone || tags['contact:phone'] || tags['contact:mobile'] || null,
          website: tags.website || tags['contact:website'] || null,
          timings: tags.opening_hours || null,
          rating: null, // Authentic: do not invent fake ratings for OSM records
          userRatingsTotal: null,
          imageUrl: resolved.imageUrl,
          imageSource: resolved.imageSource,
          isActualPhoto: resolved.isActualPhoto,
          imageAlt: resolved.imageAlt,
          imageCategory: resolved.category,
          fallbackUrl: resolved.fallbackUrl,
          notes: tags.description || null,
          verifiedAt: new Date().toISOString().split('T')[0]
        };
      });
  }

  /**
   * Fallback POI search using OpenStreetMap Nominatim
   */
  async _queryNominatimPoi({ lat, lng, city, category, radiusKm }) {
    const catConfig = CATEGORY_SEARCH_MAPPINGS[category] || CATEGORY_SEARCH_MAPPINGS["all"];
    const keywords = [
      catConfig.textQuery.split(' ')[0], // e.g. "handicraft", "pottery", "textiles"
      "handicrafts",
      "crafts"
    ];

    const results = [];
    const seenNames = new Set();

    for (const kw of keywords.slice(0, 2)) {
      try {
        let queryUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(kw + ' in ' + (city || ''))}&format=json&addressdetails=1&limit=8`;
        if (lat != null && lng != null) {
          // Bounding box ~ radiusKm
          const deltaDeg = (radiusKm / 111.0);
          const viewbox = `${lng - deltaDeg},${lat + deltaDeg},${lng + deltaDeg},${lat - deltaDeg}`;
          queryUrl += `&viewbox=${viewbox}&bounded=0`;
        }

        const res = await fetch(queryUrl, {
          headers: {
            'User-Agent': 'CraftConnect-ArtisanApp/2.0 (craftconnect@artisan.gov)'
          },
          signal: AbortSignal.timeout(6000)
        });

        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items)) {
            items.forEach(item => {
              const name = item.name || (item.display_name ? item.display_name.split(',')[0].trim() : null);
              if (!name || seenNames.has(name.toLowerCase())) return;
              seenNames.add(name.toLowerCase());

              const addr = item.address || {};
              const placeCity = addr.city || addr.town || addr.municipality || addr.village || city || '';

              const placeTypes = [catConfig.label || 'Handicrafts', item.type || 'shop'];
              const resolved = resolveMarketImage({
                name,
                types: placeTypes,
                category,
                id: `nom-${item.osm_type || 'node'}-${item.osm_id || Math.random().toString(36).slice(2, 8)}`
              });

              results.push({
                id: `nom-${item.osm_type || 'node'}-${item.osm_id || Math.random().toString(36).slice(2, 8)}`,
                name: name,
                address: item.display_name || `${name}, ${placeCity}`,
                city: placeCity,
                state: addr.state || '',
                country: addr.country || '',
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                category: category,
                types: placeTypes,
                retailType: this._formatOsmShopType(item.type || 'craft'),
                phone: null,
                website: null,
                rating: null,
                userRatingsTotal: null,
                imageUrl: resolved.imageUrl,
                imageSource: resolved.imageSource,
                isActualPhoto: resolved.isActualPhoto,
                imageAlt: resolved.imageAlt,
                imageCategory: resolved.category,
                fallbackUrl: resolved.fallbackUrl,
                verifiedAt: new Date().toISOString().split('T')[0]
              });
            });
          }
        }
      } catch (err) {
        // continue
      }
      if (results.length >= 6) break;
    }

    return results;
  }

  /**
   * Calls Google Places API (New) endpoint: searchText with locationBias
   */
  async _queryGooglePlacesNew({ lat, lng, city, category, radiusMeters }) {
    const catConfig = CATEGORY_SEARCH_MAPPINGS[category] || CATEGORY_SEARCH_MAPPINGS["all"];
    const queryText = `${catConfig.textQuery} in ${city || ""}`.trim();

    const requestBody = {
      textQuery: queryText,
      maxResultCount: 20,
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
        "X-Goog-Api-Key": this.googleApiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.rating,places.userRatingCount,places.businessStatus,places.regularOpeningHours,places.photos"
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Places HTTP ${response.status}: ${errText.slice(0, 150)}`);
    }

    const data = await response.json();
    if (!data.places || !Array.isArray(data.places)) {
      return [];
    }

    return data.places.map(p => {
      const photoName = (p.photos && p.photos.length > 0 && p.photos[0].name) ? p.photos[0].name : null;
      const placeName = p.displayName?.text || "Craft & Artisan Store";
      const placeTypes = p.types || ["gift_shop", "craft_store"];
      const resolved = resolveMarketImage({
        name: placeName,
        types: placeTypes,
        category,
        googlePhotoName: photoName,
        id: p.id,
        googleApiKey: this.googleApiKey
      });

      return {
        id: p.id || `gp-${Math.random().toString(36).substring(2, 9)}`,
        name: placeName,
        address: p.formattedAddress || `${city || 'Local Area'}`,
        city: city || "",
        lat: p.location?.latitude || null,
        lng: p.location?.longitude || null,
        category: category,
        types: placeTypes,
        phone: p.nationalPhoneNumber || null,
        website: p.websiteUri || null,
        rating: p.rating || null,
        userRatingsTotal: p.userRatingCount || null,
        businessStatus: p.businessStatus || "OPERATIONAL",
        timings: p.regularOpeningHours?.weekdayDescriptions?.[0] || null,
        retailType: "Craft & Artisan Retail Partner",
        imageUrl: resolved.imageUrl,
        imageSource: resolved.imageSource,
        isActualPhoto: resolved.isActualPhoto,
        imageAlt: resolved.imageAlt,
        imageCategory: resolved.category,
        fallbackUrl: resolved.fallbackUrl,
        notes: "Commercial craft retailer or boutique verified via Google Places.",
        verifiedAt: new Date().toISOString().split("T")[0]
      };
    });
  }

  /**
   * Calls Foursquare Places API (v3) search
   */
  async _queryFoursquarePlaces({ lat, lng, category, radiusMeters }) {
    const catConfig = CATEGORY_SEARCH_MAPPINGS[category] || CATEGORY_SEARCH_MAPPINGS["all"];
    const query = catConfig.textQuery.split(' ')[0] || "craft";

    const url = `https://api.foursquare.com/v3/places/search?ll=${lat},${lng}&radius=${radiusMeters}&query=${encodeURIComponent(query)}&fields=fsq_id,name,location,categories,tel,website,rating,stats,photos&limit=15`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': this.foursquareApiKey
      },
      signal: AbortSignal.timeout(7000)
    });

    if (!response.ok) return [];
    const data = await response.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map(r => {
      let fsqPhotoUrl = null;
      if (Array.isArray(r.photos) && r.photos.length > 0) {
        const ph = r.photos[0];
        if (ph.prefix && ph.suffix) {
          fsqPhotoUrl = `${ph.prefix}640x480${ph.suffix}`;
        }
      }
      const placeTypes = (r.categories || []).map(c => c.name);
      const resolved = resolveMarketImage({
        name: r.name,
        types: placeTypes,
        category,
        fsqPhotoUrl,
        id: `fsq-${r.fsq_id}`
      });

      return {
        id: `fsq-${r.fsq_id}`,
        name: r.name,
        address: r.location?.formatted_address || `${r.location?.locality || ''}, ${r.location?.country || ''}`,
        city: r.location?.locality || "",
        state: r.location?.region || "",
        country: r.location?.country || "",
        lat: r.geocodes?.main?.latitude || null,
        lng: r.geocodes?.main?.longitude || null,
        category: category,
        types: placeTypes,
        retailType: r.categories?.[0]?.name || "Artisan Shop",
        phone: r.tel || null,
        website: r.website || null,
        rating: r.rating ? (r.rating / 2).toFixed(1) : null, // Foursquare is 0-10, scale to 0-5
        userRatingsTotal: r.stats?.total_ratings || null,
        imageUrl: resolved.imageUrl,
        imageSource: resolved.imageSource,
        isActualPhoto: resolved.isActualPhoto,
        imageAlt: resolved.imageAlt,
        imageCategory: resolved.category,
        fallbackUrl: resolved.fallbackUrl,
        verifiedAt: new Date().toISOString().split("T")[0]
      };
    });
  }

  /**
   * Format OSM shop / amenity tag into friendly user display
   */
  _formatOsmShopType(val) {
    const map = {
      'craft': 'Artisan Workshop & Store',
      'pottery': 'Pottery & Ceramics Studio',
      'gift': 'Craft Boutique & Gifts',
      'souvenir': 'Souvenir & Artisan Shop',
      'art': 'Art Gallery & Folk Art',
      'textiles': 'Handloom & Textile Showroom',
      'fabric': 'Fabric & Handloom Store',
      'jewelry': 'Handcrafted Jewellery',
      'jewellery': 'Handcrafted Jewellery',
      'marketplace': 'Traditional Craft Market',
      'boutique': 'Craft & Fashion Boutique',
      'carpet': 'Handmade Rugs & Carpets',
      'handicraft': 'Traditional Handicrafts'
    };
    return map[val] || (val ? val.charAt(0).toUpperCase() + val.slice(1).replace(/_/g, ' ') : 'Artisan Store');
  }

  /**
   * Filter verified government hubs strictly by distance to artisan
   */
  _getVerifiedHubsInRadius({ lat, lng, category, radiusKm }) {
    if (lat == null || lng == null) return [];

    return VERIFIED_GOVERNMENT_HUBS.filter(hub => {
      if (category !== "all" && hub.category !== "all" && hub.category !== category) {
        return false;
      }
      const dist = calculateHaversineDistance(lat, lng, hub.lat, hub.lng);
      return dist !== null && dist <= radiusKm;
    }).map(hub => {
      const resolved = resolveMarketImage({
        name: hub.name,
        types: hub.types || [],
        category: hub.category || category,
        officialImageUrl: hub.imageUrl,
        id: hub.id
      });
      return {
        ...hub,
        imageUrl: resolved.imageUrl,
        imageSource: resolved.imageSource,
        isActualPhoto: resolved.isActualPhoto,
        imageAlt: resolved.imageAlt,
        imageCategory: resolved.category,
        fallbackUrl: resolved.fallbackUrl
      };
    });
  }

  /**
   * Deduplicate places by name and close proximity (< 300m)
   */
  _deduplicatePlaces(places) {
    const result = [];
    const seen = new Set();

    for (const p of places) {
      if (!p.name) continue;
      const normName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normName.length < 2) continue;

      let isDup = false;
      for (const existing of result) {
        const existNorm = existing.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normName === existNorm) {
          isDup = true;
          break;
        }
        // If distance between the two is < 0.3 km and names are very similar
        if (p.lat && p.lng && existing.lat && existing.lng) {
          const d = calculateHaversineDistance(p.lat, p.lng, existing.lat, existing.lng);
          if (d !== null && d < 0.3 && (normName.includes(existNorm) || existNorm.includes(normName))) {
            isDup = true;
            break;
          }
        }
      }

      if (!isDup) {
        result.push(p);
      }
    }

    return result;
  }
}

module.exports = new PlacesService();
