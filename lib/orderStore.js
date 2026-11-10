const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Order = require("../models/Order");

const DATA_PATH = path.join(__dirname, "..", "data", "orders.json");

function ensureFile() {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, "[]", "utf8");
  }
}

function readAll() {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  } catch {
    return [];
  }
}

function writeAll(orders) {
  ensureFile();
  fs.writeFileSync(DATA_PATH, JSON.stringify(orders, null, 2), "utf8");
}

const DEFAULT_ORDERS_SEED = [
  {
    orderId: "ord_001",
    id: "ord_001",
    buyer: {
      name: "Meena Sharma",
      location: "📍 Jaipur, Rajasthan",
      phone: "+91 98290 11223",
      email: "meena.sharma@example.com",
    },
    item: "Handwoven Bamboo Storage Basket (×2)",
    amount: 1500,
    qty: 2,
    productId: "prod_bamboo_basket",
    productImage: "/public/images/hero_crafts.jpg",
    date: "2026-10-01",
    status: "pending",
    artisanEmail: "sita@artisan.com",
    shippingAddress: "Flat 402, Royal Palms, C-Scheme, Jaipur, Rajasthan - 302001",
  },
  {
    orderId: "ord_002",
    id: "ord_002",
    buyer: {
      name: "Rajiv Exports Pvt. Ltd.",
      location: "📍 Mumbai, Maharashtra",
      phone: "+91 98200 44556",
      email: "procurement@rajivexports.in",
    },
    item: "Indigo Block-Printed Dupatta (×5)",
    amount: 6250,
    qty: 5,
    productId: "prod_indigo_stole",
    productImage: "/public/images/store_craft_bazaar.jpg",
    date: "2026-09-30",
    status: "pending",
    artisanEmail: "sita@artisan.com",
    shippingAddress: "Warehouse 12, Kalpataru Industrial Park, Andheri East, Mumbai, Maharashtra - 400069",
  },
  {
    orderId: "ord_003",
    id: "ord_003",
    buyer: {
      name: "Ananya Mehta",
      location: "📍 Bengaluru, Karnataka",
      phone: "+91 98450 77889",
      email: "ananya.m@example.com",
    },
    item: "Terracotta Diya & Urli Set (×3)",
    amount: 1260,
    qty: 3,
    productId: "prod_terracotta_diya",
    productImage: "/public/images/hero_pots.jpg",
    date: "2026-10-01",
    status: "dispatched",
    artisanEmail: "sita@artisan.com",
    shippingAddress: "77/4 12th Main, Indiranagar, Bengaluru, Karnataka - 560038",
  },
  {
    orderId: "ord_004",
    id: "ord_004",
    buyer: {
      name: "Dilli Haat Curator",
      location: "📍 New Delhi",
      phone: "+91 98100 22334",
      email: "crafts@dillihaat.org",
    },
    item: "Sheesham Wood Coasters — Set of 6 (×4)",
    amount: 2320,
    qty: 4,
    productId: "prod_wood_coasters",
    productImage: "/public/images/store_artisan_hub.jpg",
    date: "2026-09-28",
    status: "dispatched",
    artisanEmail: "sita@artisan.com",
    shippingAddress: "Craft Pavilion Stall 14, INA Dilli Haat, New Delhi - 110023",
  },
  {
    orderId: "ord_005",
    id: "ord_005",
    buyer: {
      name: "Eco Home Decor Studio",
      location: "📍 Pune, Maharashtra",
      phone: "+91 98220 99887",
      email: "hello@ecohomedecor.in",
    },
    item: "Handwoven Bamboo Storage Basket (×1)",
    amount: 750,
    qty: 1,
    productId: "prod_bamboo_basket",
    productImage: "/public/images/hero_crafts.jpg",
    date: "2026-09-26",
    status: "dispatched",
    artisanEmail: "sita@artisan.com",
    shippingAddress: "Shop 5, Koregaon Park Road, Pune, Maharashtra - 411001",
  },
  {
    orderId: "ord_006",
    id: "ord_006",
    buyer: {
      name: "FabIndia Curator",
      location: "📍 New Delhi",
      phone: "+91 98110 33445",
      email: "sourcing@fabindia.net",
    },
    item: "Sheesham Wood Coasters — Set of 6 (×2)",
    amount: 1160,
    qty: 2,
    productId: "prod_wood_coasters",
    productImage: "/public/images/store_artisan_hub.jpg",
    date: "2026-09-22",
    status: "dispatched",
    artisanEmail: "sita@artisan.com",
    shippingAddress: "B-28 Okhla Phase 1, New Delhi - 110020",
  },
  {
    orderId: "ord_007",
    id: "ord_007",
    buyer: {
      name: "Heritage Handlooms Guild",
      location: "📍 Kolkata, West Bengal",
      phone: "+91 98300 55667",
      email: "info@heritagehandlooms.org",
    },
    item: "Indigo Block-Printed Dupatta (×2)",
    amount: 2500,
    qty: 2,
    productId: "prod_indigo_stole",
    productImage: "/public/images/store_craft_bazaar.jpg",
    date: "2026-09-18",
    status: "dispatched",
    artisanEmail: "sita@artisan.com",
    shippingAddress: "14 Park Street, Kolkata, West Bengal - 700016",
  },
  {
    orderId: "ord_008",
    id: "ord_008",
    buyer: {
      name: "Kaveri Living Boutique",
      location: "📍 Chennai, Tamil Nadu",
      phone: "+91 98400 11998",
      email: "store@kaveriliving.com",
    },
    item: "Handwoven Bamboo Storage Basket (×3)",
    amount: 2250,
    qty: 3,
    productId: "prod_bamboo_basket",
    productImage: "/public/images/hero_crafts.jpg",
    date: "2026-09-12",
    status: "dispatched",
    artisanEmail: "sita@artisan.com",
    shippingAddress: "22 TTK Road, Alwarpet, Chennai, Tamil Nadu - 600018",
  },
  {
    orderId: "ord_009",
    id: "ord_009",
    buyer: {
      name: "Diwali Decor Emporium",
      location: "📍 Ahmedabad, Gujarat",
      phone: "+91 98250 88776",
      email: "sales@diwalidecor.in",
    },
    item: "Terracotta Diya & Urli Set (×5)",
    amount: 2100,
    qty: 5,
    productId: "prod_terracotta_diya",
    productImage: "/public/images/hero_pots.jpg",
    date: "2026-08-25",
    status: "dispatched",
    artisanEmail: "sita@artisan.com",
    shippingAddress: "CG Road, Navrangpura, Ahmedabad, Gujarat - 380009",
  },
  {
    orderId: "ord_010",
    id: "ord_010",
    buyer: {
      name: "Artisan Co-op Central",
      location: "📍 Jaipur, Rajasthan",
      phone: "+91 98290 66554",
      email: "support@artisancoop.in",
    },
    item: "Sheesham Wood Coasters — Set of 6 (×3)",
    amount: 1740,
    qty: 3,
    productId: "prod_wood_coasters",
    productImage: "/public/images/store_artisan_hub.jpg",
    date: "2026-08-14",
    status: "dispatched",
    artisanEmail: "sita@artisan.com",
    shippingAddress: "Bapu Bazaar, Old City, Jaipur, Rajasthan - 302003",
  },
  {
    orderId: "ord_011",
    id: "ord_011",
    buyer: {
      name: "Global Craft Exports",
      location: "📍 Mumbai, Maharashtra",
      phone: "+91 98201 33221",
      email: "orders@globalcraftexports.com",
    },
    item: "Indigo Block-Printed Dupatta (×4)",
    amount: 5000,
    qty: 4,
    productId: "prod_indigo_stole",
    productImage: "/public/images/store_craft_bazaar.jpg",
    date: "2026-05-20",
    status: "dispatched",
    artisanEmail: "sita@artisan.com",
    shippingAddress: "Nariman Point Business Hub, Mumbai, Maharashtra - 400021",
  },
  {
    orderId: "ord_012",
    id: "ord_012",
    buyer: {
      name: "Sanskriti Handcrafts",
      location: "📍 Hyderabad, Telangana",
      phone: "+91 98490 55443",
      email: "contact@sanskritihandcrafts.in",
    },
    item: "Handwoven Bamboo Storage Basket (×4)",
    amount: 3000,
    qty: 4,
    productId: "prod_bamboo_basket",
    productImage: "/public/images/hero_crafts.jpg",
    date: "2025-10-15",
    status: "dispatched",
    artisanEmail: "sita@artisan.com",
    shippingAddress: "Banjara Hills Road No. 12, Hyderabad, Telangana - 500034",
  },
];

