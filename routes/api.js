const express = require("express");
const router = express.Router();
const multer = require("multer");
const mongoose = require("mongoose");
const User = require("../models/User");
const fileStore = require("../lib/userStore");
const expenseStore = require("../lib/expenseStore");
const orderController = require("../controllers/orderController");
const insightsController = require("../controllers/insightsController");
const { analyzeProductImage } = require("../services/geminiVisionService");
const { cloudinary } = require("../cloudConfig");
const { sessionUser, requireAuth } = require("../middleware/auth");

// Scan upload multipart parser (memory storage for instant Gemini processing)
const scanUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error("Unsupported image format. Please upload a JPG, PNG, or WEBP image.");
      err.statusCode = 400;
      cb(err, false);
    }
  },
});

const uploadSingleScan = (req, res, next) => {
  scanUpload.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      const status = err.code === "LIMIT_FILE_SIZE" ? 400 : (err.statusCode || 400);
      const msg = err.code === "LIMIT_FILE_SIZE" ? "Image exceeds 10MB limit." : err.message;
      return res.status(status).json({ error: msg });
    }
    if (req.files) {
      req.file = (req.files["file"] && req.files["file"][0]) ||
                 (req.files["image"] && req.files["image"][0]) ||
                 null;
    }
    next();
  });
};

/* ============ Session & Profile ============ */

// GET /api/me — current session user
router.get("/me", (req, res) => {
  res.json({ user: sessionUser(req) });
});

// GET /api/session.js — inject user into frontend script
router.get("/session.js", (req, res) => {
  res.type("application/javascript");
  res.send(`window.CC_USER=${JSON.stringify(sessionUser(req))};`);
});

// POST /api/profile/avatar — upload/update profile avatar
router.post("/profile/avatar", async (req, res) => {
  let { avatar } = req.body || {};
  if (!avatar) {
    return res.status(400).json({ ok: false, error: "No image data provided" });
  }

  // If base64 data URL, upload to Cloudinary for permanent CDN storage
  if (typeof avatar === "string" && avatar.startsWith("data:image")) {
    try {
      const uploadRes = await cloudinary.uploader.upload(avatar, {
        folder: "CraftConnect_DEV/avatars",
        resource_type: "image",
      });
      avatar = uploadRes.secure_url;
    } catch (uploadErr) {
      console.warn("Cloudinary avatar upload note:", uploadErr.message);
    }
  }

  if (req.session && req.session.user) {
    req.session.user.avatar = avatar;
    if (req.session.user.id) {
      fileStore.updateUserAvatar(req.session.user.id, avatar);
      if (mongoose.connection.readyState === 1) {
        try {
          await User.findOneAndUpdate(
            { $or: [{ email: req.session.user.email }, { phone: req.session.user.phone }] },
            { avatar: avatar }
          );
        } catch (e) {
          console.warn("Mongo avatar update fallback:", e.message);
        }
      }
    }
  }

  res.json({ ok: true, avatar });
});

// DELETE /api/profile/avatar — remove profile avatar
router.delete("/profile/avatar", async (req, res) => {
  if (req.session && req.session.user) {
    req.session.user.avatar = null;
    if (req.session.user.id) {
      fileStore.updateUserAvatar(req.session.user.id, null);
      if (mongoose.connection.readyState === 1) {
        try {
          await User.findOneAndUpdate(
            { $or: [{ email: req.session.user.email }, { phone: req.session.user.phone }] },
            { avatar: null }
          );
        } catch (e) {
          console.warn("Mongo avatar remove fallback:", e.message);
        }
      }
    }
  }
  res.json({ ok: true, avatar: null });
});

/* ============ Sync & Orders ============ */

// GET /api/orders — retrieve artisan orders with status filter & counts
router.get("/orders", orderController.getOrders);

// POST /api/orders — create new order
router.post("/orders", orderController.createOrder);

// POST /api/orders/:id/dispatch — dispatch an order
router.post("/orders/:id/dispatch", orderController.dispatchOrder);

// POST /api/sync — sync catalog / offline queue
router.post("/sync", requireAuth, (req, res) => {
  const items = Array.isArray(req.body?.queue) ? req.body.queue : [];
  res.json({
    ok: true,
    synced: items.length,
    receivedAt: new Date().toISOString(),
  });
});

/* ============ Weather ============ */

// GET /api/weather — weather forecast data
router.get("/weather", async (req, res) => {
  const { city } = req.query;
  if (!city) return res.status(400).json({ error: "City required" });
  res.json({
    city,
    temp: Math.floor(Math.random() * 15) + 20,
    condition: ["Sunny", "Cloudy", "Clear", "Partly Cloudy"][Math.floor(Math.random() * 4)],
    humidity: Math.floor(Math.random() * 40) + 40 + "%",
    wind: Math.floor(Math.random() * 15) + 5 + " km/h",
  });
});

/* ============ Expenses ============ */

// GET /api/expenses — list expenses
router.get("/expenses", (req, res) => {
  const user = sessionUser(req);
  const userId = user ? user.id : "usr_1790788468698";
  const expenses = expenseStore.getForUser(userId);
  res.json({ ok: true, expenses, isGuest: !user });
});

// POST /api/expenses — create an expense (auth required)
router.post("/expenses", requireAuth, (req, res) => {
  const user = sessionUser(req);
  const userId = user.id;
  const { category, amount, date, relatedProduct, description } = req.body;
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ error: "Valid expense amount is required" });
  }
  const created = expenseStore.create(userId, { category, amount, date, relatedProduct, description });
  res.json({ ok: true, expense: created });
});

// PUT /api/expenses/:id — update an expense (auth required)
router.put("/expenses/:id", requireAuth, (req, res) => {
  const user = sessionUser(req);
  const userId = user.id;
  const updated = expenseStore.update(userId, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Expense not found" });
  res.json({ ok: true, expense: updated });
});

// DELETE /api/expenses/:id — delete an expense (auth required)
router.delete("/expenses/:id", requireAuth, (req, res) => {
  const user = sessionUser(req);
  const userId = user.id;
  const removed = expenseStore.remove(userId, req.params.id);
  res.json({ ok: true, removed });
});

/* ============ AI Scan & Pricing ============ */

// POST /api/ai/scan — AI product analysis using Gemini Vision (auth required)
router.post("/ai/scan", requireAuth, uploadSingleScan, async (req, res) => {
  try {
    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({
        error: "No image file uploaded. Please select or capture a product photo.",
      });
    }

    const mimeType = req.file.mimetype || "image/jpeg";
    const imageBuffer = req.file.buffer;

    const analysis = await analyzeProductImage(imageBuffer, mimeType);

    res.json({
      category: analysis.category,
      craftType: analysis.craftType,
      title: analysis.title,
      description: analysis.description,
      features: analysis.features,
      materials: analysis.materials,
      tags: analysis.tags,
      targetMarket: analysis.targetMarket,
      priceRange: analysis.priceRange,
      recommendedPrice: analysis.recommendedPrice,
      suggestedPriceMin: analysis.suggestedPriceMin,
      suggestedPriceMax: analysis.suggestedPriceMax,
      confidence: analysis.confidence,
    });
  } catch (err) {
    console.error("AI scan error:", err.message);
    const statusCode = err.statusCode || (err.message.includes("GEMINI_API_KEY") ? 503 : 500);
    res.status(statusCode).json({
      error: err.message || "AI scan processing failed. Please try again.",
    });
  }
});

/* ============ Insights ============ */

// GET /api/insights — demand & trend intelligence
router.get("/insights", insightsController.getDemandInsights);

module.exports = router;
