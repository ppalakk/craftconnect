/* CraftConnect — auth, offline sync, QR, markets, materials, schemes, forum, finance */

const SYNC_KEY = "craftconnect_sync_queue";
const LOG_KEY = "craftconnect_action_log";
const MAT_KEY = "craftconnect_materials";
const FORUM_KEY = "craftconnect_forum";

/**
 * Returns a user-scoped localStorage key for notifications.
 * Each user gets their own inbox — demo notifications won't bleed into new accounts.
 */
function getNotesKey() {
  const user = window.CC_USER;
  const uid = (user && user.id) ? user.id : "guest";
  return "craftconnect_notifications_" + uid;
}

const REGION_MARKETS = {
  rajasthan: [
    { name: "Johari Bazaar Wholesale Lane", type: "Physical wholesale · brass & jewellery spillover", loc: "📍 Jaipur Walled City", match: "96% local" },
    { name: "Sanganer Block-Print Mandi", type: "Cluster co-op · textiles", loc: "📍 Sanganer, Jaipur", match: "91% local" }
  ],
  delhi: [
    { name: "Dilli Haat INA", type: "Retail exhibition", loc: "📍 INA, New Delhi", match: "94% NCR" },
    { name: "Okhla Craft Bazaar", type: "Wholesale exporters", loc: "📍 Okhla, Delhi", match: "88% NCR" }
  ],
  gujarat: [
    { name: "Bhuj Ajrakh Haat", type: "Textile cluster", loc: "📍 Kutch", match: "93% local" },
    { name: "Ahmedabad Law Garden Night Market", type: "Retail + tourist", loc: "📍 Ahmedabad", match: "86% local" }
  ],
  up: [
    { name: "Moradabad Brass Mandi", type: "Metalware wholesale", loc: "📍 Moradabad", match: "95% local" },
    { name: "Varanasi Silk Gali", type: "Handloom wholesale", loc: "📍 Varanasi", match: "90% local" }
  ],
  wb: [
    { name: "Shantiniketan Kantha Bazaar", type: "Textile cluster", loc: "📍 Birbhum", match: "92% local" },
    { name: "College Street Craft Sundays", type: "Urban retail", loc: "📍 Kolkata", match: "84% local" }
  ],
  all: [
    { name: "ONDC National Storefront", type: "Digital pan-India", loc: "🌐 Online", match: "89% digital" }
  ]
};

const DEFAULT_MATERIALS = [
  { id: "mat_1", mode: "buy", title: "Terracotta clay — 50kg pooled bag", qty: 12, price: 420, location: "Jaipur cluster", owner: "Amber Potter Co-op" },
  { id: "mat_2", mode: "buy", title: "Organic indigo dye concentrate", qty: 8, price: 890, location: "Sanganer", owner: "Bagru Weavers" },
  { id: "mat_3", mode: "sell", title: "Brass scrap sheets (food-safe)", qty: 40, price: 310, location: "Moradabad", owner: "Ganga Metal Supply" },
  { id: "mat_4", mode: "sell", title: "Handloom leftover cotton (meters)", qty: 120, price: 95, location: "Bhuj", owner: "Kutch Co-op Lead" }
];

const DEFAULT_FORUM = [
  { id: "f1", tag: "tip", author: "Meera · Gujarat", body: "Sun-dry terracotta overnight before kiln — fewer cracks in humid weeks.", at: Date.now() - 86400000 },
  { id: "f2", tag: "outsource", author: "Ramesh · UP", body: "Need 40 brass diya bases by 12 Oct. Can pay cluster rate. DM if capacity free.", at: Date.now() - 3600000 }
];

let materialMode = "buy";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("storage", e);
  }
}

function artisanSlug() {
  const user = window.CC_USER;
  const name = user && user.name ? user.name : "sita-devi";
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function storefrontUrl() {
  const origin = window.location.origin === "null" ? "https://craftconnect.local" : window.location.origin;
  return `${origin}/dashboard#catalog?artisan=${encodeURIComponent(artisanSlug())}`;
}

async function sharePayload({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
  }
  const packed = [title, text, url].filter(Boolean).join("\n");
  try {
    await navigator.clipboard.writeText(packed);
    alert("Link copied. Paste it in WhatsApp or SMS.");
  } catch {
    prompt("Copy this link:", url || text || title);
  }
}

function logAction(type, detail) {
  const log = readJson(LOG_KEY, []);
  log.unshift({ type, detail, at: Date.now() });
  writeJson(LOG_KEY, log.slice(0, 40));
  renderActionLogs();
}

function renderActionLogs() {
  const log = readJson(LOG_KEY, []);
  const blocks = log.length
    ? log
        .slice(0, 12)
        .map(
          (item) => `
        <div class="memory-item">
            <span class="memory-icon">🕒</span>
            <div>
                <strong>${item.type}</strong>
                <p>${item.detail || ""} · ${new Date(item.at).toLocaleString("en-IN")}</p>
            </div>
        </div>`
        )
        .join("")
    : `<div class="memory-item"><span class="memory-icon">🌱</span><div><strong>No workshop actions yet</strong><p>Add a craft, dispatch an order, or generate a catalog to start memory.</p></div></div>`;

  ["actionLogList"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = blocks;
  });
}

function pushNotification(title, body) {
  const notesKey = getNotesKey();
  const notes = readJson(notesKey, []);
  notes.unshift({ id: "n_" + Date.now(), title, body, at: Date.now(), read: false });
  writeJson(notesKey, notes.slice(0, 30));
  renderNotifications();
}

function seedNotifications() {
  const notesKey = getNotesKey();
  const notes = readJson(notesKey, null);
  // Only seed demo notifications if:
  //   1. This user hasn’t had their notifications initialized yet (null check), AND
  //   2. This is one of the demo accounts (Sita, Rajesh, Priya)
  const demoEmails = ["sita@artisan.com", "rajesh@supplier.com", "priya@buyer.com"];
  const user = window.CC_USER;
  const isDemo = user && demoEmails.includes((user.email || "").toLowerCase());

  if (notes !== null) return; // already initialized for this user

  if (isDemo) {
    // Pre-populate demo buyer notifications only for demo accounts
    writeJson(notesKey, [
      { id: "n1", title: "Buyer inquiry", body: "Meena Sharma asked about bamboo basket lead time.", at: Date.now() - 7200000, read: false },
      { id: "n2", title: "Status update", body: "Rajiv Exports confirmed pickup window for Friday.", at: Date.now() - 5400000, read: false }
    ]);
  } else {
    // New/real users start with an empty notification inbox
    writeJson(notesKey, []);
  }
}

function renderNotifications() {
  const notes = readJson(getNotesKey(), []);
  const unread = notes.filter((n) => !n.read).length;
  const countEl = document.getElementById("notifyCount");
  if (countEl) {
    countEl.innerText = unread;
    countEl.style.display = unread ? "inline-flex" : "none";
  }
  const list = document.getElementById("notificationList");
  if (!list) return;
  list.innerHTML = notes.length
    ? notes
        .map(
          (n) => `
        <article class="notify-item ${n.read ? "read" : ""}">
            <strong>${n.title}</strong>
            <p>${n.body}</p>
            <small>${new Date(n.at).toLocaleString("en-IN")}</small>
        </article>`
        )
        .join("")
    : "<p class='screen-sub'>No notifications yet.</p>";
}

function toggleNotificationDrawer(force) {
  const drawer = document.getElementById("notificationDrawer");
  if (!drawer) return;
  const open = force === undefined ? !drawer.classList.contains("open") : !!force;
  drawer.classList.toggle("open", open);
  drawer.setAttribute("aria-hidden", open ? "false" : "true");
  if (open) {
    const notesKey = getNotesKey();
    const notes = readJson(notesKey, []).map((n) => ({ ...n, read: true }));
    writeJson(notesKey, notes);
    renderNotifications();
  }
}

function enqueueSync(item) {
  const queue = readJson(SYNC_KEY, []);
  queue.push({ ...item, queuedAt: Date.now() });
  writeJson(SYNC_KEY, queue);
  updateConnectivityBadge();
}

async function flushSyncQueue() {
  const queue = readJson(SYNC_KEY, []);
  if (!queue.length || !navigator.onLine) return;
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queue })
    });
    if (!res.ok) throw new Error("sync failed");
    writeJson(SYNC_KEY, []);
    if (queue.length) logAction("Generated catalog", `Synced ${queue.length} queued upload(s)`);
  } catch {
    /* keep queue for later */
  }
  updateConnectivityBadge();
}

function updateConnectivityBadge() {
  const badge = document.getElementById("connectivityBadge");
  const label = document.getElementById("connectivityLabel");
  if (!badge || !label) return;
  const queued = readJson(SYNC_KEY, []).length;
  if (navigator.onLine && queued === 0) {
    badge.className = "connectivity-badge online";
    label.innerText = "Online";
  } else if (navigator.onLine && queued > 0) {
    badge.className = "connectivity-badge syncing";
    label.innerText = `Syncing ${queued} item(s)`;
    flushSyncQueue();
  } else {
    badge.className = "connectivity-badge offline";
    label.innerText = "Saved Offline — Will sync when network returns";
  }
}

