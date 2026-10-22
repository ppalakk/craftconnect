const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data", "expenses.json");

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

function writeAll(expenses) {
  ensureFile();
  fs.writeFileSync(DATA_PATH, JSON.stringify(expenses, null, 2), "utf8");
}

const DEFAULT_DEMO_EXPENSES = [
  {
    id: "exp_001",
    category: "raw_materials",
    amount: 1400,
    date: "2026-10-01",
    relatedProduct: "prod_bamboo_basket",
    description: "30 seasoned Assam bamboo poles & natural resin polish",
    createdAt: "2026-10-01T10:00:00.000Z"
  },
  {
    id: "exp_002",
    category: "packaging",
    amount: 450,
    date: "2026-09-29",
    relatedProduct: "all",
    description: "Corrugated shipping boxes & biodegradable bubble wrap (50 pcs)",
    createdAt: "2026-09-29T14:30:00.000Z"
  },
  {
    id: "exp_003",
    category: "labour",
    amount: 800,
    date: "2026-09-27",
    relatedProduct: "prod_wood_coasters",
    description: "Artisan filigree cutwork wage for 10 coaster sets",
    createdAt: "2026-09-27T17:00:00.000Z"
  },
  {
    id: "exp_004",
    category: "shipping",
    amount: 320,
    date: "2026-09-26",
    relatedProduct: "all",
    description: "India Post Speed Post dispatch for Delhi & Pune buyer shipments",
    createdAt: "2026-09-26T11:15:00.000Z"
  },
  {
    id: "exp_005",
    category: "raw_materials",
    amount: 650,
    date: "2026-09-22",
    relatedProduct: "prod_terracotta_diya",
    description: "50kg filtered riverbed clay & organic terracotta pigments",
    createdAt: "2026-09-22T09:40:00.000Z"
  },
  {
    id: "exp_006",
    category: "platform_fees",
    amount: 280,
    date: "2026-09-18",
    relatedProduct: "all",
    description: "ONDC network storefront listing & payment transaction charges",
    createdAt: "2026-09-18T16:20:00.000Z"
  },
  {
    id: "exp_007",
    category: "raw_materials",
    amount: 1800,
    date: "2026-09-10",
    relatedProduct: "prod_indigo_stole",
    description: "Natural vegetable indigo extract & 100% Chanderi handloom fabric rolls",
    createdAt: "2026-09-10T12:00:00.000Z"
  },
  {
    id: "exp_008",
    category: "tools_maintenance",
    amount: 500,
    date: "2026-08-20",
    relatedProduct: "all",
    description: "Carving chisel sharpening & pottery wheel maintenance servicing",
    createdAt: "2026-08-20T15:30:00.000Z"
  },
  {
    id: "exp_009",
    category: "raw_materials",
    amount: 1200,
    date: "2025-10-10",
    relatedProduct: "prod_bamboo_basket",
    description: "Bulk Assam cane stock purchase for winter festive orders",
    createdAt: "2025-10-10T10:00:00.000Z"
  }
];

function seedDemo(userId = "usr_1790788468698") {
  const all = readAll();
  const userExpenses = all.filter((e) => e.userId === userId);
  if (userExpenses.length === 0) {
    const seeded = DEFAULT_DEMO_EXPENSES.map((item) => ({
      ...item,
      userId
    }));
    writeAll([...all, ...seeded]);
  }
}

function getForUser(userId) {
  seedDemo(userId);
  const all = readAll();
  return all.filter((e) => e.userId === userId || !e.userId);
}

function create(userId, payload) {
  const all = readAll();
  const expense = {
    id: "exp_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    userId,
    category: payload.category || "other",
    amount: Number(payload.amount) || 0,
    date: payload.date || new Date().toISOString().slice(0, 10),
    relatedProduct: payload.relatedProduct || "all",
    description: String(payload.description || "").trim(),
    createdAt: new Date().toISOString()
  };
  all.unshift(expense);
  writeAll(all);
  return expense;
}

function update(userId, id, payload) {
  const all = readAll();
  const idx = all.findIndex((e) => e.id === id && (e.userId === userId || !e.userId));
  if (idx === -1) return null;
  const current = all[idx];
  const updated = {
    ...current,
    category: payload.category !== undefined ? payload.category : current.category,
    amount: payload.amount !== undefined ? Number(payload.amount) || 0 : current.amount,
    date: payload.date !== undefined ? payload.date : current.date,
    relatedProduct: payload.relatedProduct !== undefined ? payload.relatedProduct : current.relatedProduct,
    description: payload.description !== undefined ? String(payload.description).trim() : current.description,
    updatedAt: new Date().toISOString()
  };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

function remove(userId, id) {
  const all = readAll();
  const filtered = all.filter((e) => !(e.id === id && (e.userId === userId || !e.userId)));
  const changed = filtered.length !== all.length;
  if (changed) writeAll(filtered);
  return changed;
}

module.exports = {
  getForUser,
  create,
  update,
  remove,
  seedDemo,
  DEFAULT_DEMO_EXPENSES
};
