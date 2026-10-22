const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'connections.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = {};
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

function readAll() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    console.warn("[connectionStore] Failed to parse connections.json:", e.message);
    return {};
  }
}

function writeAll(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

const connectionStore = {
  getForUser(userId) {
    const all = readAll();
    const userConns = all[String(userId)] || {};
    return Object.values(userConns);
  },

  getConnection(userId, platformId) {
    const all = readAll();
    const userConns = all[String(userId)] || {};
    return userConns[platformId] || null;
  },

  upsert(userId, platformId, updateData) {
    const all = readAll();
    const uKey = String(userId);
    if (!all[uKey]) all[uKey] = {};

    const existing = all[uKey][platformId] || {
      userId: uKey,
      platformId,
      platformName: updateData.platformName || platformId,
      status: 'not_started',
      merchantId: null,
      sellerStoreName: null,
      apiConfig: { isAuthorized: false, clientId: null, lastSyncAt: null },
      onboardingNotes: "",
      updatedAt: new Date().toISOString()
    };

    all[uKey][platformId] = {
      ...existing,
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    writeAll(all);
    return all[uKey][platformId];
  },

  remove(userId, platformId) {
    const all = readAll();
    const uKey = String(userId);
    if (all[uKey] && all[uKey][platformId]) {
      delete all[uKey][platformId];
      writeAll(all);
      return true;
    }
    return false;
  }
};

module.exports = connectionStore;
