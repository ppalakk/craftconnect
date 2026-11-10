/**
 * Gemini Vision Service — Real image analysis for CraftConnect AI Scan
 *
 * Sends the actual uploaded image bytes to Google Gemini Vision and
 * returns structured product catalog data specific to the visible product.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const dns = require("dns");

// Optimize DNS lookup on Windows to avoid IPv6 timeouts
try {
  if (typeof dns.setDefaultResultOrder === "function") {
    dns.setDefaultResultOrder("ipv4first");
  }
} catch (_) {}

// Lazy-initialised client & model cache
let genAI = null;
let cachedKey = null;
let cachedModel = null;
let cachedModelName = null;

const SUPPORTED_MODELS = [
  process.env.GEMINI_MODEL || "gemini-3-flash-preview",
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
];

function getModel(specificModel) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    const err = new Error(
      "GEMINI_API_KEY is not configured in .env. Please set a valid Google Gemini API key to enable live AI vision analysis."
    );
    err.code = "CONFIG_MISSING";
    err.statusCode = 503;
    throw err;
  }

  const targetModel = specificModel || process.env.GEMINI_MODEL || "gemini-3-flash-preview";

  if (cachedModel && genAI && cachedKey === apiKey && cachedModelName === targetModel) {
    return cachedModel;
  }

  genAI = new GoogleGenerativeAI(apiKey);
  cachedKey = apiKey;
  cachedModelName = targetModel;
  cachedModel = genAI.getGenerativeModel({ model: targetModel });
  return cachedModel;
}

// ── Supported category codes used by the frontend dropdown ──
const CATEGORY_CODES = ["bamboo", "terracotta", "textile", "decor"];
const CATEGORY_LABELS = {
  bamboo: "Bamboo & Wood",
  terracotta: "Terracotta & Clay",
  textile: "Textiles & Weaving",
  decor: "Decor & Gifts",
};

// ── The prompt instructs Gemini to inspect the actual image ──
const ANALYSIS_PROMPT = `You are the AI product cataloging assistant for CraftConnect, an AI platform helping Indian artisans sell handcrafted products.

Carefully analyze the uploaded product image. Identify the actual product visible in the image and generate accurate, image-specific information.

Return a single JSON object with exactly these fields:

{
  "productTitle": "Specific product name inferred from the image",
  "category": "One of: Bamboo & Wood, Terracotta & Clay, Textiles & Weaving, Decor & Gifts",
  "craftType": "Specific craft technique or style visible (e.g., Block Printing, Pottery, Basketry)",
  "description": "Accurate 2-3 sentence description of the visible product, its shape, colors, design, and apparent craftsmanship",
  "materials": ["Material 1 visible or likely", "Material 2 if applicable"],
  "visualFeatures": [
    "Distinctive visible feature 1",
    "Distinctive visible feature 2",
    "Distinctive visible feature 3"
  ],
  "tags": ["Relevant tag 1", "Relevant tag 2", "Relevant tag 3", "Relevant tag 4"],
  "targetBuyers": ["Buyer group 1", "Buyer group 2", "Buyer group 3"],
  "suggestedPriceMin": 0,
  "suggestedPriceMax": 0,
  "optimalSellingPrice": 0,
  "confidence": 0
}

IMPORTANT RULES:
- Identify the product based ONLY on what is visible in this specific image.
- Generate a product title specific to the visible object. Do NOT default to "Handwoven Bamboo Basket" or any generic name.
- Describe the product's actual shape, colors, design, patterns, and visible materials.
- Suggest materials only when reasonably supported by the image. If uncertain, say "Appears to be [material]" or "Unknown material".
- Never assume every product is made of bamboo.
- Do NOT reuse example descriptions, features, tags, or buyer groups from previous analyses.
- Do NOT claim a product is moisture-treated, organic, reinforced, certified, or made using a specific technique unless visually evident.
- If the product type cannot be identified confidently, state uncertainty honestly.
- For category, choose the closest match from: Bamboo & Wood, Terracotta & Clay, Textiles & Weaving, Decor & Gifts.
- For pricing, estimate realistic Indian Rupee (INR) prices for handcrafted products sold in Indian markets. suggestedPriceMin should be less than suggestedPriceMax. optimalSellingPrice should fall within the range.
- confidence should be a number between 0 and 100 representing how confident you are in this analysis.
- Return ONLY the JSON object. No markdown fences, no explanatory text, no code blocks.`;

/**
 * Normalise any error into a safe, human-readable Error object without exposing keys.
 */