function applyAuthUi() {
  const user = window.CC_USER;
  const loginBtn = document.getElementById("headerLoginBtn");
  const logoutBtn = document.getElementById("headerLogoutBtn");
  const sideName = document.getElementById("sidebarUserName");
  const sideRole = document.getElementById("sidebarUserRole");
  const sideBadge = document.getElementById("sidebarAuthBadge");
  const sideActions = document.getElementById("sidebarAuthActions");
  const welcome = document.getElementById("welcomeName");
  const guestBanner = document.getElementById("guestBanner");

  // Profile section elements
  const profName = document.getElementById("profileUserName") || document.querySelector("#profile .profile-name") || document.querySelector("#profile .profile h2");
  const profCraft = document.getElementById("profileUserCraft") || document.querySelector("#profile .artisan-type");
  const profLoc = document.getElementById("profileUserState") || document.querySelector("#profile .artisan-loc");
  const profBadge = document.getElementById("profileAuthBadge");
  const profInitials = document.getElementById("profileAvatarInitials");

  // Get localized strings from TRANSLATIONS (defined in main.js)
  const lang = (typeof currentLang !== "undefined" ? currentLang : "en");
  const dict = (typeof TRANSLATIONS !== "undefined" && TRANSLATIONS[lang]) ? TRANSLATIONS[lang] : {};
  const t = (key, fallback) => dict[key] || fallback;

  if (user && user.name) {
    if (loginBtn) loginBtn.hidden = true;
    if (logoutBtn) logoutBtn.hidden = false;
    if (sideName) sideName.innerText = user.name;
    if (sideRole) sideRole.innerText = (user.role || "artisan").toUpperCase() + (user.state ? " · " + user.state : "");
    if (sideBadge) {
      sideBadge.innerText = t("sidebar_signed_badge", "Signed in");
      sideBadge.style.background = "#e6f4ea";
      sideBadge.style.color = "#137333";
    }
    if (welcome) welcome.innerText = user.name.split(" ")[0];
    const headerName = document.getElementById("headerUserName");
    const headerRole = document.getElementById("headerUserRole");
    const headerAvatar = document.getElementById("headerUserAvatar");
    if (headerName) headerName.innerText = user.name;
    if (headerRole) headerRole.innerText = (user.role || "artisan").toUpperCase();
    if (headerAvatar && user.avatar) headerAvatar.src = user.avatar;
    if (guestBanner) guestBanner.style.display = "none";
    if (sideActions) {
      sideActions.innerHTML = `<form action="/logout" method="POST"><button type="submit" class="sidebar-logout-btn">${t("sidebar_logout", "Logout")}</button></form>`;
    }
    if (profName) profName.innerText = user.name;
    if (profCraft) profCraft.innerText = (user.craft ? (user.craft.charAt(0).toUpperCase() + user.craft.slice(1) + " Artisan") : "Handicraft Artisan") + " · Verified";
    if (profLoc) profLoc.innerText = `📍 ${user.state || "Rajasthan"} • Certified GI Cluster`;
    if (profBadge) {
      profBadge.className = "profile-badge-pill badge-verified";
      profBadge.innerText = "✓ Verified Artisan";
    }
    if (profInitials && !user.avatar) {
      profInitials.innerText = user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    }
  } else {
    if (loginBtn) loginBtn.hidden = false;
    if (logoutBtn) logoutBtn.hidden = true;
    if (sideName && !sideName.dataset.i18n) sideName.innerText = t("sidebar_guest_name", "Guest Artisan");
    if (sideRole && !sideRole.dataset.i18n) sideRole.innerText = t("sidebar_not_signed", "Not signed in");
    if (sideBadge && !sideBadge.dataset.i18n) {
      sideBadge.innerText = t("sidebar_guest_badge", "Guest");
      sideBadge.style.background = "#fef3c7";
      sideBadge.style.color = "#92400e";
    }
    if (welcome) welcome.innerText = "Guest Artisan";
    if (guestBanner) guestBanner.style.display = "flex";
    if (sideActions) {
      sideActions.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:6px; width:100%;">
          <a class="sidebar-login-btn" href="/login" style="text-align:center;">${t("sidebar_login", "Sign In")}</a>
          <a href="/register" style="text-align:center; font-size:12px; color:#0F5147; font-weight:600; text-decoration:none; padding:6px; border:1px solid #cce2dc; border-radius:8px; background:white;">Register Free</a>
        </div>`;
    }
    if (profName) profName.innerText = "Guest Artisan";
    if (profCraft) profCraft.innerText = "Exploring in Guest Mode";
    if (profLoc) profLoc.innerText = "📍 Sign in or register to set up your craft identity";
    if (profBadge) {
      profBadge.className = "profile-badge-pill badge-guest";
      profBadge.innerText = "Guest Mode";
    }
  }
}

let pendingAuthAction = null;

function showAuthGuardModal(featureName, callback) {
  const modal = document.getElementById("authGuardModal");
  if (!modal) return;
  pendingAuthAction = callback || null;

  const titleEl = document.getElementById("authGuardTitle");
  const msgEl = document.getElementById("authGuardMessage");
  const loginBtn = document.getElementById("authGuardLoginBtn");
  const regBtn = document.getElementById("authGuardRegisterBtn");

  const hash = window.location.hash || "#catalog";
  const redirectTarget = `/dashboard${hash}`;

  if (titleEl) {
    titleEl.innerText = featureName ? `Sign In Required: ${featureName}` : "Sign In to Unlock Feature";
  }
  if (msgEl) {
    msgEl.innerText = featureName
      ? `To use ${featureName}, please sign in or create a free artisan account.`
      : "You are currently browsing as a guest. Please sign in to access this feature.";
  }

  if (loginBtn) {
    loginBtn.href = `/login?redirect=${encodeURIComponent(redirectTarget)}`;
  }
  if (regBtn) {
    regBtn.href = `/register?redirect=${encodeURIComponent(redirectTarget)}`;
  }

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeAuthGuardModal() {
  const modal = document.getElementById("authGuardModal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "";
  }
}

function requireUserAuth(featureName, callback) {
  if (window.CC_USER && window.CC_USER.name) {
    if (typeof callback === "function") callback();
    return true;
  }
  showAuthGuardModal(featureName, callback);
  return false;
}

function showToast(message, type = "success") {
  const existing = document.getElementById("craftToast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "craftToast";
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: ${type === "error" ? "#991B1B" : "#0F5147"};
    color: white;
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 10px 25px rgba(0,0,0,0.25);
    z-index: 99999;
    opacity: 0;
    transition: all 0.25s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 90vw;
  `;
  toast.innerHTML = `<span>${type === "error" ? "⚠️" : "🌿"}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(10px)";
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

async function quickLoginDemo(role = "artisan") {
  try {
    const res = await fetch("/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ role })
    });
    const data = await res.json();
    if (data.ok && data.user) {
      window.CC_USER = data.user;
      applyAuthUi();
      closeAuthGuardModal();
      showToast(`Signed in as ${data.user.name} (${data.user.role.toUpperCase()})! All features unlocked.`);
      if (typeof pendingAuthAction === "function") {
        const action = pendingAuthAction;
        pendingAuthAction = null;
        action();
      }
    } else {
      window.location.href = `/auth/demo?role=${role}`;
    }
  } catch (err) {
    window.location.href = `/auth/demo?role=${role}`;
  }
}

window.showAuthGuardModal = showAuthGuardModal;
window.closeAuthGuardModal = closeAuthGuardModal;
window.requireUserAuth = requireUserAuth;
window.quickLoginDemo = quickLoginDemo;
window.showToast = showToast;

function logoutCraftConnect() {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/logout";
  document.body.appendChild(form);
  form.submit();
}

function renderArtisanQr() {
  const host = document.getElementById("artisanQr");
  const urlEl = document.getElementById("qrProfileUrl");
  if (!host) return;
  const url = storefrontUrl();
  if (urlEl) urlEl.innerText = url;
  host.innerHTML = "";
  if (typeof QRCode === "undefined") {
    host.innerHTML = `<p class="screen-sub">${url}</p>`;
    return;
  }
  new QRCode(host, { text: url, width: 168, height: 168, colorDark: "#0f4940", colorLight: "#fffdf9" });
}

function qrCanvas() {
  return document.querySelector("#artisanQr canvas") || document.querySelector("#artisanQr img");
}

function downloadArtisanQr() {
  if (!requireUserAuth("Download Storefront QR")) return;
  const node = qrCanvas();
  if (!node) {
    alert("QR is still generating.");
    return;
  }
  const href = node.toDataURL ? node.toDataURL("image/png") : node.src;
  const a = document.createElement("a");
  a.href = href;
  a.download = "craftconnect-storefront-qr.png";
  a.click();
}

function shareArtisanQr() {
  if (!requireUserAuth("Share Storefront QR")) return;
  const url = storefrontUrl();
  sharePayload({
    title: "My CraftConnect storefront",
    text: "Scan this QR or open my artisan catalog.",
    url
  });
}

function filterMarketsByRegion(region) {
  document.querySelectorAll("#marketList .market-card").forEach((card) => {
    const regions = (card.getAttribute("data-regions") || "all").split(",");
    card.style.display = !region || region === "all" || regions.includes(region) || regions.includes("all")
      ? ""
      : "none";
  });
  const hints = document.getElementById("localMarketHints");
  if (!hints) return;
  const list = REGION_MARKETS[region] || REGION_MARKETS.all;
  hints.innerHTML = `<h4 class="local-hint-title">Suggested local & wholesale markets</h4>` +
    list
      .map(
        (m) => `
      <div class="market-card">
        <div class="market-info">
          <h3>${m.name}</h3>
          <p>${m.type}</p>
          <p>${m.loc}</p>
          <div class="market-footer"><span class="match">${m.match}</span></div>
        </div>
      </div>`
      )
      .join("");
}

function loadMaterials() {
  const stored = readJson(MAT_KEY, null);
  if (stored) return stored;
  writeJson(MAT_KEY, DEFAULT_MATERIALS);
  return DEFAULT_MATERIALS;
}

function switchMaterialMode(mode, btn) {
  materialMode = mode;
  document.querySelectorAll("#materials .orders-tab").forEach((t) => t.classList.remove("active"));
  if (btn) btn.classList.add("active");
  const submit = document.getElementById("matSubmitBtn");
  if (submit) submit.innerText = mode === "sell"
    ? (typeof window.t === "function" ? window.t("mat_submit_sell", "List material for sale") : "List material for sale")
    : (typeof window.t === "function" ? window.t("mat_submit_buy", "Join bulk buy") : "Join bulk buy");
  // Update form placeholders too
  const tFn = typeof window.t === "function" ? window.t.bind(window) : (k, fb) => fb;
  const matTitle = document.getElementById("matTitle");
  const matQty = document.getElementById("matQty");
  const matPrice = document.getElementById("matPrice");
  const matLoc = document.getElementById("matLocation");
  if (matTitle) matTitle.placeholder = tFn("mat_placeholder_title", "Material (e.g. Terracotta clay 50kg)");
  if (matQty) matQty.placeholder = tFn("mat_placeholder_qty", "Quantity");
  if (matPrice) matPrice.placeholder = tFn("mat_placeholder_price", "Rate ₹");
  if (matLoc) matLoc.placeholder = tFn("mat_placeholder_location", "Cluster / city");
  renderMaterials();
}

function renderMaterials() {
  const list = document.getElementById("materialList");
  if (!list) return;
  const tFn = typeof window.t === "function" ? window.t.bind(window) : (k, fb) => fb;
  // Sync submit button text
  const submit = document.getElementById("matSubmitBtn");
  if (submit) submit.innerText = materialMode === "sell"
    ? tFn("mat_submit_sell", "List material for sale")
    : tFn("mat_submit_buy", "Join bulk buy");
  // Sync form placeholders
  const matTitle = document.getElementById("matTitle");
  const matQty = document.getElementById("matQty");
  const matPrice = document.getElementById("matPrice");
  const matLoc = document.getElementById("matLocation");
  if (matTitle) matTitle.placeholder = tFn("mat_placeholder_title", "Material (e.g. Terracotta clay 50kg)");
  if (matQty) matQty.placeholder = tFn("mat_placeholder_qty", "Quantity");
  if (matPrice) matPrice.placeholder = tFn("mat_placeholder_price", "Rate ₹");
  if (matLoc) matLoc.placeholder = tFn("mat_placeholder_location", "Cluster / city");

  const items = loadMaterials().filter((m) => m.mode === materialMode);
  const poolLabel = tFn("mat_btn_pool", "Pool order →");
  const reqLabel  = tFn("mat_btn_request", "Request lot →");
  list.innerHTML = items
    .map(
      (m) => `
      <div class="market-card">
        <div class="market-info">
          <h3>${m.title}</h3>
          <p>${m.owner} · Qty ${m.qty}</p>
          <p>📍 ${m.location}</p>
          <div class="market-footer">
            <span class="match">₹${Number(m.price).toLocaleString("en-IN")}</span>
            <button class="link-btn" type="button" onclick="joinMaterial('${m.id}')">${materialMode === "buy" ? poolLabel : reqLabel}</button>
          </div>
        </div>
      </div>`
    )
    .join("");
}

function submitMaterialListing(event) {
  event.preventDefault();
  if (typeof requireUserAuth === "function" && !requireUserAuth("Post Raw Material Listing")) return;
  const listing = {
    id: "mat_" + Date.now(),
    mode: materialMode,
    title: document.getElementById("matTitle").value.trim(),
    qty: Number(document.getElementById("matQty").value),
    price: Number(document.getElementById("matPrice").value),
    location: document.getElementById("matLocation").value.trim(),
    owner: (window.CC_USER && window.CC_USER.name) || "Local cluster"
  };
  const all = loadMaterials();
  all.unshift(listing);
  writeJson(MAT_KEY, all);
  event.target.reset();
  logAction(materialMode === "sell" ? "Listed raw material" : "Pooled material buy", listing.title);
  renderMaterials();
}

function joinMaterial(id) {
  if (typeof requireUserAuth === "function" && !requireUserAuth("Join Raw Material Bulk Buy")) return;
  const item = loadMaterials().find((m) => m.id === id);
  if (!item) return;
  pushNotification("Material desk", `Request sent for ${item.title}`);
  alert("Cluster request saved. Coordinators will confirm the pooled lot.");
}

let schemeTypeFilter = "all";
let schemeSearchQuery = "";
window.schemeSearchQuery = "";

const SCHEME_TYPE_ICONS = {
  craft: "🏺",
  credit: "₹",
  identity: "🪪",
  skill: "🎓",
  market: "📈",
  subsidy: "₹",
  toolkit: "🛠️",
  cluster: "🏛️"
};

function getSchemesCatalog() {
  return Array.isArray(window.SCHEMES) ? window.SCHEMES : (typeof SCHEMES !== "undefined" ? SCHEMES : []);
}

function schemeMatchesType(scheme, type) {
  if (!type || type === "all") return true;
  if (Array.isArray(scheme.types) && scheme.types.includes(type)) return true;
  return scheme.type === type;
}

function schemeMatchesCraft(scheme, craft) {
  if (!craft || craft === "all") return true;
  return (scheme.fits || []).includes("all") || (scheme.fits || []).includes(craft);
}

function schemeMatchesYear(scheme, year) {
  if (!year || year === "all") return true;
  return (scheme.yearTag || "ongoing") === year;
}

function schemeMatchesQuery(scheme, query) {
  if (!query) return true;
  const hay = [scheme.name, scheme.blurb, scheme.badge, scheme.highlight, scheme.audience, scheme.ministry]
    .join(" ")
    .toLowerCase();
  return hay.includes(query);
}

function filteredSchemes() {
  const craft = (document.getElementById("schemeCraft") || {}).value || "all";
  const year = (document.getElementById("schemeTurnover") || {}).value || "all";
  const query = (window.schemeSearchQuery || schemeSearchQuery || "").trim().toLowerCase();
  return getSchemesCatalog().filter((s) =>
    schemeMatchesType(s, schemeTypeFilter) &&
    schemeMatchesCraft(s, craft) &&
    schemeMatchesYear(s, year) &&
    schemeMatchesQuery(s, query)
  );
}

function syncSchemeTypeControls() {
  const select = document.getElementById("schemeTypeSelect");
  if (select && select.value !== schemeTypeFilter) {
    const hasOption = Array.from(select.options).some((o) => o.value === schemeTypeFilter);
    select.value = hasOption ? schemeTypeFilter : "all";
  }
  document.querySelectorAll(".scheme-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.type === schemeTypeFilter);
  });
  document.querySelectorAll(".scheme-hero-pill").forEach((pill) => {
    const t = pill.dataset.type;
    const on = t === schemeTypeFilter || (schemeTypeFilter === "all" && t === "all");
    pill.classList.toggle("active", on);
  });
}

function renderSchemes() {
  const host = document.getElementById("schemeResults");
  if (!host) return;
  const empty = document.getElementById("schemeEmpty");
  const list = filteredSchemes();
  const countBadge = document.getElementById("schemeCountBadge");
  const homeCount = document.getElementById("homeSchemeCount");
  const n = list.length;
  const label = `${n} Scheme${n === 1 ? "" : "s"} Available`;
  if (countBadge) countBadge.textContent = label;
  if (homeCount) homeCount.textContent = label;

  const stats = document.getElementById("schemeSummaryStats");
  if (stats) {
    stats.innerHTML = n
      ? `<span class="summary-stat-tag stat-tag-eligible">${n} matching</span>`
      : `<span class="summary-stat-tag stat-tag-check">0 matching</span>`;
  }

  if (!n) {
    host.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  host.innerHTML = list.map((s) => {
    const tone = s.categoryTone || "teal";
    const icon = SCHEME_TYPE_ICONS[s.type] || "🏛️";
    const highlightIcon = /free/i.test(s.highlight || "") ? "₹" : "₹";
    return `
      <article class="scheme-card scheme-hub-card" data-scheme-id="${s.id}">
        <div class="scheme-card-top">
          <span class="scheme-cat-chip tone-${tone}">${icon} ${s.badge}</span>
          <span class="scheme-card-icon-wrap">${icon}</span>
        </div>
        <h3 class="scheme-card-title">${s.name}</h3>
        <p class="scheme-card-desc">${s.blurb}</p>
        <ul class="scheme-meta-list">
          <li><span>₹</span> ${s.highlight || "Varies"}</li>
          <li><span>📅</span> ${s.period || "Ongoing"}</li>
          <li><span>👥</span> ${s.audience || "Artisans"}</li>
        </ul>
        <button type="button" class="scheme-btn-details scheme-btn-full" onclick="openSchemeModal('${s.id}')">
          View Details →
        </button>
      </article>`;
  }).join("");
}

function applySchemeFilters() {
  renderSchemes();
}

function filterSchemeType(type, btn) {
  schemeTypeFilter = type || "all";
  window.schemeTypeFilter = schemeTypeFilter;
  const select = document.getElementById("schemeTypeSelect");
  if (select && Array.from(select.options).some((o) => o.value === schemeTypeFilter)) {
    select.value = schemeTypeFilter;
  }
  syncSchemeTypeControls();
  renderSchemes();
}

function resetSchemeFilters() {
  schemeTypeFilter = "all";
  schemeSearchQuery = "";
  window.schemeSearchQuery = "";
  const craft = document.getElementById("schemeCraft");
  const year = document.getElementById("schemeTurnover");
  const type = document.getElementById("schemeTypeSelect");
  const search = document.getElementById("globalAppSearch");
  if (craft) craft.value = "all";
  if (year) year.value = "all";
  if (type) type.value = "all";
  if (search && document.getElementById("schemes")?.classList.contains("active")) search.value = "";
  const tip = document.getElementById("schemeSummaryText");
  if (tip) tip.textContent = "Pro Tip — Select your craft category and trade type to get the most relevant schemes for you.";
  syncSchemeTypeControls();
  renderSchemes();
}

function checkSchemeEligibility(event) {
  if (event) event.preventDefault();
  const craft = (document.getElementById("schemeCraft") || {}).value || "all";
  applySchemeFilters();
  const n = filteredSchemes().length;
  const tip = document.getElementById("schemeSummaryText");
  if (tip) {
    tip.textContent = n
      ? `Eligibility check complete — ${n} scheme${n === 1 ? "" : "s"} match your craft profile.`
      : "No schemes matched this profile. Reset filters or try another craft category.";
  }
  logAction("Checked scheme eligibility", craft);
}

function openSchemeModal(schemeId) {
  const scheme = getSchemesCatalog().find((s) => s.id === schemeId);
  const modal = document.getElementById("schemeDetailModal");
  if (!scheme || !modal) return;
  const title = document.getElementById("schemeModalTitle");
  const ministry = document.getElementById("schemeModalMinistry");
  const chip = document.getElementById("schemeModalCategoryChip");
  const icon = document.getElementById("schemeModalIconWrap");
  const body = document.getElementById("schemeModalBody");
  const applyBtn = document.getElementById("schemeModalApplyBtn");
  if (title) title.textContent = scheme.name;
  if (ministry) ministry.textContent = scheme.ministry || "Government of India";
  if (chip) chip.textContent = scheme.badge || scheme.type;
  if (icon) icon.textContent = SCHEME_TYPE_ICONS[scheme.type] || "🏛️";
  if (applyBtn) applyBtn.href = scheme.apply || "#";
  const list = (items) => (items || []).map((item) => `<li>${item}</li>`).join("");
  const aid = (scheme.financialAid || []).map((a) => `
      <div class="scheme-modal-aid-item">
        <strong>${a.label}</strong>
        <span>${a.val}</span>
        <p>${a.desc || ""}</p>
      </div>`).join("");
  if (body) {
    body.innerHTML = `
      <div class="scheme-modal-status-banner">${scheme.highlight || ""} · ${scheme.period || "Ongoing"} · ${scheme.audience || ""}</div>
      <p>${scheme.overview || scheme.blurb}</p>
      <h4 class="scheme-modal-section-title">Key benefits</h4>
      <ul class="scheme-modal-list">${list(scheme.keyBenefits)}</ul>
      <h4 class="scheme-modal-section-title">Financial aid</h4>
      <div class="scheme-modal-aid-grid">${aid}</div>
      <h4 class="scheme-modal-section-title">Eligibility</h4>
      <ul class="scheme-modal-list">${list(scheme.eligibilityCriteria)}</ul>
      <h4 class="scheme-modal-section-title">Documents required</h4>
      <ul class="scheme-modal-list">${list(scheme.requiredDocs)}</ul>
      <h4 class="scheme-modal-section-title">How to apply</h4>
      <ul class="scheme-modal-list">${list(scheme.howToApply)}</ul>`;
  }
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeSchemeModal() {
  const modal = document.getElementById("schemeDetailModal");
  if (!modal) return;
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

window.renderSchemes = renderSchemes;
window.applySchemeFilters = applySchemeFilters;
window.filterSchemeType = filterSchemeType;
window.resetSchemeFilters = resetSchemeFilters;
window.checkSchemeEligibility = checkSchemeEligibility;
window.openSchemeModal = openSchemeModal;
window.closeSchemeModal = closeSchemeModal;

function loadForum() {
  const stored = readJson(FORUM_KEY, null);
  if (stored) return stored;
  writeJson(FORUM_KEY, DEFAULT_FORUM);
  return DEFAULT_FORUM;
}

function renderForum() {
  const feed = document.getElementById("forumFeed");
  if (!feed) return;
  const tFn = typeof window.t === "function" ? window.t.bind(window) : (k, fb) => fb;
  const posts = loadForum();
  feed.innerHTML = posts
    .map(
      (p) => `
      <article class="forum-post">
        <span class="forum-tag">${p.tag}</span>
        <strong>${p.author}</strong>
        <p>${p.body}</p>
        <small>${new Date(p.at).toLocaleString("en-IN")}</small>
      </article>`
    )
    .join("");

  // Update forum compose form text
  const forumTag = document.getElementById("forumTag");
  if (forumTag && forumTag.options.length >= 3) {
    forumTag.options[0].text = tFn("forum_tag_tip", "Design tip");
    forumTag.options[1].text = tFn("forum_tag_outsource", "Outsource overflow");
    forumTag.options[2].text = tFn("forum_tag_help", "Ask for help");
  }
  const forumBody = document.getElementById("forumBody");
  if (forumBody) forumBody.placeholder = tFn("forum_placeholder_body", "Write a message for fellow artisans...");
  const forumPostBtn = document.querySelector("#forum .forum-compose button[type='submit']");
  if (forumPostBtn) forumPostBtn.textContent = tFn("forum_btn_post", "Post to community");
}

function postForumMessage(event) {
  event.preventDefault();
  if (typeof requireUserAuth === "function" && !requireUserAuth("Post to Artisan Community Forum")) return;
  const body = document.getElementById("forumBody").value.trim();
  const tag = document.getElementById("forumTag").value;
  const user = window.CC_USER;
  const author = user ? `${user.name} · ${user.state || "India"}` : "Guest artisan";
  const posts = loadForum();
  posts.unshift({ id: "f_" + Date.now(), tag, author, body, at: Date.now() });
  writeJson(FORUM_KEY, posts.slice(0, 50));
  event.target.reset();
  logAction("Forum post", tag);
  renderForum();
}

/* ===============================================================
   CRAFTCONNECT — PROFIT & LOSS TRACKER ENGINE
   =============================================================== */

let financeActivePeriod = "weekly";
let financeActiveProduct = "all";
let financeCustomStart = "";
let financeCustomEnd = "";

const DEFAULT_FINANCE_EXPENSES = [
  { id: "exp_001", category: "raw_materials", amount: 1400, date: "2026-10-01", relatedProduct: "prod_bamboo_basket", description: "30 seasoned Assam bamboo poles & natural resin polish" },
  { id: "exp_002", category: "packaging", amount: 450, date: "2026-09-29", relatedProduct: "all", description: "Corrugated shipping boxes & biodegradable bubble wrap (50 pcs)" },
  { id: "exp_003", category: "labour", amount: 800, date: "2026-09-27", relatedProduct: "prod_wood_coasters", description: "Artisan filigree cutwork wage for 10 coaster sets" },
  { id: "exp_004", category: "shipping", amount: 320, date: "2026-09-26", relatedProduct: "all", description: "India Post Speed Post dispatch for Delhi & Pune buyer shipments" },
  { id: "exp_005", category: "raw_materials", amount: 650, date: "2026-09-22", relatedProduct: "prod_terracotta_diya", description: "50kg filtered riverbed clay & organic terracotta pigments" },
  { id: "exp_006", category: "platform_fees", amount: 280, date: "2026-09-18", relatedProduct: "all", description: "ONDC network storefront listing & payment transaction charges" },
  { id: "exp_007", category: "raw_materials", amount: 1800, date: "2026-09-10", relatedProduct: "prod_indigo_stole", description: "Natural vegetable indigo extract & 100% Chanderi handloom fabric rolls" },
  { id: "exp_008", category: "tools_maintenance", amount: 500, date: "2026-08-20", relatedProduct: "all", description: "Carving chisel sharpening & pottery wheel maintenance servicing" },
  { id: "exp_009", category: "raw_materials", amount: 1200, date: "2025-10-10", relatedProduct: "prod_bamboo_basket", description: "Bulk Assam cane stock purchase for winter festive orders" }
];

const EXPENSE_CATEGORIES = {
  raw_materials: { label: "🪵 Raw Materials", icon: "🪵", cls: "expense-cat-raw_materials" },
  labour: { label: "👥 Artisan Labour", icon: "👥", cls: "expense-cat-labour" },
  packaging: { label: "📦 Packaging", icon: "📦", cls: "expense-cat-packaging" },
  shipping: { label: "🚚 Shipping & Freight", icon: "🚚", cls: "expense-cat-shipping" },
  platform_fees: { label: "🏷️ Platform & Stall Fees", icon: "🏷️", cls: "expense-cat-platform_fees" },
  tools_maintenance: { label: "🔧 Tools & Maintenance", icon: "🔧", cls: "expense-cat-tools_maintenance" },
  other: { label: "📑 Other Operations", icon: "📑", cls: "expense-cat-other" }
};

function getFinanceStorageKey() {
  const slug = typeof artisanSlug === "function" ? artisanSlug() : "default";
  return `craftconnect_expenses_${slug}`;
}

function loadFinanceExpenses() {
  const key = getFinanceStorageKey();
  let expenses = readJson(key, null);
  if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
    expenses = [...DEFAULT_FINANCE_EXPENSES];
    writeJson(key, expenses);
  }
  return expenses;
}

function saveFinanceExpenses(expenses) {
  const key = getFinanceStorageKey();
  writeJson(key, expenses);
}

function getFinanceRefDate() {
  const now = new Date();
  if (now.getFullYear() < 2026) {
    return new Date(2026, 9, 2); // Oct 2, 2026 anchor
  }
  return now;
}

function parseISODateStr(str) {
  if (!str) return new Date();
  const parts = str.split("-");
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(str);
}

function toISODateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(d) {
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

function formatDisplayDateShort(d) {
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function formatINR(val, withSign = false) {
  const num = Math.round(Number(val) || 0);
  const sign = withSign && num > 0 ? "+" : "";
  if (num < 0) {
    return `-₹${Math.abs(num).toLocaleString("en-IN")}`;
  }
  return `${sign}₹${num.toLocaleString("en-IN")}`;
}

function getPeriodDateBounds(period, customStart, customEnd) {
  const ref = getFinanceRefDate();
  let currStart, currEnd, prevStart, prevEnd;

  if (period === "weekly") {
    currEnd = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    currStart = new Date(currEnd);
    currStart.setDate(currEnd.getDate() - 6);

    prevEnd = new Date(currStart);
    prevEnd.setDate(currStart.getDate() - 1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevEnd.getDate() - 6);
  } else if (period === "monthly") {
    currEnd = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    currStart = new Date(currEnd);
    currStart.setDate(currEnd.getDate() - 29);

    prevEnd = new Date(currStart);
    prevEnd.setDate(currStart.getDate() - 1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevEnd.getDate() - 29);
  } else if (period === "yearly") {
    currEnd = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    currStart = new Date(ref.getFullYear(), 0, 1);

    prevEnd = new Date(ref.getFullYear() - 1, 11, 31);
    prevStart = new Date(ref.getFullYear() - 1, 0, 1);
  } else {
    // Custom
    if (!customStart || !customEnd) {
      currEnd = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
      currStart = new Date(currEnd);
      currStart.setDate(currEnd.getDate() - 13);
    } else {
      currStart = parseISODateStr(customStart);
      currEnd = parseISODateStr(customEnd);
    }
    const daysDiff = Math.max(1, Math.round((currEnd - currStart) / 86400000) + 1);
    prevEnd = new Date(currStart);
    prevEnd.setDate(currStart.getDate() - 1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevEnd.getDate() - (daysDiff - 1));
  }

  return {
    currStartStr: toISODateStr(currStart),
    currEndStr: toISODateStr(currEnd),
    prevStartStr: toISODateStr(prevStart),
    prevEndStr: toISODateStr(prevEnd),
    currStart,
    currEnd,
    prevStart,
    prevEnd
  };
}

function calculateFinanceMetrics(startDateStr, endDateStr, productId, orders, expenses, products) {
  const isAll = productId === "all";

  // Filter completed/dispatched orders in date range
  const periodOrders = orders.filter((o) => {
    if (!o.date) return false;
    if (o.date < startDateStr || o.date > endDateStr) return false;
    const isCompleted = o.status === "dispatched" || o.status === "completed" || o.status === "delivered";
    if (!isCompleted) return false;
    if (isAll) return true;
    return o.productId === productId;
  });

  // Calculate actual revenue
  const revenue = periodOrders.reduce((sum, o) => {
    if (o.status === "refunded" || o.status === "returned") return sum - (Number(o.amount) || 0);
    return sum + (Number(o.amount) || 0);
  }, 0);

  // Units sold in this period
  const unitsSold = periodOrders.reduce((sum, o) => sum + (Number(o.qty) || 1), 0);

  // Filter expenses in date range
  const periodExpenses = expenses.filter((e) => {
    if (!e.date) return false;
    if (e.date < startDateStr || e.date > endDateStr) return false;
    if (isAll) return true;
    return e.relatedProduct === productId;
  });

  let materialExpensesLogged = 0;
  let otherExpenses = 0;

  periodExpenses.forEach((e) => {
    const amt = Number(e.amount) || 0;
    if (e.category === "raw_materials") {
      materialExpensesLogged += amt;
    } else {
      otherExpenses += amt;
    }
  });

  // Calculate baseline material cost for sold units if manual receipts are lower/absent
  let baselineMaterialCost = 0;
  let hasIncompleteData = false;

  if (isAll) {
    products.forEach((p) => {
      const prodOrders = periodOrders.filter((o) => o.productId === p.id);
      const prodUnits = prodOrders.reduce((sum, o) => sum + (Number(o.qty) || 1), 0);
      const unitCost = Number(p.material_cost) || Math.round((Number(p.price) || 0) * 0.38);
      baselineMaterialCost += unitCost * prodUnits;
    });
  } else {
    const targetProd = products.find((p) => p.id === productId);
    if (targetProd) {
      const unitCost = Number(targetProd.material_cost) || Math.round((Number(targetProd.price) || 0) * 0.38);
      baselineMaterialCost = unitCost * unitsSold;
    }
  }

  // Use the logged material expenses; if none were logged but units were sold, use baseline estimate
  let materialCost = materialExpensesLogged;
  if (materialExpensesLogged === 0 && baselineMaterialCost > 0) {
    materialCost = baselineMaterialCost;
    hasIncompleteData = true;
  }

  const totalExpenses = materialCost + otherExpenses;
  const netProfit = revenue - totalExpenses;
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return {
    revenue,
    totalExpenses,
    materialCost,
    otherExpenses,
    netProfit,
    profitMargin,
    completedOrdersCount: periodOrders.length,
    unitsSold,
    hasIncompleteData
  };
}

function calculatePercentChange(curr, prev, isExpense = false) {
  if (prev === 0 && curr === 0) {
    return { text: "0% vs prev", cls: "trend-neutral" };
  }
  if (prev === 0) {
    return { text: "+100% vs prev", cls: isExpense ? "trend-cost-up" : "trend-pos" };
  }
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  const rounded = Math.abs(pct) >= 10 ? Math.round(pct) : pct.toFixed(1);
  const sign = pct > 0 ? "+" : "";

  if (isExpense) {
    const cls = pct > 0 ? "trend-cost-up" : "trend-pos";
    return { text: `${sign}${rounded}% vs prev`, cls };
  } else {
    const cls = pct >= 0 ? "trend-pos" : "trend-neg";
    return { text: `${sign}${rounded}% vs prev`, cls };
  }
}

function populateFinanceProductDropdowns(products) {
  const filterSel = document.getElementById("financeProductFilter");
  const modalSel = document.getElementById("expenseRelatedProduct");

  if (filterSel && filterSel.options.length <= 1) {
    filterSel.innerHTML = `<option value="all">🏢 Entire Business (Consolidated Performance)</option>`;
    products.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `📦 ${p.name}`;
      filterSel.appendChild(opt);
    });
  }

  if (modalSel && modalSel.options.length <= 1) {
    modalSel.innerHTML = `<option value="all">🏢 General Business (Consolidated / All Products)</option>`;
    products.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `📦 ${p.name}`;
      modalSel.appendChild(opt);
    });
  }
}

function renderFinanceSummaryCards(curr, prev) {
  const container = document.getElementById("financeSummaryCards");
  if (!container) return;
  const tFn = typeof window.t === "function" ? window.t.bind(window) : (k, fb) => fb;

  const revChange = calculatePercentChange(curr.revenue, prev.revenue, false);
  const expChange = calculatePercentChange(curr.totalExpenses, prev.totalExpenses, true);
  const profitChange = calculatePercentChange(curr.netProfit, prev.netProfit, false);

  const isNetLoss = curr.netProfit < 0;
  const profitCardClass = isNetLoss ? "card-loss" : "card-profit";
  const profitCardIcon = isNetLoss ? "⚠️" : "💹";

  let marginClass = "margin-good";
  if (isNetLoss) marginClass = "margin-loss";
  else if (curr.profitMargin < 20) marginClass = "margin-warn";

  const expenseRatio = curr.revenue > 0 ? Math.round((curr.totalExpenses / curr.revenue) * 100) : 0;
  const salesLabel   = tFn("finance_sales", "sales");
  const costsLabel   = tFn("finance_costs_logged", "Costs logged");
  const revText      = tFn("finance_revenue", "Total Revenue");
  const expText      = tFn("finance_expenses_label", "Total Expenses");
  const profitText   = isNetLoss ? tFn("finance_net_loss", "Net Loss") : tFn("finance_net_profit", "Net Profit");

  container.innerHTML = `
    <!-- Card 1: Total Revenue -->
    <div class="finance-metric-card card-revenue">
      <div class="finance-card-head">
        <span class="finance-card-title">${revText}</span>
        <span class="finance-card-icon">💰</span>
      </div>
      <div class="finance-metric-val">${formatINR(curr.revenue)}</div>
      <div class="finance-card-footer">
        <span class="finance-trend-badge ${revChange.cls}">${revChange.text}</span>
        <span style="color: #7c7468;">${curr.completedOrdersCount} ${salesLabel}</span>
      </div>
    </div>

    <!-- Card 2: Total Expenses -->
    <div class="finance-metric-card card-expenses">
      <div class="finance-card-head">
        <span class="finance-card-title">${expText}</span>
        <span class="finance-card-icon">🧾</span>
      </div>
      <div class="finance-metric-val">${formatINR(curr.totalExpenses)}</div>
      <div class="finance-card-footer">
        <span class="finance-trend-badge ${expChange.cls}">${expChange.text}</span>
        <span style="color: #7c7468;">${curr.revenue > 0 ? expenseRatio + "% of rev" : costsLabel}</span>
      </div>
    </div>

    <!-- Card 3: Net Profit -->
    <div class="finance-metric-card ${profitCardClass}">
      <div class="finance-card-head">
        <span class="finance-card-title">${profitText}</span>
        <span class="finance-card-icon">${profitCardIcon}</span>
      </div>
      <div class="finance-metric-val">${formatINR(curr.netProfit)}</div>
      <div class="finance-card-footer">
        <span class="finance-margin-pill ${marginClass}">${curr.profitMargin.toFixed(1)}% Margin</span>
        <span class="finance-trend-badge ${profitChange.cls}">${profitChange.text}</span>
      </div>
    </div>
  `;
}

function renderFinanceSVGChart(bounds, period, productId, orders, expenses, products) {
  const container = document.getElementById("financeChartContainer");
  const subEl = document.getElementById("financeChartSubtitle");
  if (!container) return;

  const isAll = productId === "all";
  const targetProd = isAll ? null : products.find((p) => p.id === productId);

  if (subEl) {
    subEl.textContent = isAll
      ? `Consolidated business financial performance (${period.charAt(0).toUpperCase() + period.slice(1)} view)`
      : `Performance breakdown for: ${targetProd ? targetProd.name : "Product"}`;
  }

  // Generate chart interval buckets
  const buckets = [];
  const start = new Date(bounds.currStart);
  const end = new Date(bounds.currEnd);

  if (period === "weekly") {
    // 7 daily buckets
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dStr = toISODateStr(d);
      buckets.push({
        label: formatDisplayDateShort(d),
        startStr: dStr,
        endStr: dStr
      });
    }
  } else if (period === "monthly") {
    // 5 multi-day buckets
    const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
    const step = Math.ceil(totalDays / 5);
    for (let i = 0; i < 5; i++) {
      const bStart = new Date(start);
      bStart.setDate(start.getDate() + i * step);
      if (bStart > end) break;
      const bEnd = new Date(bStart);
      bEnd.setDate(bStart.getDate() + step - 1);
      if (bEnd > end) bEnd.setTime(end.getTime());

      buckets.push({
        label: `${bStart.getDate()}-${bEnd.getDate()} ${bEnd.toLocaleDateString("en-IN", { month: "short" })}`,
        startStr: toISODateStr(bStart),
        endStr: toISODateStr(bEnd)
      });
    }
  } else if (period === "yearly") {
    // 12 monthly buckets for the current year
    const year = start.getFullYear();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const maxMonth = end.getMonth();
    for (let m = 0; m <= maxMonth; m++) {
      const mStart = new Date(year, m, 1);
      const mEnd = new Date(year, m + 1, 0);
      buckets.push({
        label: months[m],
        startStr: toISODateStr(mStart),
        endStr: toISODateStr(mEnd)
      });
    }
  } else {
    // Custom: adaptive bucketing
    const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
    if (totalDays <= 14) {
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dStr = toISODateStr(d);
        buckets.push({ label: formatDisplayDateShort(d), startStr: dStr, endStr: dStr });
      }
    } else {
      const numBuckets = 5;
      const step = Math.ceil(totalDays / numBuckets);
      for (let i = 0; i < numBuckets; i++) {
        const bStart = new Date(start);
        bStart.setDate(start.getDate() + i * step);
        if (bStart > end) break;
        const bEnd = new Date(bStart);
        bEnd.setDate(bStart.getDate() + step - 1);
        if (bEnd > end) bEnd.setTime(end.getTime());
        buckets.push({
          label: `${formatDisplayDateShort(bStart)}`,
          startStr: toISODateStr(bStart),
          endStr: toISODateStr(bEnd)
        });
      }
    }
  }

  // Calculate metrics for each bucket
  const pointsData = buckets.map((b) => {
    const m = calculateFinanceMetrics(b.startStr, b.endStr, productId, orders, expenses, products);
    return {
      label: b.label,
      revenue: m.revenue,
      expenses: m.totalExpenses,
      profit: m.netProfit
    };
  });

  const width = 640;
  const height = 230;
  const padLeft = 55;
  const padRight = 25;
  const padTop = 30;
  const padBottom = 35;

  let maxVal = Math.max(...pointsData.map((p) => Math.max(p.revenue, p.expenses, p.profit, 1000)));
  // Round maxVal up nicely
  maxVal = Math.ceil(maxVal / 500) * 500;
  if (maxVal === 0) maxVal = 1000;

  const n = pointsData.length;
  const stepX = (width - padLeft - padRight) / Math.max(1, n - 1);

  const getX = (idx) => padLeft + idx * stepX;
  const getY = (val) => padTop + (height - padTop - padBottom) * (1 - Math.max(0, val) / maxVal);

  const revPoints = pointsData.map((p, idx) => ({ x: getX(idx), y: getY(p.revenue), val: p.revenue, label: p.label }));
  const expPoints = pointsData.map((p, idx) => ({ x: getX(idx), y: getY(p.expenses), val: p.expenses, label: p.label }));
  const profitPoints = pointsData.map((p, idx) => ({ x: getX(idx), y: getY(p.profit), val: p.profit, label: p.label }));

  const revPath = revPoints.reduce((acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), "");
  const revArea = `${revPath} L ${revPoints[revPoints.length - 1].x} ${height - padBottom} L ${revPoints[0].x} ${height - padBottom} Z`;

  const expPath = expPoints.reduce((acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), "");

  // Grid lines (4 horizontal ticks)
  let gridLinesSvg = "";
  for (let i = 0; i <= 3; i++) {
    const tickVal = Math.round((maxVal / 3) * i);
    const tickY = getY(tickVal);
    gridLinesSvg += `
      <line x1="${padLeft}" y1="${tickY}" x2="${width - padRight}" y2="${tickY}" stroke="#E7EEEA" stroke-dasharray="3 3"/>
      <text x="${padLeft - 8}" y="${tickY + 4}" text-anchor="end" font-size="10" fill="#7c7468" font-family="'Outfit', sans-serif">₹${tickVal >= 1000 ? (tickVal / 1000).toFixed(tickVal % 1000 === 0 ? 0 : 1) + "k" : tickVal}</text>
    `;
  }

  // X-axis labels
  const xLabelsSvg = pointsData
    .map(
      (p, idx) => `
    <text x="${getX(idx)}" y="${height - 10}" text-anchor="middle" font-size="10.5" fill="#5a7571" font-family="'Outfit', sans-serif">${p.label}</text>
  `
    )
    .join("");

  // Point circles with interactive titles
  const circlesSvg = pointsData
    .map((p, idx) => {
      const rx = getX(idx);
      const ry = getY(p.revenue);
      const ey = getY(p.expenses);
      const py = getY(p.profit);
      return `
      <!-- Revenue Point -->
      <circle cx="${rx}" cy="${ry}" r="4.5" fill="#0F5147" stroke="#ffffff" stroke-width="2">
        <title>${p.label} - Revenue: ${formatINR(p.revenue)}</title>
      </circle>
      <!-- Expense Point -->
      <circle cx="${rx}" cy="${ey}" r="4" fill="#E99436" stroke="#ffffff" stroke-width="2">
        <title>${p.label} - Expenses: ${formatINR(p.expenses)}</title>
      </circle>
      <!-- Profit Point -->
      <circle cx="${rx}" cy="${py}" r="3.5" fill="#10b981" stroke="#ffffff" stroke-width="1.5">
        <title>${p.label} - Net Profit: ${formatINR(p.profit, true)}</title>
      </circle>
    `;
    })
    .join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; display: block; overflow: visible;">
      <defs>
        <linearGradient id="financeRevGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0F5147" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#0F5147" stop-opacity="0.01"/>
        </linearGradient>
      </defs>

      <!-- Grid -->
      ${gridLinesSvg}

      <!-- Revenue Area Fill & Line -->
      <path d="${revArea}" fill="url(#financeRevGrad)"/>
      <path d="${revPath}" fill="none" stroke="#0F5147" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Expense Line -->
      <path d="${expPath}" fill="none" stroke="#E99436" stroke-width="2.5" stroke-dasharray="4 2" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Circles -->
      ${circlesSvg}

      <!-- X-axis Labels -->
      ${xLabelsSvg}
    </svg>
  `;
}

function renderProductProfitTable(startDateStr, endDateStr, activeProductId, orders, expenses, products) {
  const tbody = document.getElementById("productProfitTableBody");
  const emptyState = document.getElementById("productTableEmptyState");
  const tableCard = document.getElementById("productProfitTable");
  const indicator = document.getElementById("tableActiveFilterIndicator");
  const filterName = document.getElementById("activeFilterName");
  if (!tbody) return;

  if (activeProductId !== "all") {
    const activeProd = products.find((p) => p.id === activeProductId);
    if (indicator && filterName) {
      indicator.style.display = "flex";
      filterName.textContent = activeProd ? `Filtered: ${activeProd.name}` : "Filtered Product";
    }
  } else if (indicator) {
    indicator.style.display = "none";
  }

  let totalSalesUnits = 0;

  const rowsHtml = products
    .map((p) => {
      const metrics = calculateFinanceMetrics(startDateStr, endDateStr, p.id, orders, expenses, products);
      totalSalesUnits += metrics.unitsSold;

      const isSelected = p.id === activeProductId;
      const isLoss = metrics.netProfit < 0;
      const profitCls = isLoss ? "color: #dc2626; font-weight: 700;" : "color: #15803d; font-weight: 700;";
      const marginCls = isLoss ? "margin-loss" : metrics.profitMargin < 20 ? "margin-warn" : "margin-good";

      return `
      <tr class="clickable-row ${isSelected ? "active-product-row" : ""}" onclick="selectProductForBreakdown('${p.id}')" title="Click to inspect ${p.name}">
        <td>
          <div class="finance-product-cell">
            <img class="finance-prod-thumb" src="${p.image || 'images/image.png'}" alt="${p.name}" onerror="this.src='images/image.png'">
            <div>
              <div style="font-weight: 600; color: #173f39;">${p.name}</div>
              <span class="finance-badge-cat">${p.category || 'Handicraft'} · ₹${Number(p.price || 0).toLocaleString("en-IN")}</span>
            </div>
          </div>
        </td>
        <td style="text-align: center; font-weight: 600;">${metrics.unitsSold}</td>
        <td style="text-align: right; font-weight: 600;">${formatINR(metrics.revenue)}</td>
        <td style="text-align: right; color: #5a7571;">
          ${formatINR(metrics.materialCost)}
          ${metrics.hasIncompleteData ? `<span class="finance-cost-est" title="Estimated based on catalog baseline">(est.)</span>` : ""}
        </td>
        <td style="text-align: right; color: #5a7571;">${formatINR(metrics.otherExpenses)}</td>
        <td style="text-align: right; font-weight: 600; color: #d9741d;">${formatINR(metrics.totalExpenses)}</td>
        <td style="text-align: right; ${profitCls}">${formatINR(metrics.netProfit, true)}</td>
        <td style="text-align: right;">
          <span class="finance-margin-pill ${marginCls}">${metrics.profitMargin.toFixed(1)}%</span>
        </td>
      </tr>
    `;
    })
    .join("");

  tbody.innerHTML = rowsHtml;

  if (totalSalesUnits === 0 && emptyState && tableCard) {
    emptyState.style.display = "block";
  } else if (emptyState) {
    emptyState.style.display = "none";
  }
}

function renderExpensesLogTable(startDateStr, endDateStr, productId, expenses, products) {
  const tbody = document.getElementById("expensesLogTableBody");
  const emptyState = document.getElementById("expensesEmptyState");
  if (!tbody) return;

  const isAll = productId === "all";

  const periodExpenses = expenses.filter((e) => {
    if (!e.date) return false;
    if (e.date < startDateStr || e.date > endDateStr) return false;
    if (isAll) return true;
    return e.relatedProduct === productId;
  });

  if (periodExpenses.length === 0) {
    tbody.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  // Sort descending by date
  periodExpenses.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  tbody.innerHTML = periodExpenses
    .map((e) => {
      const catInfo = EXPENSE_CATEGORIES[e.category] || EXPENSE_CATEGORIES.other;
      let scopeLabel = typeof window.t === "function"
        ? window.t("finance_general_overhead", "🏢 General Overhead")
        : "🏢 General Overhead";
      if (e.relatedProduct && e.relatedProduct !== "all") {
        const prod = products.find((p) => p.id === e.relatedProduct);
        scopeLabel = prod ? `📦 ${prod.name}` : `📦 ${e.relatedProduct}`;
      }

      return `
      <tr>
        <td style="white-space: nowrap; color: #5a7571; font-weight: 500;">${e.date}</td>
        <td>
          <span class="expense-cat-chip ${catInfo.cls}">${catInfo.label}</span>
        </td>
        <td style="color: #173f39; font-weight: 500;">${e.description || "—"}</td>
        <td style="font-size: 11.5px; color: #5a7571;">${scopeLabel}</td>
        <td style="text-align: right; font-weight: 700; color: #d9741d; white-space: nowrap;">${formatINR(e.amount)}</td>
        <td style="text-align: center; white-space: nowrap;">
          <button type="button" class="expense-action-btn" onclick="openExpenseModal('${e.id}')" title="Edit expense">✏️</button>
          <button type="button" class="expense-action-btn" onclick="deleteExpense('${e.id}')" title="Delete expense">🗑️</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

function renderFinance() {
  const host = document.getElementById("finance");
  if (!host) return;

  const products = typeof catalogProducts !== "undefined" && catalogProducts.length ? catalogProducts : DEFAULT_PRODUCTS;
  const orders = typeof loadOrders === "function" ? loadOrders() : [];
  const expenses = loadFinanceExpenses();

  // Populate selectors
  populateFinanceProductDropdowns(products);

  // Synchronize dropdown value
  const prodFilterEl = document.getElementById("financeProductFilter");
  if (prodFilterEl) prodFilterEl.value = financeActiveProduct;

  const badgeEl = document.getElementById("financeScopeBadge");
  const tFn = typeof window.t === "function" ? window.t.bind(window) : (k, fb) => fb;
  if (badgeEl) {
    if (financeActiveProduct === "all") {
      badgeEl.textContent = tFn("finance_consolidated", "Consolidated Business");
    } else {
      const p = products.find((x) => x.id === financeActiveProduct);
      badgeEl.textContent = p ? `${tFn("finance_product_prefix", "Product:")} ${p.name}` : tFn("finance_product_prefix", "Product:");
    }
  }

  // Calculate dates
  const bounds = getPeriodDateBounds(financeActivePeriod, financeCustomStart, financeCustomEnd);

  // Update Period display strip
  const tFn2 = typeof window.t === "function" ? window.t.bind(window) : (k, fb) => fb;
  const curTextEl = document.getElementById("financeCurrentRangeText");
  const compTextEl = document.getElementById("financeCompareRangeText");
  if (curTextEl) {
    curTextEl.textContent = `${tFn2("finance_period_prefix", "📅 Period:")} ${formatDisplayDate(bounds.currStart)} – ${formatDisplayDate(bounds.currEnd)}`;
  }
  if (compTextEl) {
    compTextEl.textContent = `${tFn2("finance_vs_period", "vs. Preceding Period")} (${formatDisplayDate(bounds.prevStart)} – ${formatDisplayDate(bounds.prevEnd)})`;
  }

  // 1. Calculate metrics for current and previous periods
  const currMetrics = calculateFinanceMetrics(bounds.currStartStr, bounds.currEndStr, financeActiveProduct, orders, expenses, products);
  const prevMetrics = calculateFinanceMetrics(bounds.prevStartStr, bounds.prevEndStr, financeActiveProduct, orders, expenses, products);

  // 2. Render 3 Summary Cards
  renderFinanceSummaryCards(currMetrics, prevMetrics);

  // 3. Render Chart
  renderFinanceSVGChart(bounds, financeActivePeriod, financeActiveProduct, orders, expenses, products);

  // 4. Render Product Profitability Table
  renderProductProfitTable(bounds.currStartStr, bounds.currEndStr, financeActiveProduct, orders, expenses, products);

  // 5. Render Expenses Log Table
  renderExpensesLogTable(bounds.currStartStr, bounds.currEndStr, financeActiveProduct, expenses, products);
}

/* User Interaction Handlers */
function setFinancePeriod(period, btnEl) {
  financeActivePeriod = period;
  const tabs = document.querySelectorAll("#financePeriodTabs .finance-tab");
  tabs.forEach((t) => t.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");

  const customRow = document.getElementById("financeCustomDateRow");
  if (customRow) {
    customRow.style.display = period === "custom" ? "flex" : "none";
    if (period === "custom" && (!financeCustomStart || !financeCustomEnd)) {
      const ref = getFinanceRefDate();
      const endStr = toISODateStr(ref);
      const startD = new Date(ref);
      startD.setDate(ref.getDate() - 14);
      const startStr = toISODateStr(startD);

      const sInput = document.getElementById("financeDateStart");
      const eInput = document.getElementById("financeDateEnd");
      if (sInput) sInput.value = startStr;
      if (eInput) eInput.value = endStr;
      financeCustomStart = startStr;
      financeCustomEnd = endStr;
    }
  }

  renderFinance();
}

function applyCustomDateRange() {
  const sInput = document.getElementById("financeDateStart");
  const eInput = document.getElementById("financeDateEnd");
  if (!sInput || !eInput || !sInput.value || !eInput.value) {
    alert("Please select both start and end dates.");
    return;
  }
  if (sInput.value > eInput.value) {
    alert("Start date cannot be after end date.");
    return;
  }
  financeCustomStart = sInput.value;
  financeCustomEnd = eInput.value;
  renderFinance();
}

function onFinanceProductChange(val) {
  financeActiveProduct = val;
  renderFinance();
}

function resetFinanceProductFilter() {
  financeActiveProduct = "all";
  const filterSel = document.getElementById("financeProductFilter");
  if (filterSel) filterSel.value = "all";
  renderFinance();
}

function selectProductForBreakdown(productId) {
  financeActiveProduct = productId;
  const filterSel = document.getElementById("financeProductFilter");
  if (filterSel) filterSel.value = productId;
  renderFinance();

  // Smooth scroll to top of finance section
  const financeSec = document.getElementById("finance");
  if (financeSec) {
    financeSec.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/* Expense Management Modal Functions */
function openExpenseModal(editId = null) {
  if (typeof requireUserAuth === "function" && !requireUserAuth("Record Workshop Expense")) return;
  const modal = document.getElementById("expenseModal");
  if (!modal) return;

  const titleEl = document.getElementById("expenseModalTitle");
  const editIdEl = document.getElementById("expenseEditId");
  const catEl = document.getElementById("expenseCategory");
  const amtEl = document.getElementById("expenseAmount");
  const dateEl = document.getElementById("expenseDate");
  const prodEl = document.getElementById("expenseRelatedProduct");
  const descEl = document.getElementById("expenseDescription");
  const errEl = document.getElementById("expenseFormError");

  if (errEl) errEl.style.display = "none";

  const products = typeof catalogProducts !== "undefined" && catalogProducts.length ? catalogProducts : DEFAULT_PRODUCTS;
  populateFinanceProductDropdowns(products);

  if (editId) {
    const expenses = loadFinanceExpenses();
    const item = expenses.find((e) => e.id === editId);
    if (item) {
      if (titleEl) titleEl.textContent = "Edit Business Expense";
      if (editIdEl) editIdEl.value = item.id;
      if (catEl) catEl.value = item.category || "other";
      if (amtEl) amtEl.value = item.amount || "";
      if (dateEl) dateEl.value = item.date || toISODateStr(getFinanceRefDate());
      if (prodEl) prodEl.value = item.relatedProduct || "all";
      if (descEl) descEl.value = item.description || "";
    }
  } else {
    if (titleEl) titleEl.textContent = "Record Business Expense";
    if (editIdEl) editIdEl.value = "";
    if (catEl) catEl.value = "raw_materials";
    if (amtEl) amtEl.value = "";
    if (dateEl) dateEl.value = toISODateStr(getFinanceRefDate());
    if (prodEl) prodEl.value = financeActiveProduct !== "all" ? financeActiveProduct : "all";
    if (descEl) descEl.value = "";
  }

  modal.classList.add("active");
}

function closeExpenseModal() {
  const modal = document.getElementById("expenseModal");
  if (modal) modal.classList.remove("active");
}

function handleExpenseModalBackdrop(event) {
  if (event.target === document.getElementById("expenseModal")) {
    closeExpenseModal();
  }
}

async function handleExpenseFormSubmit(event) {
  event.preventDefault();

  const editId = document.getElementById("expenseEditId")?.value;
  const category = document.getElementById("expenseCategory")?.value;
  const amount = Number(document.getElementById("expenseAmount")?.value);
  const date = document.getElementById("expenseDate")?.value;
  const relatedProduct = document.getElementById("expenseRelatedProduct")?.value || "all";
  const description = String(document.getElementById("expenseDescription")?.value || "").trim();
  const errEl = document.getElementById("expenseFormError");

  // Validation
  if (!category) {
    showExpenseError("Please choose an expense category.");
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    showExpenseError("Please enter a valid expense amount greater than 0.");
    return;
  }
  if (!date) {
    showExpenseError("Please choose a valid expense date.");
    return;
  }
  if (!description) {
    showExpenseError("Please enter a description for the expense.");
    return;
  }

  const expenses = loadFinanceExpenses();

  if (editId) {
    const idx = expenses.findIndex((e) => e.id === editId);
    if (idx !== -1) {
      expenses[idx] = {
        ...expenses[idx],
        category,
        amount,
        date,
        relatedProduct,
        description,
        updatedAt: new Date().toISOString()
      };
      saveFinanceExpenses(expenses);
      // Sync update with backend
      fetch(`/api/expenses/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenses[idx])
      }).catch(() => {});
    }
  } else {
    const newExpense = {
      id: "exp_" + Date.now(),
      category,
      amount,
      date,
      relatedProduct,
      description,
      createdAt: new Date().toISOString()
    };
    expenses.unshift(newExpense);
    saveFinanceExpenses(expenses);

    // Sync add with backend
    fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newExpense)
    }).catch(() => {});

    if (typeof logAction === "function") {
      logAction("Recorded expense", `${description} (₹${amount})`);
    }
  }

  closeExpenseModal();
  renderFinance();
}

