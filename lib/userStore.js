const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");

const DATA_PATH = path.join(__dirname, "..", "data", "users.json");

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

function writeAll(users) {
  ensureFile();
  fs.writeFileSync(DATA_PATH, JSON.stringify(users, null, 2), "utf8");
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    craft: user.craft,
    state: user.state,
    role: user.role,
    avatar: user.avatar || null
  };
}

function updateUserAvatar(id, avatar) {
  const users = readAll();
  const idx = users.findIndex((u) => u.id === id);
  if (idx !== -1) {
    users[idx].avatar = avatar || null;
    writeAll(users);
    return publicUser(users[idx]);
  }
  return null;
}

async function findByEmail(email) {
  const users = readAll();
  return users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase()) || null;
}

async function findByEmailOrPhone(identifier) {
  if (!identifier) return null;
  const users = readAll();
  const clean = String(identifier).trim().toLowerCase();
  const digitsOnly = clean.replace(/\D/g, "");

  return (
    users.find((u) => {
      const emailMatches = u.email && u.email.toLowerCase() === clean;
      const phoneClean = u.phone ? String(u.phone).replace(/\D/g, "") : "";
      const phoneMatches = digitsOnly.length >= 8 && phoneClean.includes(digitsOnly);
      return emailMatches || phoneMatches;
    }) || null
  );
}

async function createUser(payload) {
  const users = readAll();
  const emailClean = String(payload.email || "").trim().toLowerCase();
  const phoneDigits = String(payload.phone || "").replace(/\D/g, "");

  if (users.some((u) => u.email.toLowerCase() === emailClean)) {
    const err = new Error("An account with this email is already registered.");
    err.code = "DUP_EMAIL";
    throw err;
  }

  if (phoneDigits && phoneDigits.length >= 10 && users.some((u) => u.phone && String(u.phone).replace(/\D/g, "") === phoneDigits)) {
    const err = new Error("An account with this phone number is already registered.");
    err.code = "DUP_PHONE";
    throw err;
  }

  const user = {
    id: "usr_" + Date.now(),
    name: payload.name.trim(),
    email: emailClean,
    phone: payload.phone.trim(),
    craft: payload.craft || "handicraft",
    state: payload.state || "Rajasthan",
    role: payload.role || "artisan",
    password: await bcrypt.hash(payload.password, 10),
    createdAt: new Date().toISOString()
  };
  users.push(user);
  writeAll(users);
  return user;
}

async function verifyPassword(user, password) {
  if (!user || !user.password) return false;
  return bcrypt.compare(password, user.password);
}

async function seedDemo() {
  const sita = await findByEmail("sita@artisan.com");
  if (!sita) {
    await createUser({
      name: "Sita Devi",
      email: "sita@artisan.com",
      phone: "9876543210",
      craft: "handicraft",
      state: "Rajasthan",
      role: "artisan",
      password: "craft123"
    });
  }

  const rajesh = await findByEmail("rajesh@supplier.com");
  if (!rajesh) {
    await createUser({
      name: "Rajesh Patel",
      email: "rajesh@supplier.com",
      phone: "9876543211",
      craft: "raw_materials",
      state: "Gujarat",
      role: "supplier",
      password: "craft123"
    });
  }

  const priya = await findByEmail("priya@buyer.com");
  if (!priya) {
    await createUser({
      name: "Priya Sharma",
      email: "priya@buyer.com",
      phone: "9876543212",
      craft: "curator",
      state: "Delhi",
      role: "buyer",
      password: "craft123"
    });
  }
}

module.exports = {
  publicUser,
  findByEmail,
  findByEmailOrPhone,
  createUser,
  verifyPassword,
  seedDemo,
  updateUserAvatar
};