function normalizeGeminiError(err) {
  const msg = String(err?.message || "");

  if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid") || msg.includes("API_KEY_MISSING")) {
    const error = new Error("Gemini API key is invalid or unauthorized. Please verify your GEMINI_API_KEY in .env.");
    error.statusCode = 401;
    return error;
  }
  if (msg.includes("GEMINI_API_KEY is not configured") || msg.includes("GEMINI_API_KEY is not set")) {
    const error = new Error("GEMINI_API_KEY is not configured in .env. Please add a valid Google Gemini API key to enable live AI vision analysis.");
    error.statusCode = 503;
    return error;
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota") || msg.includes("Quota exceeded")) {
    const error = new Error("Gemini Vision AI quota or rate limit exceeded. Please wait a moment and try again.");
    error.statusCode = 429;
    return error;
  }
  if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand") || msg.includes("overloaded")) {
    const error = new Error("Gemini Vision AI is temporarily experiencing high demand. Please try again in a few moments.");
    error.statusCode = 503;
    return error;
  }
  if (msg.includes("404") || msg.includes("NOT_FOUND") || msg.includes("no longer available")) {
    const error = new Error("The requested Gemini model is currently unavailable or deprecated.");
    error.statusCode = 502;
    return error;
  }
  if (msg.includes("fetch failed") || msg.includes("ENOTFOUND") || msg.includes("ETIMEDOUT") || msg.includes("ECONNREFUSED")) {
    const error = new Error("Network connection to Gemini AI failed. Please verify your internet connection.");
    error.statusCode = 502;
    return error;
  }
  if (msg.includes("SAFETY") || msg.includes("HARM_CATEGORY") || msg.includes("blocked")) {
    const error = new Error("The image could not be analyzed due to content safety policies.");
    error.statusCode = 422;
    return error;
  }

  // Redact any possible key pattern from error message
  const sanitized = msg.replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED_KEY]");
  const error = new Error(`AI vision analysis failed: ${sanitized || "Unknown error"}`);
  error.statusCode = err?.statusCode || 500;
  return error;
}

/**
 * Validate and format the parsed JSON into standard analysis object
 */
function parseAndValidateAnalysis(parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI returned an invalid response format.");
  }

  const analysis = {
    title: String(parsed.productTitle || "Handcrafted Artisan Product").trim(),
    category: normalizeCategory(parsed.category),
    craftType: String(parsed.craftType || "Traditional Craft").trim(),
    description: String(
      parsed.description || "AI-analyzed artisan product. Please review details."
    ).trim(),
    materials: ensureArray(parsed.materials),
    features: ensureArray(parsed.visualFeatures),
    tags: ensureArray(parsed.tags),
    targetMarket: ensureArray(parsed.targetBuyers).join(", "),
    priceRange: formatPriceRange(parsed.suggestedPriceMin, parsed.suggestedPriceMax),
    recommendedPrice: sanitizePrice(parsed.optimalSellingPrice, parsed.suggestedPriceMin, parsed.suggestedPriceMax),
    suggestedPriceMin: sanitizePositive(parsed.suggestedPriceMin),
    suggestedPriceMax: sanitizePositive(parsed.suggestedPriceMax),
    confidence: (() => {
      let c = Number(parsed.confidence);
      if (c > 0 && c <= 1) c = Math.round(c * 100);
      return Math.min(100, Math.max(0, c || 75));
    })(),
  };

  // Ensure min ≤ max
  if (analysis.suggestedPriceMin > analysis.suggestedPriceMax) {
    [analysis.suggestedPriceMin, analysis.suggestedPriceMax] = [
      analysis.suggestedPriceMax,
      analysis.suggestedPriceMin,
    ];
    analysis.priceRange = formatPriceRange(analysis.suggestedPriceMin, analysis.suggestedPriceMax);
  }

  return analysis;
}

