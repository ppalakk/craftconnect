/* =========================================================
 *  CraftConnect — Main Application Entry Point
 *  Systematic order:
 *    1. Environment & Imports
 *    2. Database Connection (MongoDB Atlas)
 *    3. Express App Configuration
 *    4. Session (MongoStore) & Auth Middleware
 *    5. Global Middleware & Static Assets
 *    6. Route Mounting
 *    7. Error Handling
 *    8. Server Start
 * ========================================================= */

// ─── 1. ENVIRONMENT & IMPORTS ────────────────────────────
require("dotenv").config();
const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const mongoose = require("mongoose");
const flash = require("connect-flash");
const passport = require("passport");
const MongoStore = require("connect-mongo");

const fileStore = require("./lib/userStore");
const expenseStore = require("./lib/expenseStore");
const { cloudinary } = require("./cloudConfig");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

// Respect reverse proxy headers (Render, Heroku, AWS, Railway) for secure cookies
app.set("trust proxy", 1);

// ─── 2. DATABASE & CLOUD CONNECTIONS ────────────────────
const dbUrl = process.env.ATLASDB_URL;

if (dbUrl) {
  mongoose
    .connect(dbUrl)
    .then(() => {
      console.log("✅ Connected to MongoDB Atlas (CraftConnect) successfully!");
    })
    .catch((err) => {
      console.error("❌ Database connection error:", err.message);
      console.warn("⚠️  App will continue with local JSON file store as fallback.");
    });
} else {
  console.warn("⚠️  ATLASDB_URL not defined. App will run with local JSON file store fallback.");
}

// Verify Cloudinary credentials and connectivity
if (process.env.CLOUD_NAME && process.env.CLOUD_API_KEY) {
  cloudinary.api
    .ping()
    .then(() => {
      console.log(`✅ Connected to Cloudinary (${process.env.CLOUD_NAME}) successfully!`);
    })
    .catch((err) => {
      console.warn("⚠️  Cloudinary connectivity notice:", err.message);
    });
} else {
  console.warn("⚠️  Cloudinary credentials not fully configured in environment.");
}

// ─── 3. VIEW ENGINE CONFIGURATION ───────────────────────
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ─── 4. SESSION STORE (MongoDB Atlas backed with Memory fallback) ─────────────
let store;
if (dbUrl) {
  store = MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 3600, // Lazy session update (once per 24h)
  });

  store.on("error", (err) => {
    console.error("ERROR in MONGO SESSION STORE:", err.message);
  });
}

const sessionOptions = {
  store,
  secret: process.env.SESSION_SECRET || process.env.SECRET || "craftconnect_session_secret_2026",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
};

// ─── 5. GLOBAL MIDDLEWARE ────────────────────────────────
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "8mb" }));
app.use(session(sessionOptions));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Flash messages & current user available in all templates
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.session ? req.session.user : null;
  next();
});

// ─── 6. STATIC ASSETS ───────────────────────────────────
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "public", "images")));
app.use(express.static(path.join(__dirname, "public"), { index: false }));

// ─── 7. HEALTH CHECK & ROUTE MOUNTING ───────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    app: "CraftConnect",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "connected" : "fileStore_fallback",
  });
});

const authRoutes = require("./routes/auth");
const apiRoutes = require("./routes/api");
const marketRoutes = require("./routes/market");
const productRoutes = require("./routes/product");
const pageRoutes = require("./routes/pages");

app.use("/", authRoutes);          // /login, /register, /logout, /auth/demo, etc.
app.use("/api", apiRoutes);        // /api/me, /api/expenses, /api/ai/scan, etc.
app.use("/api/markets", marketRoutes); // /api/markets, /api/markets/nearby, etc.
app.use("/products", productRoutes);   // /products (POST with Cloudinary upload)
app.use("/", pageRoutes);          // /, /dashboard, /markets, /finance, etc.

// ─── 8. ERROR HANDLING ───────────────────────────────────

// 404 — Not Found
app.use((req, res) => {
  if (req.xhr || (req.headers.accept && req.headers.accept.includes("application/json"))) {
    return res.status(404).json({ error: "Route not found" });
  }
  const user = (req.session && req.session.user) || null;
  res.redirect(user ? "/dashboard" : "/login");
});

// 500 — Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  const status = err.status || 500;
  const msg = err.message || "Internal server error";
  if (req.xhr || (req.headers.accept && req.headers.accept.includes("application/json"))) {
    return res.status(status).json({ error: msg });
  }
  res.status(status).render("error", { err: msg });
});

// ─── 9. START SERVER ─────────────────────────────────────
const server = app.listen(PORT, HOST, async () => {
  // Seed demo data for local file store fallback
  try {
    await fileStore.seedDemo();
    expenseStore.seedDemo();
  } catch (seedErr) {
    console.warn("⚠️ Demo seed notice:", seedErr.message);
  }
  console.log(`🚀 CraftConnect backend running at http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
});

module.exports = { app, server };

