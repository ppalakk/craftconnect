const express = require("express");
const router = express.Router();
const multer = require("multer");
const { cloudinary, storage } = require("../cloudConfig");
const upload = multer({ storage });
const Product = require("../models/Product");

// GET /products — list all products (or redirect/JSON)
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    if (req.xhr || (req.headers.accept && req.headers.accept.includes("application/json"))) {
      return res.json({ ok: true, products });
    }
    res.redirect("/catalog");
  } catch (error) {
    console.error("Error fetching products:", error);
    res.redirect("/dashboard");
  }
});

// Middleware to accept either upload.single("image") or upload.single("product[image]")
const uploadSingleProductImage = (req, res, next) => {
  const uploadFields = upload.fields([
    { name: "image", maxCount: 1 },
    { name: "product[image]", maxCount: 1 }
  ]);
  uploadFields(req, res, (err) => {
    if (err) return next(err);
    if (req.files) {
      req.file = (req.files["image"] && req.files["image"][0]) ||
                 (req.files["product[image]"] && req.files["product[image]"][0]) ||
                 null;
    }
    next();
  });
};

// POST /products — create a new product with Cloudinary image upload & MongoDB Atlas storage
router.post("/", uploadSingleProductImage, async (req, res) => {
  try {
    const rawData = req.body.product || req.body || {};
    const title = rawData.title || rawData.name || "Handcrafted Artisan Product";
    const category = rawData.category || "Handicraft";
    const description = rawData.description || "Authentic handcrafted piece made with sustainable materials.";
    const sellingPrice = Number(rawData.sellingPrice || rawData.price || 500);
    const costPrice = Number(rawData.costPrice || (sellingPrice * 0.6) || 300);
    const stock = Number(rawData.stock || 1);

    const newProduct = new Product({
      title,
      category,
      description,
      sellingPrice,
      costPrice,
      stock,
      features: Array.isArray(rawData.features) ? rawData.features : ["Handcrafted", "Eco-Friendly"],
    });

    if (req.file) {
      const url = req.file.path || req.file.secure_url;
      const filename = req.file.filename || req.file.public_id;
      newProduct.image = { url, filename };
      newProduct.imageUrl = url;
    }

    if (req.session && req.session.user && req.session.user.id) {
      newProduct.artisanId = req.session.user.id;
    }

    await newProduct.save();

    req.flash("success", "New artisan product added successfully!");
    if (req.xhr || (req.headers.accept && req.headers.accept.includes("application/json"))) {
      return res.status(201).json({ ok: true, product: newProduct });
    }
    res.redirect("/dashboard#catalog");
  } catch (error) {
    console.error("Product creation error:", error);
    req.flash("error", "Failed to create product: " + error.message);
    if (req.xhr || (req.headers.accept && req.headers.accept.includes("application/json"))) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    res.redirect("/dashboard");
  }
});

module.exports = router;