async function seedDemoOrders(artisanId = null, artisanEmail = "sita@artisan.com") {
  // 1. Ensure file store has seeds
  const localOrders = readAll();
  if (!localOrders || localOrders.length === 0) {
    const prepared = DEFAULT_ORDERS_SEED.map((o) => ({
      ...o,
      artisanId: artisanId || "usr_1790788468698",
      artisanEmail: artisanEmail.toLowerCase(),
      createdAt: new Date().toISOString(),
    }));
    writeAll(prepared);
  }

  // 2. If MongoDB Atlas is connected, seed Atlas collection
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      const count = await Order.countDocuments({
        $or: [
          { artisanEmail: artisanEmail.toLowerCase() },
          { artisanEmail: "sita@artisan.com" },
        ],
      });
      if (count === 0) {
        const mongoSeeds = DEFAULT_ORDERS_SEED.map((o) => ({
          orderId: o.orderId,
          artisanId: artisanId || null,
          artisanEmail: artisanEmail.toLowerCase(),
          buyer: o.buyer,
          item: o.item,
          productId: o.productId,
          productImage: o.productImage,
          qty: o.qty,
          amount: o.amount,
          date: o.date,
          status: o.status,
          shippingAddress: o.shippingAddress,
          paymentStatus: "paid",
        }));
        await Order.insertMany(mongoSeeds, { ordered: false });
        console.log("✅ Seeded default demo orders in MongoDB Atlas for", artisanEmail);
      }
    } catch (err) {
      console.warn("⚠️  Order seeding notice (Mongo):", err.message);
    }
  }
}

