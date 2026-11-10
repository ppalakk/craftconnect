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
      if (Buffer.isBuffer(options.body)) {
        req.write(options.body);
      } else if (typeof options.body === 'object') {
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

  after(async () => {
    try {
      const mongoose = require('mongoose');
      if (mongoose && mongoose.disconnect) {
        await mongoose.disconnect();
      }
    } catch {}
    if (server && server.close) {
      await new Promise((resolve) => server.close(resolve));
    }
    // Ensure all background driver pools close
    setTimeout(() => {
      process.exit(0);
    }, 200).unref();
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

    test('POST /api/ai/scan blocks unauthenticated requests (401)', async () => {
      const res = await makeRequest('/api/ai/scan', {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      assert.equal(res.statusCode, 401);
      assert.equal(res.json.ok, false);
      assert.ok(res.json.error.includes('Authentication'));
    });

    test('POST /api/ai/scan rejects missing image with 400', async () => {
      // 1. Get authenticated demo cookie
      const authRes = await makeRequest('/auth/demo?role=artisan');
      const cookie = authRes.headers['set-cookie'] ? authRes.headers['set-cookie'][0].split(';')[0] : '';
      assert.ok(cookie);

      // 2. Post without multipart image file
      const boundary = '----WebKitFormBoundaryCraftTest' + Date.now();
      const body = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="notes"\r\n\r\nTest\r\n--${boundary}--\r\n`);
      const res = await makeRequest('/api/ai/scan', {
        method: 'POST',
        headers: {
          'Cookie': cookie,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Accept': 'application/json'
        },
        body
      });
      assert.equal(res.statusCode, 400);
      assert.ok(res.json.error);
    });

    test('POST /api/ai/scan end-to-end analyzes genuine craft image via Express', async (t) => {
      const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
      if (!hasKey) return t.skip('Live GEMINI_API_KEY not configured');

      const fixturePath = path.join(__dirname, 'fixtures', 'bamboo_basket.jpg');
      if (!fs.existsSync(fixturePath)) return t.skip('bamboo_basket.jpg fixture missing');

      // 1. Sign in as demo artisan
      const authRes = await makeRequest('/auth/demo?role=artisan');
      const cookie = authRes.headers['set-cookie'] ? authRes.headers['set-cookie'][0].split(';')[0] : '';
      assert.ok(cookie);

      // 2. Build multipart body with real image
      const imageBytes = fs.readFileSync(fixturePath);
      const boundary = '----WebKitFormBoundaryCraft' + Date.now();
      const pre = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="bamboo_basket.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
      );
      const post = Buffer.from(`\r\n--${boundary}--\r\n`);
      const multipartBody = Buffer.concat([pre, imageBytes, post]);

      const res = await makeRequest('/api/ai/scan', {
        method: 'POST',
        headers: {
          'Cookie': cookie,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Accept': 'application/json'
        },
        body: multipartBody
      });

      // Skip gracefully if rate limited — quota is per-minute; transient
      if (res.statusCode === 429) return t.skip('Gemini rate limit hit — re-run after quota resets');

      assert.equal(res.statusCode, 200, 'AI scan HTTP status must be 200');
      assert.equal(res.json.category, 'Bamboo & Wood', 'Inferred category must be Bamboo & Wood');
      assert.ok(res.json.title && res.json.title.length > 5, 'Must have product title');
      assert.ok(res.json.description && res.json.description.length > 20, 'Must have description');
      assert.ok(Array.isArray(res.json.features) && res.json.features.length > 0, 'Must have visual features');
      assert.ok(res.json.recommendedPrice > 0, 'Must have positive recommended price');
      assert.ok(res.json.confidence >= 50 && res.json.confidence <= 100, 'Confidence must be percentage 50-100');
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