/**
 * Analyse an uploaded image buffer using Gemini Vision.
 *
 * @param {Buffer} imageBuffer  — raw file bytes from multer memoryStorage
 * @param {string} mimeType     — e.g. "image/jpeg", "image/png", "image/webp"
 * @returns {Promise<object>}   — structured product analysis
 */
async function analyzeProductImage(imageBuffer, mimeType) {
  if (!imageBuffer || imageBuffer.length === 0) {
    const err = new Error("No image data provided for analysis.");
    err.statusCode = 400;
    throw err;
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(mimeType)) {
    const err = new Error(
      `Unsupported image type: ${mimeType}. Please upload JPG, PNG, or WEBP.`
    );
    err.statusCode = 400;
    throw err;
  }

  // Convert buffer to base64 for the Gemini inline_data format
  const base64Data = imageBuffer.toString("base64");

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };

  const modelsToTry = Array.from(new Set([
    process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    "gemini-3-flash-preview",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
  ])).filter(Boolean);

  let lastError = null;
  let text = null;

  for (const modelCandidate of modelsToTry) {
    try {
      const visionModel = getModel(modelCandidate);
      const result = await visionModel.generateContent([ANALYSIS_PROMPT, imagePart]);
      const response = result.response;
      text = response.text();
      if (text) break;
    } catch (apiErr) {
      lastError = apiErr;
      const errMsg = String(apiErr?.message || "");
      // If 404 or 503, try next candidate
      if (errMsg.includes("404") || errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("NOT_FOUND")) {
        console.warn(`[GeminiVision] Model ${modelCandidate} returned retryable error (${errMsg.substring(0, 100)}). Trying fallback...`);
        continue;
      }
      throw normalizeGeminiError(apiErr);
    }
  }

  if (!text) {
    throw normalizeGeminiError(lastError || new Error("Failed to receive response from Gemini Vision."));
  }

  // Parse JSON — strip markdown fences if the model wraps them
  let cleanText = text.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }

  let parsed;
  try {
    parsed = JSON.parse(cleanText);
  } catch (parseErr) {
    console.error("Gemini response was not valid JSON:", cleanText.substring(0, 500));
    const err = new Error("AI returned an invalid response format. Please try again.");
    err.statusCode = 502;
    throw err;
  }

  return parseAndValidateAnalysis(parsed);
}

// ── Helpers ──────────────────────────────────────────────

function normalizeCategory(raw) {
  const text = String(raw || "").toLowerCase();
  if (text.includes("bamboo") || (text.includes("wood") && !text.includes("decor"))) return "Bamboo & Wood";
  if (text.includes("terra") || text.includes("clay") || text.includes("pott") || text.includes("ceramic"))
    return "Terracotta & Clay";
  if (text.includes("textile") || text.includes("weav") || text.includes("fabric") || text.includes("embroid") || text.includes("loom"))
    return "Textiles & Weaving";
  if (text.includes("decor") || text.includes("gift") || text.includes("metal") || text.includes("brass") || text.includes("paint"))
    return "Decor & Gifts";
  return "Decor & Gifts";
}

function ensureArray(val) {
  if (Array.isArray(val)) return val.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof val === "string") return val.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function sanitizePositive(n) {
  const v = Number(n);
  return v > 0 ? Math.round(v) : 0;
}

function sanitizePrice(optimal, min, max) {
  let v = sanitizePositive(optimal);
  const lo = sanitizePositive(min);
  const hi = sanitizePositive(max);
  if (v <= 0 && hi > 0) v = Math.round((lo + hi) / 2);
  if (v < lo) v = lo;
  if (hi > 0 && v > hi) v = hi;
  return v || 500;
}

function formatPriceRange(min, max) {
  const lo = sanitizePositive(min);
  const hi = sanitizePositive(max);
  if (lo > 0 && hi > 0) return `₹${lo.toLocaleString("en-IN")} – ₹${hi.toLocaleString("en-IN")}`;
  if (hi > 0) return `Up to ₹${hi.toLocaleString("en-IN")}`;
  return "Price estimate unavailable";
}

module.exports = {
  analyzeProductImage,
  normalizeCategory,
  formatPriceRange,
  sanitizePrice,
  parseAndValidateAnalysis,
  normalizeGeminiError,
  CATEGORY_LABELS,
  CATEGORY_CODES,
  ANALYSIS_PROMPT,
};