function normalizeOrder(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  const buyerObj = o.buyer || {};
  return {
    id: o.orderId || o.id || (o._id ? String(o._id) : ""),
    orderId: o.orderId || o.id || (o._id ? String(o._id) : ""),
    buyer: typeof buyerObj === "string" ? buyerObj : (buyerObj.name || "Buyer"),
    buyerDetails: typeof buyerObj === "object" ? buyerObj : { name: buyerObj },
    location: buyerObj.location || o.location || "📍 Local Haat / Verified Buyer",
    item: o.item || "Handicraft Item",
    productName: o.item || "Handicraft Item",
    productId: o.productId || "",
    productImage: o.productImage || "/public/images/hero_crafts.jpg",
    amount: Number(o.amount) || 0,
    qty: Number(o.qty) || 1,
    date: o.date || (o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : "2026-10-01"),
    status: o.status || "pending",
    artisanEmail: o.artisanEmail || "",
    artisanId: o.artisanId || null,
    shippingAddress: o.shippingAddress || "",
    paymentStatus: o.paymentStatus || "paid",
  };
}

async function getOrdersForUser(user, filterStatus = "all") {
  const userEmail = (user && user.email) ? user.email.toLowerCase() : "sita@artisan.com";
  const userId = user && (user.id || user._id);
  const isDemo = !user || ["sita@artisan.com", "rajesh@supplier.com", "priya@buyer.com"].includes(userEmail);

  await seedDemoOrders(userId, userEmail);

  let orders = [];

  // Try MongoDB Atlas first if connected
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      const query = {};
      if (isDemo) {
        query.$or = [
          { artisanEmail: userEmail },
          { artisanEmail: "sita@artisan.com" },
        ];
        if (userId) query.$or.push({ artisanId: userId });
      } else {
        query.$or = [{ artisanEmail: userEmail }];
        if (userId) query.$or.push({ artisanId: userId });
      }

      if (filterStatus && filterStatus !== "all") {
        query.status = filterStatus;
      }

      const docs = await Order.find(query).sort({ createdAt: -1, date: -1 }).lean();
      if (docs && docs.length > 0) {
        orders = docs.map(normalizeOrder);
      }
    } catch (err) {
      console.warn("⚠️  Failed to query MongoDB orders, falling back to local file store:", err.message);
    }
  }

  // Fallback to local file store
  if (!orders || orders.length === 0) {
    const all = readAll();
    let userOrders = all.filter((o) => {
      const oEmail = (o.artisanEmail || "").toLowerCase();
      if (isDemo) {
        return oEmail === userEmail || oEmail === "sita@artisan.com" || !o.artisanEmail;
      }
      return oEmail === userEmail || (userId && o.artisanId === userId);
    });

    if (userOrders.length === 0 && isDemo) {
      userOrders = DEFAULT_ORDERS_SEED;
    }

    if (filterStatus && filterStatus !== "all") {
      userOrders = userOrders.filter((o) => o.status === filterStatus);
    }

    orders = userOrders.map(normalizeOrder);
  }

  // Sort orders: pending first, then by date descending
  orders.sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return new Date(b.date || 0) - new Date(a.date || 0);
  });

  return orders;
}