function showExpenseError(msg) {
  const errEl = document.getElementById("expenseFormError");
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = "block";
  } else {
    alert(msg);
  }
}

async function deleteExpense(id) {
  if (typeof requireUserAuth === "function" && !requireUserAuth("Delete Expense Record")) return;
  if (!confirm("Are you sure you want to delete this expense record?")) return;

  let expenses = loadFinanceExpenses();
  expenses = expenses.filter((e) => e.id !== id);
  saveFinanceExpenses(expenses);

  fetch(`/api/expenses/${id}`, { method: "DELETE" }).catch(() => {});

  renderFinance();
}

// Expose globals for HTML onclick attributes
window.renderFinance = renderFinance;
window.setFinancePeriod = setFinancePeriod;
window.applyCustomDateRange = applyCustomDateRange;
window.onFinanceProductChange = onFinanceProductChange;
window.resetFinanceProductFilter = resetFinanceProductFilter;
window.selectProductForBreakdown = selectProductForBreakdown;
window.openExpenseModal = openExpenseModal;
window.closeExpenseModal = closeExpenseModal;
window.handleExpenseModalBackdrop = handleExpenseModalBackdrop;
window.handleExpenseFormSubmit = handleExpenseFormSubmit;
window.deleteExpense = deleteExpense;



