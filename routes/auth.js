const express = require("express");
const router = express.Router();
const User = require("../models/User");
const fileStore = require("../lib/userStore");
const { sessionUser } = require("../middleware/auth");

// GET /login
router.get("/login", (req, res) => {
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
    redirect: req.query.redirect || "",
  });
});

// GET /register
router.get("/register", (req, res) => {
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
    redirect: req.query.redirect || "",
  });
});

// POST /login
router.post("/login", async (req, res) => {
  const { email, password, role, redirect } = req.body;
  const redirectUrl = redirect && redirect.startsWith("/") ? redirect : "/dashboard";
  const isJson =
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes("application/json")) ||
    req.is("json");

  if (!email || !password) {
    const msg = "Please enter both email/phone and password.";
    if (isJson) return res.status(400).json({ ok: false, error: msg });
    return res.redirect(
      `/login?error=${encodeURIComponent(msg)}&redirect=${encodeURIComponent(redirectUrl)}&role=${encodeURIComponent(role || "artisan")}`
    );
  }

  try {
    let authenticatedUser = null;
    const cleanId = String(email).trim();
    const mongoose = require("mongoose");

    // Try MongoDB first
    if (mongoose.connection.readyState === 1) {
      const userDoc = await User.findOne({
        $or: [{ email: cleanId.toLowerCase() }, { phone: cleanId }],
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
            role: role || userDoc.role || "artisan",
          };
        }
      }
    }

    // Fallback to local file store
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
      return res.redirect(
        `/login?error=${encodeURIComponent(msg)}&redirect=${encodeURIComponent(redirectUrl)}&role=${encodeURIComponent(role || "artisan")}`
      );
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

// POST /register
router.post("/register", async (req, res) => {
  const isJson =
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes("application/json")) ||
    req.is("json");
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
    role: role || "artisan",
  };

  try {
    let createdUser = null;
    const mongoose = require("mongoose");

    if (mongoose.connection.readyState === 1) {
      const existing = await User.findOne({
        $or: [{ email: payload.email }, { phone: payload.phone }],
      });
      if (existing) {
        const msg =
          existing.email === payload.email
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
        role: doc.role,
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
router.all(["/auth/demo", "/api/auth/demo-login"], async (req, res) => {
  const role = (req.body && req.body.role) || (req.query && req.query.role) || "artisan";
  let targetEmail = "sita@artisan.com";
  if (role === "supplier") targetEmail = "rajesh@supplier.com";
  if (role === "buyer") targetEmail = "priya@buyer.com";

  let userObj = null;
  const mongoose = require("mongoose");

  if (mongoose.connection.readyState === 1) {
    const userDoc = await User.findOne({ email: targetEmail });
    if (userDoc) {
      userObj = {
        id: String(userDoc._id),
        name: userDoc.name,
        email: userDoc.email,
        phone: userDoc.phone,
        craft: userDoc.craft,
        state: userDoc.state,
        role: userDoc.role,
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
      role: role,
    };
  }

  req.session.user = userObj;
  req.flash("success", `Signed in as Demo ${userObj.role.toUpperCase()}: ${userObj.name}`);

  const redirectUrl = (req.body && req.body.redirect) || (req.query && req.query.redirect) || "/dashboard";
  const isJson =
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes("application/json")) ||
    req.is("json");

  if (isJson) {
    return res.json({ ok: true, user: userObj, redirect: redirectUrl });
  }
  res.redirect(redirectUrl);
});

// Logout
router.all("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    const isJson =
      req.xhr || (req.headers.accept && req.headers.accept.includes("application/json"));
    if (isJson) {
      return res.json({ ok: true, message: "Logged out successfully" });
    }
    res.redirect("/login?success=" + encodeURIComponent("You have signed out successfully."));
  });
});

// Google OAuth placeholder
router.get("/auth/google", (req, res) => {
  res.redirect(
    "/login?error=" + encodeURIComponent("Google sign-in is disabled in local mode. Please use email/phone login.")
  );
});

// Forgot password placeholder
router.get("/forgot-password", (req, res) => {
  res.render("users/login", {
    error: "Password reset is not available in offline mode. Please create a new account if needed.",
    success: null,
    role: "artisan",
    redirect: "",
  });
});

module.exports = router;