async function updateOrderStatus(orderId, status = "dispatched", user = null) {
  let updatedOrder = null;

  // 1. Try MongoDB Atlas update
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      const doc = await Order.findOneAndUpdate(
        { $or: [{ orderId }, { _id: mongoose.isValidObjectId(orderId) ? orderId : null }] },
        {
          $set: {
            status,
            dispatchedAt: status === "dispatched" ? new Date() : null,
          },
        },
        { new: true }
      );
      if (doc) {
        updatedOrder = normalizeOrder(doc);
      }
    } catch (err) {
      console.warn("⚠️  Mongo order update error, continuing with file store:", err.message);
    }
  }

  // 2. Update local JSON file store
  const all = readAll();
  const idx = all.findIndex((o) => o.orderId === orderId || o.id === orderId);
  if (idx !== -1) {
    all[idx].status = status;
    all[idx].dispatchedAt = status === "dispatched" ? new Date().toISOString() : null;
    all[idx].updatedAt = new Date().toISOString();
    writeAll(all);
    if (!updatedOrder) {
      updatedOrder = normalizeOrder(all[idx]);
    }
  }

  return updatedOrder || { orderId, id: orderId, status };
}

async function createOrder(orderData, user = null) {
  const newOrderId = orderData.orderId || "ord_" + Date.now();
  const normalized = {
    orderId: newOrderId,
    id: newOrderId,
    artisanId: (user && user.id) || orderData.artisanId || null,
    artisanEmail: ((user && user.email) || orderData.artisanEmail || "sita@artisan.com").toLowerCase(),
    buyer: typeof orderData.buyer === "object" ? orderData.buyer : {
      name: orderData.buyer || "Customer",
      location: orderData.location || "India",
    },
    item: orderData.item || orderData.productName || "Handicraft item",
    productId: orderData.productId || "",
    productImage: orderData.productImage || "/public/images/hero_crafts.jpg",
    qty: Number(orderData.qty) || 1,
    amount: Number(orderData.amount) || 1000,
    date: orderData.date || new Date().toISOString().slice(0, 10),
    status: orderData.status || "pending",
    shippingAddress: orderData.shippingAddress || "",
    paymentStatus: orderData.paymentStatus || "paid",
  };

  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      const doc = await Order.create(normalized);
      return normalizeOrder(doc);
    } catch (err) {
      console.warn("⚠️  Mongo createOrder fallback to file store:", err.message);
    }
  }

  const all = readAll();
  all.unshift(normalized);
  writeAll(all);
  return normalized;
}

module.exports = {
  seedDemoOrders,
  getOrdersForUser,
  updateOrderStatus,
  createOrder,
  DEFAULT_ORDERS_SEED,
};

