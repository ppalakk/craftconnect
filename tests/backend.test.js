const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// Ensure test port to prevent collision
process.env.PORT = process.env.PORT || '3001';

const { app, server } = require('../app');
const userStore = require('../lib/userStore');
const expenseStore = require('../lib/expenseStore');
const connectionStore = require('../lib/connectionStore');
const placesService = require('../services/placesService');
const eventsService = require('../services/eventsService');
const marketplacesService = require('../services/marketplacesService');

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const port = address ? address.port : 3000;
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          json
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      if (typeof options.body === 'object') {
        req.write(JSON.stringify(options.body));
      } else {
        req.write(options.body);
      }
    }
    req.end();
  });
}

describe('CraftConnect Cloud Deployment & Backend Test Suite', () => {

  before(async () => {
    if (!server.listening) {
      await new Promise((resolve) => server.once('listening', resolve));
    }
  });

  after(() => {
    if (server && server.close) {
      server.close();
    }
  });

  /* ================= 1. SERVER & HEALTH CHECK ================= */
  describe('1. Server Infrastructure & Health Checks', () => {
    test('GET /health returns 200 with server status', async () => {
      const res = await makeRequest('/health');
      assert.equal(res.statusCode, 200);
      assert.ok(res.json);
      assert.equal(res.json.status, 'ok');
      assert.equal(res.json.app, 'CraftConnect');
      assert.ok(res.json.timestamp);
    });

    test('404 fallback returns appropriate response', async () => {
      const res = await makeRequest('/non-existent-route-for-testing', {
        headers: { 'Accept': 'application/json' }
      });
      assert.equal(res.statusCode, 404);
      assert.ok(res.json);
      assert.equal(res.json.error, 'Route not found');
    });
  });

  /* ================= 2. VIEW TEMPLATES LOOKUP ================= */
  describe('2. EJS Template Integrity & Route Rendering', () => {
    const viewsToCheck = [
      'index.ejs',
      'error.ejs',
      'finance.ejs',
      'users/login.ejs',
      'users/register.ejs',
      'dashboard/markets.ejs'
    ];

    viewsToCheck.forEach(viewFile => {
      test(`View file exists on disk: views/${viewFile}`, () => {
        const fullPath = path.join(__dirname, '..', 'views', viewFile);
        assert.ok(fs.existsSync(fullPath), `Missing required view: ${viewFile}`);
      });
    });

    test('GET /login renders login page HTML (200)', async () => {
      const res = await makeRequest('/login');
      assert.equal(res.statusCode, 200);
      assert.ok(res.body.includes('Sign In'));
      assert.ok(res.body.includes('CraftConnect'));
    });

    test('GET /register renders registration page HTML (200)', async () => {
      const res = await makeRequest('/register');
      assert.equal(res.statusCode, 200);
      assert.ok(res.body.includes('Create Account'));
    });

    test('GET /markets renders markets discovery page (200)', async () => {
      const res = await makeRequest('/markets');
      assert.equal(res.statusCode, 200);
      assert.ok(res.body.includes('Markets & Discovery'));
    });

    test('GET /finance-report returns finance data without view lookup error (200)', async () => {
      const res = await makeRequest('/finance-report', {
        headers: { 'Accept': 'application/json' }
      });
      assert.equal(res.statusCode, 200);
      assert.ok(res.json);
      assert.ok(res.json.ok);
      assert.ok('grossRevenue' in res.json);
      assert.ok('netProfit' in res.json);
    });
  });

  /* ================= 3. AUTHENTICATION & SESSIONS ================= */
  describe('3. Authentication & User Management', () => {
    const testEmail = `test_artisan_${Date.now()}@example.com`;
    const testPhone = `98765${Math.floor(10000 + Math.random() * 90000)}`;

    test('Quick demo login (/auth/demo) issues session cookie', async () => {
      const res = await makeRequest('/auth/demo?role=artisan', {
        headers: { 'Accept': 'application/json' }
      });
      assert.equal(res.statusCode, 200);
      assert.ok(res.json);
      assert.equal(res.json.ok, true);
      assert.equal(res.json.user.role, 'artisan');
      assert.ok(res.headers['set-cookie'], 'Session cookie should be set');
    });

    test('Demo login works for all roles (supplier & buyer)', async () => {
      const resSupplier = await makeRequest('/auth/demo?role=supplier', {
        headers: { 'Accept': 'application/json' }
      });
      assert.equal(resSupplier.statusCode, 200);
      assert.equal(resSupplier.json.user.role, 'supplier');

      const resBuyer = await makeRequest('/auth/demo?role=buyer', {
        headers: { 'Accept': 'application/json' }
      });
      assert.equal(resBuyer.statusCode, 200);
      assert.equal(resBuyer.json.user.role, 'buyer');
    });

    test('POST /login rejects missing credentials', async () => {
      const res = await makeRequest('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: { email: '', password: '' }
      });
      assert.equal(res.statusCode, 400);
      assert.equal(res.json.ok, false);
    });

    test('POST /login rejects incorrect password', async () => {
      const res = await makeRequest('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: { email: 'sita@artisan.com', password: 'wrongpassword' }
      });
      assert.equal(res.statusCode, 401);
      assert.equal(res.json.ok, false);
    });

    test('POST /register rejects mismatched passwords', async () => {
      const res = await makeRequest('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: {
          name: 'Test Artisan',
          email: testEmail,
          phone: testPhone,
          password: 'password123',
          confirmPassword: 'differentpassword'
        }
      });
      assert.equal(res.statusCode, 400);
      assert.equal(res.json.ok, false);
    });

    test('POST /register successfully registers new user', async () => {
      const res = await makeRequest('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: {
          name: 'Pooja Devi',
          email: testEmail,
          phone: testPhone,
          craft: 'pottery',
          state: 'Rajasthan',
          password: 'securepass123',
          confirmPassword: 'securepass123'
        }
      });
      assert.equal(res.statusCode, 201);
      assert.equal(res.json.ok, true);
      assert.equal(res.json.user.email, testEmail);
    });

    test('POST /register blocks duplicate email', async () => {
      const res = await makeRequest('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: {
          name: 'Duplicate Artisan',
          email: testEmail,
          phone: '9123456789',
          password: 'securepass123',
          confirmPassword: 'securepass123'
        }
      });
      assert.equal(res.statusCode, 409);
      assert.equal(res.json.ok, false);
    });

    test('GET /api/session.js serves client user script', async () => {
      const res = await makeRequest('/api/session.js');
      assert.equal(res.statusCode, 200);
      assert.ok(res.body.includes('window.CC_USER'));
    });
  });

  /* ================= 4. MARKET DISCOVERY API ================= */
  describe('4. Market Discovery, Places & Exhibitions Services', () => {
    test('GET /api/markets returns combined local and digital markets', async () => {
      const res = await makeRequest('/api/markets?city=Bhopal&category=all');
      assert.equal(res.statusCode, 200);
      assert.ok(res.json.ok);
      assert.ok(Array.isArray(res.json.localMarkets));
      assert.ok(Array.isArray(res.json.events));
      assert.ok(Array.isArray(res.json.digitalMarkets));
    });

    test('GET /api/markets/nearby returns nearby stores', async () => {
      const res = await makeRequest('/api/markets/nearby?lat=23.2599&lng=77.4126&radius=25');
      assert.equal(res.statusCode, 200);
      assert.ok(res.json.ok);
      assert.ok(Array.isArray(res.json.places));
    });

    test('GET /api/markets/events returns verified craft exhibitions', async () => {
      const res = await makeRequest('/api/markets/events');
      assert.equal(res.statusCode, 200);
      assert.ok(res.json.ok);
      assert.ok(Array.isArray(res.json.events));
      assert.ok(res.json.events.length > 0);
    });

    test('GET /api/markets/platforms returns digital selling recommendations', async () => {
      const res = await makeRequest('/api/markets/platforms?category=pottery');
      assert.equal(res.statusCode, 200);
      assert.ok(Array.isArray(res.json));
      assert.ok(res.json.some(p => p.id === 'amazon-karigar'));
    });
  });

  /* ================= 5. EXPENSE MANAGEMENT ================= */
  describe('5. Expense Store & Financial API', () => {
    test('GET /api/expenses returns user expenses', async () => {
      const res = await makeRequest('/api/expenses');
      assert.equal(res.statusCode, 200);
      assert.ok(res.json.ok);
      assert.ok(Array.isArray(res.json.expenses));
    });

    test('POST /api/expenses blocks unauthenticated requests (401)', async () => {
      const res = await makeRequest('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: { category: 'raw_materials', amount: 500, description: 'Clay' }
      });
      assert.equal(res.statusCode, 401);
      assert.equal(res.json.ok, false);
    });

    test('Direct expenseStore CRUD operations function reliably', () => {
      const testUserId = 'test_user_unit';
      const created = expenseStore.create(testUserId, {
        category: 'raw_materials',
        amount: 750,
        description: 'Seasoned cane stock'
      });
      assert.ok(created.id);
      assert.equal(created.amount, 750);

      const updated = expenseStore.update(testUserId, created.id, {
        amount: 850
      });
      assert.equal(updated.amount, 850);

      const removed = expenseStore.remove(testUserId, created.id);
      assert.equal(removed, true);
    });
  });

  /* ================= 6. DEMAND INSIGHTS & AI SCAN ================= */
  describe('6. Demand Intelligence & AI Integrations', () => {
    test('GET /api/insights returns categorized demand intelligence', async () => {
      const res = await makeRequest('/api/insights');
      assert.equal(res.statusCode, 200);
      assert.ok(res.json.ok);
      assert.ok(res.json.data.overviewCards);
      assert.ok(res.json.data.trendingRightNow);
    });

    test('GET /api/weather returns weather forecast for location', async () => {
      const res = await makeRequest('/api/weather?city=Jaipur');
      assert.equal(res.statusCode, 200);
      assert.equal(res.json.city, 'Jaipur');
      assert.ok(res.json.temp);
    });
  });

  /* ================= 7. SECURITY & SECRETS AUDIT ================= */
  describe('7. Security, Credentials & Git Protection', () => {
    test('.gitignore excludes .env file', () => {
      const gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8');
      assert.ok(gitignore.includes('.env'), '.gitignore must exclude .env');
    });

    test('.gitignore excludes node_modules', () => {
      const gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8');
      assert.ok(gitignore.includes('node_modules/'), '.gitignore must exclude node_modules');
    });

    test('.env.example template exists without real credentials', () => {
      const envExamplePath = path.join(__dirname, '..', '.env.example');
      assert.ok(fs.existsSync(envExamplePath), '.env.example should exist');
      const content = fs.readFileSync(envExamplePath, 'utf8');
      assert.ok(!content.includes('mongodb+srv://user:pass@'), 'Template must not contain real credentials');
      assert.ok(content.includes('PORT='), 'Template should list PORT');
      assert.ok(content.includes('ATLASDB_URL='), 'Template should list ATLASDB_URL');
      assert.ok(content.includes('CLOUD_NAME='), 'Template should list CLOUD_NAME');
    });
  });
});
