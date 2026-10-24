const express = require("express");
const router = express.Router();
const { sessionUser } = require("../middleware/auth");
const financeController = require("../controllers/financeController");
const marketController = require("../controllers/marketController");

/* ============ Root & Dashboard ============ */

// GET / — redirect to dashboard (auth) or login (guest)
router.get("/", (req, res) => {
  const user = sessionUser(req);
  if (user) {
    return res.redirect("/dashboard");
  }
  res.redirect("/login");
});

// GET /dashboard — main SPA dashboard (requires session)
router.get(["/dashboard", "/index.html"], (req, res) => {
  const user = sessionUser(req);
  if (!user) {
    return res.redirect("/login");
  }
  res.render("index", {
    user,
    currUser: user,
  });
});

/* ============ Page Shortcuts ============ */

// GET /markets — markets discovery page
router.get("/markets", (req, res) => {
  const user = sessionUser(req);
  res.render("dashboard/markets", { user, currUser: user });
});

// GET /finance — redirect to dashboard finance tab
router.get("/finance", (req, res) => {
  res.redirect("/dashboard#finance");
});

// GET /finance-report — full finance report page
router.get("/finance-report", (req, res) => {
  return financeController.getDashboard(req, res);
});

// GET /catalog — redirect to dashboard catalog tab
router.get("/catalog", (req, res) => {
  res.redirect("/dashboard#catalog");
});

// GET /ai-scan — redirect to dashboard products tab
router.get("/ai-scan", (req, res) => {
  res.redirect("/dashboard#products");
});

// Backwards-compatible: GET /api/digital-markets
router.get("/api/digital-markets", marketController.getDigitalMarkets);

module.exports = router;
