/**
 * CraftConnect – Market-Specific Dynamic Image Resolution Service
 *
 * Resolves market and store images according to strict data integrity rules:
 *
 * Image Source Priority:
 * 1. Official business / market photograph from places provider (Google Places / Foursquare / verified hub photo).
 * 2. Authentic licensed OpenStreetMap image reference (tags.image), where provided.
 * 3. Suitable royalty-free category-specific fallback image from reliable provider (Unsplash / Wikimedia Commons).
 *
 * Data Integrity:
 * - Differentiates between actual business photos (`isActualPhoto: true`) and category fallbacks (`isActualPhoto: false`).
 * - Never claims a category fallback is an actual business photograph.
 * - Disperses images across a pool so adjacent stores in the same category don't all show the exact same image.
 * - Categorizes based on market name, business category, and craft type using a 3-tier precedence hierarchy:
 *     Tier 1: Specific craft discipline (pottery, textiles, bamboo, woodcraft, jewellery, paintings)
 *     Tier 2: Cultural venue / cluster type (artisan village, craft haat / bazaar)
 *     Tier 3: Generic handicrafts, home decor, lifestyle
 */

const GOOGLE_PLACES_PHOTO_BASE = 'https://places.googleapis.com/v1';

// // Category fallback pools using curated, high-quality, royalty-free photography
const CATEGORY_PHOTO_POOLS = {
  pottery: [
    { url: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=640&q=80&fit=crop', alt: 'Artisan hand-shaping clay on a pottery wheel' },
    { url: 'https://images.unsplash.com/photo-1604598792947-df4fc3c01c54?w=640&q=80&fit=crop', alt: 'Terracotta and ceramic pots collection' },
    { url: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=640&q=80&fit=crop', alt: 'Ceramic studio and handmade earthenware bowls' },
    { url: 'https://images.unsplash.com/photo-1612198790700-8c7e22e8e8c0?w=640&q=80&fit=crop', alt: 'Glazed pottery and handmade ceramic vessels' },
    { url: 'https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=640&q=80&fit=crop', alt: 'Ceramics and pottery artisan workshop' },
    { url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=640&q=80&fit=crop', alt: 'Traditional terracotta craft pieces' }
  ],
  textiles: [
    { url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=640&q=80&fit=crop', alt: 'Traditional handloom weaving loom with cotton yarns' },
    { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=640&q=80&fit=crop', alt: 'Handwoven textiles and colorful traditional fabrics' },
    { url: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4057?w=640&q=80&fit=crop', alt: 'Authentic textile shop with regional fabric collections' },
    { url: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=640&q=80&fit=crop', alt: 'Handcrafted silk and traditional woven sarees' },
    { url: 'https://images.unsplash.com/photo-1612528443702-f6741f70a049?w=640&q=80&fit=crop', alt: 'Artisan textile embroidery and handloom fabric' },
    { url: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=640&q=80&fit=crop', alt: 'Woven artisan fabrics in textile market' }
  ],
  jewellery: [
    { url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=640&q=80&fit=crop', alt: 'Handcrafted jewellery showroom and artisan displays' },
    { url: 'https://images.unsplash.com/photo-1573408301185-9519f94816b4?w=640&q=80&fit=crop', alt: 'Artisan handmade silver and ethnic craft jewellery' },
    { url: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=640&q=80&fit=crop', alt: 'Handmade silver filigree and ethnic jewellery' },
    { url: 'https://images.unsplash.com/photo-1610694955371-d4a3e0ce4b52?w=640&q=80&fit=crop', alt: 'Traditional handcrafted bead jewellery and accessories' },
    { url: 'https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=640&q=80&fit=crop', alt: 'Handcrafted stone and metal jewellery boutique' }
  ],
  bamboo: [
    { url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=640&q=80&fit=crop', alt: 'Handcrafted bamboo baskets and cane products' },
    { url: 'https://images.unsplash.com/photo-1586281380117-5a60ae2050cc?w=640&q=80&fit=crop', alt: 'Bamboo craft shop with handmade woven utility products' },
    { url: 'https://images.unsplash.com/photo-1512207736890-6ffed8a84e8d?w=640&q=80&fit=crop', alt: 'Intricate woven bamboo patterns and cane weaving' },
    { url: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?w=640&q=80&fit=crop', alt: 'Traditional bamboo craft display' }
  ],
  woodcraft: [
    { url: 'https://images.unsplash.com/photo-1581765485884-c0769b9e2e62?w=640&q=80&fit=crop', alt: 'Handcrafted wooden sculptures and woodcraft display' },
    { url: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=640&q=80&fit=crop', alt: 'Wooden handicraft store with carved artifacts' },
    { url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=640&q=80&fit=crop', alt: 'Carved wooden handicraft products and decor' },
    { url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=640&q=80&fit=crop', alt: 'Artisan woodcarving workshop' }
  ],
  paintings: [
    { url: 'https://images.unsplash.com/photo-1579547945413-497e1b99dac0?w=640&q=80&fit=crop', alt: 'Folk art gallery with traditional indigenous paintings' },
    { url: 'https://images.unsplash.com/photo-1608501947097-86951ad73fea?w=640&q=80&fit=crop', alt: 'Artisan folk paintings and ethnic art studio' },
    { url: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=640&q=80&fit=crop', alt: 'Traditional folk art and painting workshop' },
    { url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=640&q=80&fit=crop', alt: 'Hand-painted craft canvases and art exhibits' }
  ],
  decor: [
    { url: 'https://images.unsplash.com/photo-1558618047-f4e70a9d4e8c?w=640&q=80&fit=crop', alt: 'Handcrafted lifestyle home decor and artisan pieces' },
    { url: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=640&q=80&fit=crop', alt: 'Handicraft store with brass, clay and artisan decor' },
    { url: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2d/c6/75/6e/must-visit-for-great.jpg?w=1100&h=1100&s=1', alt: 'Artisan gift shop and handmade souvenir showroom' },
    { url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=640&q=80&fit=crop', alt: 'Handmade home decor collection and craft boutique' }
  ],
  village: [
    { url: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=640&q=80&fit=crop', alt: 'Artisan village workshop and rural craft production area' },
    { url: 'https://images.unsplash.com/photo-1529154036614-a60975f5c760?w=640&q=80&fit=crop', alt: 'Artisan village craft center with master craftspersons' }
  ],
  market: [
    { url: 'https://images.unsplash.com/photo-1486401899868-0e435ed85128?w=640&q=80&fit=crop', alt: 'Genuine traditional craft bazaar and artisan market stalls' },
    { url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=640&q=80&fit=crop', alt: 'Outdoor craft market stalls with handcrafted products' },
    { url: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=640&q=80&fit=crop', alt: 'Bustling handicraft fair and cultural artisan market' }
  ]
};

// Real shop, storefront and handicraft market photographs
// Sources: Unsplash and Wikimedia Commons


// Local reliable static fallbacks for offline or network-blocked environments
const LOCAL_CATEGORY_FALLBACKS = {
  pottery: '/images/store_mitti_more.jpg',
  textiles: '/images/hero_crafts.jpg',
  jewellery: '/images/hero_pots.jpg',
  bamboo: '/images/store_artisan_hub.jpg',
  woodcraft: '/images/store_artisan_hub.jpg',
  paintings: '/images/hero_pots.jpg',
  decor: '/images/store_craft_bazaar.jpg',
  village: '/images/hero_crafts.jpg',
  market: '/images/store_craft_bazaar.jpg',
  all: '/images/store_craft_bazaar.jpg'
};

// Tier 1: Specific Craft Disciplines (Highest Priority)
const SPECIFIC_CRAFT_KEYWORDS = {
  pottery: [
    'potter', 'pottery', 'ceramic', 'ceramics', 'terracotta', 'clay', 'mitti',
    'earthen', 'earthenware', 'kumbhar', 'matka', 'glaze', 'stoneware'
  ],
  textiles: [
    'textile', 'textiles', 'handloom', 'loom', 'saree', 'sari', 'silk', 'khadi',
    'fabric', 'fabrics', 'weaver', 'weavers', 'weaving', 'chanderi', 'maheshwari',
    'banarasi', 'kanjivaram', 'bandhani', 'bandhej', 'batik', 'zardozi', 'embroidery',
    'dupatta', 'shawl', 'pashmina', 'linen'
  ],
  bamboo: [
    'bamboo', 'cane', 'rattan', 'wicker', 'basket', 'baskets', 'basketry',
    'tokri', 'bamboo craft', 'reed'
  ],
  woodcraft: [
    'wood', 'wooden', 'woodcraft', 'woodcrafts', 'woodcarving', 'carving',
    'sculpture', 'carpenter', 'sandalwood', 'rosewood', 'teak', 'wooden toy'
  ],
  jewellery: [
    'jewel', 'jewellery', 'jewelry', 'ornament', 'ornaments', 'necklace', 'bangle',
    'bangles', 'bead', 'beads', 'silver', 'tribal jewellery', 'filigree', 'dokra jewellery',
    'gem', 'goldsmith', 'silversmith', 'meenakari'
  ],
  paintings: [
    'paint', 'painting', 'paintings', 'artist', 'folk art',
    'gond', 'madhubani', 'warli', 'pattachitra', 'miniature', 'thangka', 'canvas',
    'chitra'
  ]
};

// Tier 2: Venue and Cluster Types (Secondary Priority)
const VENUE_CLUSTER_KEYWORDS = {
  village: [
    'artisan village', 'craft village', 'shilpgram', 'bunkar colony',
    'potters colony', 'cluster', 'artisan workshop'
  ],
  market: [
    'haat', 'bazaar', 'bazar', 'mandi', 'marketplace', 'fair', 'mela',
    'emporium', 'shilp haat'
  ]
};

// Tier 3: Generic Handicrafts and Decor (Tertiary Priority)
const GENERIC_DECOR_KEYWORDS = {
  decor: [
    'decor', 'home decor', 'gift', 'gifts', 'souvenir', 'souvenirs', 'lifestyle',
    'handicraft', 'handicrafts', 'craft', 'crafts', 'shilp', 'kala', 'interior',
    'antique', 'brass', 'metal craft', 'bell metal', 'dhokra', 'leather craft'
  ]
};

function buildSortedRules(keywordMap) {
  const rules = [];
  for (const [cat, keywords] of Object.entries(keywordMap)) {
    for (const kw of keywords) {
      rules.push({ cat, kw, len: kw.length });
    }
  }
  return rules.sort((a, b) => b.len - a.len);
}

const TIER1_RULES = buildSortedRules(SPECIFIC_CRAFT_KEYWORDS);
const TIER2_RULES = buildSortedRules(VENUE_CLUSTER_KEYWORDS);
const TIER3_RULES = buildSortedRules(GENERIC_DECOR_KEYWORDS);

/**
 * Match text against a set of sorted rules
 */
function matchRules(text, rules) {
  for (const { cat, kw } of rules) {
    if (kw.length <= 4) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(text)) return cat;
    } else if (text.includes(kw)) {
      return cat;
    }
  }
  return null;
}

/**
 * Categorize a market based on its name, types, tags, and category input
 *
 * @param {string} name - Place or market name
 * @param {Array<string>} types - Array of types or tags
 * @param {string} baseCategory - Base search category from request
 * @returns {string} Detected category key
 */
function detectCraftCategory(name = '', types = [], baseCategory = 'all') {
  const normText = `${name || ''} ${(types || []).join(' ')}`.toLowerCase();

  // 1. Tier 1: Match specific craft disciplines first (e.g. pottery, textiles, bamboo, etc.)
  const craftMatch = matchRules(normText, TIER1_RULES);
  if (craftMatch) return craftMatch;

  // 2. Tier 2: Match venue / cluster types (artisan village, craft haat, bazaar)
  const venueMatch = matchRules(normText, TIER2_RULES);
  if (venueMatch) return venueMatch;

  // 3. Tier 3: Match general handicrafts & decor
  const decorMatch = matchRules(normText, TIER3_RULES);
  if (decorMatch) return decorMatch;

  // 4. Fall back to baseCategory if specific and valid
  const cleanBase = String(baseCategory || '').toLowerCase();
  if (cleanBase && cleanBase !== 'all' && CATEGORY_PHOTO_POOLS[cleanBase]) {
    return cleanBase;
  }
  if (cleanBase === 'bamboo') return 'bamboo';
  if (cleanBase === 'pottery') return 'pottery';
  if (cleanBase === 'textiles') return 'textiles';
  if (cleanBase === 'jewellery') return 'jewellery';
  if (cleanBase === 'paintings') return 'paintings';
  if (cleanBase === 'decor') return 'decor';

  // 5. Default to traditional market
  return 'market';
}

/**
 * Deterministically pick an image from a pool to ensure stability per store
 * while preventing all stores in the same category from using identical images.
 */
function pickFromPool(pool, seed = '') {
  if (!pool || pool.length === 0) return CATEGORY_PHOTO_POOLS.market[0];
  let hash = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  const index = hash % pool.length;
  return pool[index];
}

/**
 * Builds Google Places New Photo API URL
 */
function buildGooglePhotoUrl(photoName, apiKey) {
  if (!photoName || !apiKey) return null;
  return `${GOOGLE_PLACES_PHOTO_BASE}/${photoName}/media?maxHeightPx=480&maxWidthPx=640&key=${apiKey}`;
}

/**
 * Resolves the appropriate image URL and metadata for a market card
 *
 * @param {object} params
 * @param {string} params.name - Market or store name
 * @param {Array<string>} params.types - Category tags or types
 * @param {string} params.category - Active category filter
 * @param {string} [params.googlePhotoName] - Google Places API photo resource
 * @param {string} [params.fsqPhotoUrl] - Foursquare venue photo URL
 * @param {string} [params.osmImageUrl] - OpenStreetMap official tag image URL
 * @param {string} [params.officialImageUrl] - Government / official hub photo URL
 * @param {string} [params.id] - Unique ID of the place
 * @param {string} [params.googleApiKey] - Google Places API key
 * @returns {object} { imageUrl, imageSource, isActualPhoto, imageAlt, category: detectedCat, fallbackUrl }
 */
function resolveMarketImage({
  name = '',
  types = [],
  category = 'all',
  googlePhotoName = null,
  fsqPhotoUrl = null,
  osmImageUrl = null,
  officialImageUrl = null,
  id = '',
  googleApiKey = null
}) {
  const detectedCat = detectCraftCategory(name, types, category);
  const localFallback = LOCAL_CATEGORY_FALLBACKS[detectedCat] || LOCAL_CATEGORY_FALLBACKS.all;

  // 1. Google Places official business photograph
  if (googlePhotoName && googleApiKey) {
    const googleUrl = buildGooglePhotoUrl(googlePhotoName, googleApiKey);
    if (googleUrl) {
      return {
        imageUrl: googleUrl,
        imageSource: 'google_places_photo',
        isActualPhoto: true,
        sourceLabel: 'Official Business Photo',
        imageAlt: `${name} - Business Photograph`,
        category: detectedCat,
        fallbackUrl: localFallback
      };
    }
  }

  // 2. Foursquare venue photograph
  if (fsqPhotoUrl && typeof fsqPhotoUrl === 'string' && fsqPhotoUrl.startsWith('http')) {
    return {
      imageUrl: fsqPhotoUrl,
      imageSource: 'foursquare_photo',
      isActualPhoto: true,
      sourceLabel: 'Venue Photo',
      imageAlt: `${name} - Venue Photograph`,
      category: detectedCat,
      fallbackUrl: localFallback
    };
  }

  // 3. Official curated government / verified craft hub photo
  if (officialImageUrl && typeof officialImageUrl === 'string' && officialImageUrl.trim().length > 0) {
    return {
      imageUrl: officialImageUrl,
      imageSource: 'official_hub_photo',
      isActualPhoto: true,
      sourceLabel: 'Verified Hub Photo',
      imageAlt: `${name} - Official Center Photo`,
      category: detectedCat,
      fallbackUrl: localFallback
    };
  }

  // 4. OpenStreetMap authentic image reference
  if (osmImageUrl && typeof osmImageUrl === 'string' && (osmImageUrl.startsWith('http://') || osmImageUrl.startsWith('https://'))) {
    return {
      imageUrl: osmImageUrl,
      imageSource: 'osm_licensed_image',
      isActualPhoto: true,
      sourceLabel: 'OpenStreetMap Photo',
      imageAlt: `${name} - Market Photo`,
      category: detectedCat,
      fallbackUrl: localFallback
    };
  }

  // 5. Representative category-specific royalty-free fallback image
  const pool = CATEGORY_PHOTO_POOLS[detectedCat] || CATEGORY_PHOTO_POOLS.market;
  const seed = id || name;
  const picked = pickFromPool(pool, seed);

  return {
    imageUrl: picked.url,
    imageSource: `category_representative_${detectedCat}`,
    isActualPhoto: false,
    sourceLabel: getCategoryDisplayName(detectedCat),
    imageAlt: `${picked.alt} (${name})`,
    category: detectedCat,
    fallbackUrl: localFallback
  };
}

/**
 * Returns human-friendly craft category display name
 */
function getCategoryDisplayName(catKey) {
  const map = {
    pottery: 'Pottery & Ceramics',
    textiles: 'Handloom & Textiles',
    jewellery: 'Handmade Jewellery',
    bamboo: 'Bamboo & Cane Craft',
    woodcraft: 'Wooden Handicrafts',
    paintings: 'Folk Art & Paintings',
    decor: 'Home Decor & Crafts',
    village: 'Artisan Workshop & Village',
    market: 'Traditional Craft Market'
  };
  return map[catKey] || 'Handicrafts & Art';
}

/**
 * Get category-specific local fallback URL
 */
function getCategoryFallbackImage(category = 'all') {
  return LOCAL_CATEGORY_FALLBACKS[category] || LOCAL_CATEGORY_FALLBACKS.all;
}

module.exports = {
  resolveMarketImage,
  detectCraftCategory,
  getCategoryFallbackImage,
  getCategoryDisplayName,
  CATEGORY_PHOTO_POOLS,
  LOCAL_CATEGORY_FALLBACKS
};