window.addEventListener("online", () => {
  updateConnectivityBadge();
  flushSyncQueue();
});
window.addEventListener("offline", updateConnectivityBadge);

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.CC_USER) {
    try {
      const res = await fetch("/api/me");
      const data = await res.json();
      window.CC_USER = data.user;
    } catch {
      window.CC_USER = null;
    }
  }
  applyAuthUi();
  seedNotifications();
  renderNotifications();
  renderActionLogs();
  renderMaterials();
  renderSchemes();
  renderForum();
  updateConnectivityBadge();
  flushSyncQueue();
  const region = document.getElementById("artisanRegionSelect");
  if (region) {
    if (window.CC_USER && /gujarat/i.test(window.CC_USER.state || "")) region.value = "gujarat";
    else if (window.CC_USER && /delhi/i.test(window.CC_USER.state || "")) region.value = "delhi";
    filterMarketsByRegion(region.value);
  }
  if (document.getElementById("artisanQr")) renderArtisanQr();
  renderFinance();
  if (typeof setHomeGreeting === "function") setHomeGreeting();
  const schemeModal = document.getElementById("schemeDetailModal");
  if (schemeModal) {
    schemeModal.addEventListener("click", (e) => {
      if (e.target === schemeModal) closeSchemeModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && typeof closeSchemeModal === "function") closeSchemeModal();
  });
});
