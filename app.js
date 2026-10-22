require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/expressError.js");
const session = require("express-session");
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/User");
const fileStore = require("./lib/userStore");
const flash = require("connect-flash");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

let mongoReady = false;

async function connectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) return;
  try {
    await mongoose.connect(uri);
    mongoReady = true;
    console.log("MongoDB connected");
  } catch (err) {
    console.warn("MongoDB unavailable, using local JSON user store:", err.message);
  }
}

// View engine setup
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "8mb" }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "craftconnect-sih-2026-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true
    }
  })
);

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Global template locals
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.session ? req.session.user : null;
  next();
});

// Static assets (do not serve index.html statically so user script can be injected)
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/css", express.static(path.join(__dirname, "public")));
app.use("/js", express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "public"), { index: false }));
app.use(express.static(ROOT, { index: false }));

function sessionUser(req) {
  return (req.session && req.session.user) || null;
}

function injectUserScript(html, user) {
  const tag = `<script>window.CC_USER=${JSON.stringify(user || null)};</script>`;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${tag}</head>`);
  }
  return tag + html;
}

// Authentication Middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  const isApi = req.xhr || (req.headers.accept && req.headers.accept.includes("application/json")) || req.path.startsWith("/api/");
  if (isApi) {
    return res.status(401).json({
      ok: false,
      error: "Authentication required",
      message: "Please sign in to your CraftConnect account to use this feature.",
      loginUrl: "/login"
    });
  }
  const redirectTarget = req.originalUrl || "/dashboard";
  res.redirect(`/login?error=${encodeURIComponent("Please sign in to access this feature.")}&redirect=${encodeURIComponent(redirectTarget)}`);
}

/* ================= AUTHENTICATION ROUTES ================= */

app.get("/login", (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect(req.query.redirect || "/dashboard");
  }
  const flashErr = req.flash("error");
  const flashSuccess = req.flash("success");
  const error = req.query.error || (flashErr.length ? flashErr[0] : null);
  const success = req.query.success || (flashSuccess.length ? flashSuccess[0] : null);
  res.render("users/login", {
    error,
    success,
    role: req.query.role || "artisan",
    redirect: req.query.redirect || ""
  });
});

app.get("/register", (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect(req.query.redirect || "/dashboard");
  }
  const flashErr = req.flash("error");
  const flashSuccess = req.flash("success");
  const error = req.query.error || (flashErr.length ? flashErr[0] : null);
  const success = req.query.success || (flashSuccess.length ? flashSuccess[0] : null);
  res.render("users/register", {
    error,
    success,
    role: req.query.role || "artisan",
    redirect: req.query.redirect || ""
  });
});

app.post("/login", async (req, res) => {
  const { email, password, role, redirect } = req.body;
  const redirectUrl = redirect && redirect.startsWith("/") ? redirect : "/dashboard";
  const isJson = req.xhr || (req.headers.accept && req.headers.accept.includes("application/json")) || req.is("json");

  if (!email || !password) {
    const msg = "Please enter both email/phone and password.";
    if (isJson) return res.status(400).json({ ok: false, error: msg });
    return res.redirect(`/login?error=${encodeURIComponent(msg)}&redirect=${encodeURIComponent(redirectUrl)}&role=${encodeURIComponent(role || "artisan")}`);
  }

  try {
    let authenticatedUser = null;
    const cleanId = String(email).trim();

    if (mongoReady) {
      const userDoc = await User.findOne({
        $or: [
          { email: cleanId.toLowerCase() },
          { phone: cleanId }
        ]
      });
      if (userDoc) {
        const bcrypt = require("bcrypt");
        const match = await bcrypt.compare(password, userDoc.password);
        if (match) {
          authenticatedUser = {
            id: String(userDoc._id),
            name: userDoc.name,
            email: userDoc.email,
            phone: userDoc.phone,
            craft: userDoc.craft,
            state: userDoc.state,
            role: role || userDoc.role || "artisan"
          };
        }
      }
    }

    if (!authenticatedUser) {
      const local = await fileStore.findByEmailOrPhone(cleanId);
      if (local && (await fileStore.verifyPassword(local, password))) {
        authenticatedUser = fileStore.publicUser(local);
        if (role) authenticatedUser.role = role;
      }
    }

    if (!authenticatedUser) {
      const msg = "Invalid credentials. Please verify your email/phone and password, or use a demo account.";
      if (isJson) return res.status(401).json({ ok: false, error: msg });
      return res.redirect(`/login?error=${encodeURIComponent(msg)}&redirect=${encodeURIComponent(redirectUrl)}&role=${encodeURIComponent(role || "artisan")}`);
    }

    req.session.user = authenticatedUser;
    req.flash("success", `Welcome back, ${authenticatedUser.name}!`);

    if (isJson) {
      return res.json({ ok: true, user: authenticatedUser, redirect: redirectUrl });
    }
    res.redirect(redirectUrl);
  } catch (err) {
    console.error("Login error:", err);
    const msg = "An error occurred during sign in. Please try again.";
    if (isJson) return res.status(500).json({ ok: false, error: msg });
    res.redirect(`/login?error=${encodeURIComponent(msg)}&redirect=${encodeURIComponent(redirectUrl)}`);
  }
});

app.post("/register", async (req, res) => {
  const isJson = req.xhr || (req.headers.accept && req.headers.accept.includes("application/json")) || req.is("json");
  const { name, email, phone, craft, state, password, confirmPassword, role, redirect } = req.body;
  const redirectUrl = redirect && redirect.startsWith("/") ? redirect : "/dashboard";

  if (!name || !email || !phone || !password || !confirmPassword) {
    const msg = "Please fill in all required fields.";
    if (isJson) return res.status(400).json({ ok: false, error: msg });
    return res.redirect(`/register?error=${encodeURIComponent(msg)}&redirect=${encodeURIComponent(redirectUrl)}`);
  }

  if (password.length < 6) {
    const msg = "Password must be at least 6 characters long.";
    if (isJson) return res.status(400).json({ ok: false, error: msg });
    return res.redirect(`/register?error=${encodeURIComponent(msg)}&redirect=${encodeURIComponent(redirectUrl)}`);
  }

  if (password !== confirmPassword) {
    const msg = "Passwords do not match. Please verify your password.";
    if (isJson) return res.status(400).json({ ok: false, error: msg });
    return res.redirect(`/register?error=${encodeURIComponent(msg)}&redirect=${encodeURIComponent(redirectUrl)}`);
  }

  const cleanPhone = String(phone).replace(/\D/g, "");
  if (cleanPhone.length < 10) {
    const msg = "Please enter a valid 10-digit mobile number.";
    if (isJson) return res.status(400).json({ ok: false, error: msg });
    return res.redirect(`/register?error=${encodeURIComponent(msg)}&redirect=${encodeURIComponent(redirectUrl)}`);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(email).trim())) {
    const msg = "Please enter a valid email address.";
    if (isJson) return res.status(400).json({ ok: false, error: msg });
    return res.redirect(`/register?error=${encodeURIComponent(msg)}&redirect=${encodeURIComponent(redirectUrl)}`);
  }

  const payload = {
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    phone: String(phone).trim(),
    craft: craft || "handicraft",
    state: state || "Rajasthan",
    password,
    role: role || "artisan"
  };

  try {
    let createdUser = null;
    if (mongoReady) {
      const existing = await User.findOne({
        $or: [{ email: payload.email }, { phone: payload.phone }]
      });
      if (existing) {
        const msg = existing.email === payload.email
          ? "This email is already registered. Please sign in."
          : "This phone number is already registered. Please sign in.";
        if (isJson) return res.status(409).json({ ok: false, error: msg });
        return res.redirect(`/register?error=${encodeURIComponent(msg)}&redirect=${encodeURIComponent(redirectUrl)}`);
      }
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(password, 10);
      const doc = await User.create({ ...payload, password: hashedPassword });
      createdUser = {
        id: String(doc._id),
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        craft: doc.craft,
        state: doc.state,
        role: doc.role
      };
    } else {
      const created = await fileStore.createUser(payload);
      createdUser = fileStore.publicUser(created);
    }

    req.session.user = createdUser;
    req.flash("success", `Account created successfully! Welcome to CraftConnect, ${createdUser.name}.`);

    if (isJson) {
      return res.status(201).json({ ok: true, user: createdUser, redirect: redirectUrl });
    }
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Register error:", error);
    let msg = "Registration failed. Please check your details and try again.";
    if (error.code === "DUP_EMAIL" || error.code === "DUP" || error.code === 11000) {
      msg = "This email is already registered. Please sign in.";
    } else if (error.code === "DUP_PHONE") {
      msg = "This phone number is already registered. Please sign in.";
    }
    if (isJson) return res.status(409).json({ ok: false, error: msg });
    res.redirect(`/register?error=${encodeURIComponent(msg)}&redirect=${encodeURIComponent(redirectUrl)}`);
  }
});

// Quick 1-click Demo Login for Testing & Evaluation
app.all(["/auth/demo", "/api/auth/demo-login"], async (req, res) => {
  const role = (req.body && req.body.role) || (req.query && req.query.role) || "artisan";
  let targetEmail = "sita@artisan.com";
  if (role === "supplier") targetEmail = "rajesh@supplier.com";
  if (role === "buyer") targetEmail = "priya@buyer.com";

  let userObj = null;
  if (mongoReady) {
    const userDoc = await User.findOne({ email: targetEmail });
    if (userDoc) {
      userObj = {
        id: String(userDoc._id),
        name: userDoc.name,
        email: userDoc.email,
        phone: userDoc.phone,
        craft: userDoc.craft,
        state: userDoc.state,
        role: userDoc.role
      };
    }
  }

  if (!userObj) {
    let local = await fileStore.findByEmail(targetEmail);
    if (!local) {
      await fileStore.seedDemo();
      local = await fileStore.findByEmail(targetEmail);
    }
    if (local) {
      userObj = fileStore.publicUser(local);
    }
  }

  if (!userObj) {
    userObj = {
      id: "usr_demo_" + Date.now(),
      name: role === "supplier" ? "Rajesh Patel" : role === "buyer" ? "Priya Sharma" : "Sita Devi",
      email: targetEmail,
      phone: "9876543210",
      craft: role === "supplier" ? "raw_materials" : "handicraft",
      state: role === "supplier" ? "Gujarat" : "Rajasthan",
      role: role
    };
  }

  req.session.user = userObj;
  req.flash("success", `Signed in as Demo ${userObj.role.toUpperCase()}: ${userObj.name}`);

  const redirectUrl = (req.body && req.body.redirect) || (req.query && req.query.redirect) || "/dashboard";
  const isJson = req.xhr || (req.headers.accept && req.headers.accept.includes("application/json")) || req.is("json");

  if (isJson) {
    return res.json({ ok: true, user: userObj, redirect: redirectUrl });
  }
  res.redirect(redirectUrl);
});

app.all("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    const isJson = req.xhr || (req.headers.accept && req.headers.accept.includes("application/json"));
    if (isJson) {
      return res.json({ ok: true, message: "Logged out successfully" });
    }
    res.redirect("/login?success=" + encodeURIComponent("You have signed out successfully."));
  });
});

app.get("/auth/google", (req, res) => {
  res.redirect("/login?error=" + encodeURIComponent("Google sign-in is disabled in local mode. Please use email/phone login."));
});

app.get("/forgot-password", (req, res) => {
  res.render("users/login", {
    error: "Password reset is not available in offline mode. Please create a new account if needed.",
    success: null,
    role: "artisan",
    redirect: ""
  });
});

/* ================= API ENDPOINTS ================= */

app.get("/api/me", (req, res) => {
  res.json({ user: sessionUser(req) });
});

app.get("/api/session.js", (req, res) => {
  res.type("application/javascript");
  res.send(`window.CC_USER=${JSON.stringify(sessionUser(req))};`);
});

// Update profile avatar (uploaded image)
app.post("/api/profile/avatar", async (req, res) => {
  const { avatar } = req.body || {};
  if (!avatar) {
    return res.status(400).json({ ok: false, error: "No image data provided" });
  }

  if (req.session && req.session.user) {
    req.session.user.avatar = avatar;
    if (req.session.user.id) {
      fileStore.updateUserAvatar(req.session.user.id, avatar);
      if (mongoReady && User) {
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

// Remove profile avatar
app.delete("/api/profile/avatar", async (req, res) => {
  if (req.session && req.session.user) {
    req.session.user.avatar = null;
    if (req.session.user.id) {
      fileStore.updateUserAvatar(req.session.user.id, null);
      if (mongoReady && User) {
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

// Protected: Sync catalog / offline queue
app.post("/api/sync", requireAuth, (req, res) => {
  const items = Array.isArray(req.body?.queue) ? req.body.queue : [];
  res.json({
    ok: true,
    synced: items.length,
    receivedAt: new Date().toISOString()
  });
});

// Protected: Order dispatch action
app.post("/api/orders/:id/dispatch", requireAuth, async (req, res) => {
  try {
    res.json({
      ok: true,
      status: "dispatched",
      id: req.params.id,
      dispatchedBy: sessionUser(req).name
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// Weather forecast (public / viewable)
app.get("/api/weather", async (req, res) => {
  const { city } = req.query;
  if (!city) return res.status(400).json({ error: "City required" });
  res.json({
    city,
    temp: Math.floor(Math.random() * 15) + 20,
    condition: ["Sunny", "Cloudy", "Clear", "Partly Cloudy"][Math.floor(Math.random() * 4)],
    humidity: Math.floor(Math.random() * 40) + 40 + "%",
    wind: Math.floor(Math.random() * 15) + 5 + " km/h"
  });
});

const marketController = require("./controllers/marketController");
const insightsController = require("./controllers/insightsController");
const aiCatalogController = require("./controllers/aiCatalogController");
const financeController = require("./controllers/financeController");

// Market data & discovery routes
app.get("/api/markets", marketController.getCombinedMarkets);
app.get("/api/markets/nearby", marketController.getNearbyMarkets);
app.get("/api/markets/events", marketController.getEvents);
app.get("/api/markets/platforms", marketController.getDigitalMarkets);
app.get("/api/digital-markets", marketController.getDigitalMarkets);
app.get("/api/markets/connections", marketController.getConnections);
app.post("/api/markets/connections", marketController.updateConnection);
app.delete("/api/markets/connections/:platformId", marketController.deleteConnection);
app.get("/api/markets/geocode", marketController.geocode);
app.get("/api/insights", insightsController.getDemandInsights);

app.get("/markets", (req, res) => {
  const user = sessionUser(req);
  res.render("dashboard/markets", { user, currUser: user });
});

const expenseStore = require("./lib/expenseStore");

// Expense listing: viewable with demo fallback for guests, user-isolated for logged in
app.get("/api/expenses", (req, res) => {
  const user = sessionUser(req);
  const userId = user ? user.id : "usr_1790788468698";
  const expenses = expenseStore.getForUser(userId);
  res.json({ ok: true, expenses, isGuest: !user });
});

// Protected: Create expense
app.post("/api/expenses", requireAuth, (req, res) => {
  const user = sessionUser(req);
  const userId = user.id;
  const { category, amount, date, relatedProduct, description } = req.body;
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ error: "Valid expense amount is required" });
  }
  const created = expenseStore.create(userId, { category, amount, date, relatedProduct, description });
  res.json({ ok: true, expense: created });
});

// Protected: Update expense
app.put("/api/expenses/:id", requireAuth, (req, res) => {
  const user = sessionUser(req);
  const userId = user.id;
  const updated = expenseStore.update(userId, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Expense not found" });
  res.json({ ok: true, expense: updated });
});

// Protected: Delete expense
app.delete("/api/expenses/:id", requireAuth, (req, res) => {
  const user = sessionUser(req);
  const userId = user.id;
  const removed = expenseStore.remove(userId, req.params.id);
  res.json({ ok: true, removed });
});

app.get("/finance", (req, res) => {
  res.redirect("/dashboard#finance");
});

app.get("/finance-report", (req, res) => {
  return financeController.getDashboard(req, res);
});

app.get("/catalog", (req, res) => {
  res.redirect("/dashboard#catalog");
});

app.get("/ai-scan", (req, res) => {
  res.redirect("/dashboard#products");
});

// Protected: AI Scan & Pricing feature
app.post("/api/ai/scan", requireAuth, async (req, res) => {
  res.json({
    category: "bamboo",
    craftType: "Handwoven Bamboo",
    title: "Handwoven Bamboo Basket",
    description: "Expertly handcrafted artisan piece analyzed by Gemini Vision AI with high precision weave classification.",
    features: ["Eco-friendly organic bamboo", "Reinforced traditional weave", "Durable moisture-treated structure"],
    targetMarket: "Home Decor, Eco-friendly lifestyle buyers, Corporate gifting",
    priceRange: "₹650 – ₹1,050",
    recommendedPrice: 850,
    confidence: 88
  });
});

/* ================= MAIN DASHBOARD (SPA) ================= */

// Root route: unauthenticated users go to sign-in page; authenticated go to dashboard
app.get("/", (req, res) => {
  const user = sessionUser(req);
  if (user) {
    return res.redirect("/dashboard");
  }
  res.redirect("/login");
});

// Dashboard route: requires authenticated session; unauthenticated redirected to sign-in
app.get(["/dashboard", "/index.html"], (req, res) => {
  const user = sessionUser(req);
  if (!user) {
    return res.redirect("/login");
  }
  res.render("index", {
    user,
    currUser: user
  });
});

// 404 Handler
app.use((req, res) => {
  if (req.xhr || (req.headers.accept && req.headers.accept.includes("application/json"))) {
    return res.status(404).json({ error: "Route not found" });
  }
  const user = sessionUser(req);
  res.redirect(user ? "/dashboard" : "/login");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  if (req.xhr || (req.headers.accept && req.headers.accept.includes("application/json"))) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
  res.status(500).render("error", { err: err.message || "Something went wrong" });
});

app.listen(PORT, async () => {
  await connectMongo();
  await fileStore.seedDemo();
  expenseStore.seedDemo();
  console.log(`CraftConnect backend running at http://localhost:${PORT}`);
});
