/**
 * CraftConnect - Smart Market Linkage & Marketplace Discovery Platform
 * Client-Side Application Controller
 */

(function () {
  // Global State
  const state = {
    lat: null,
    lng: null,
    city: "Bhopal",
    stateName: "Madhya Pradesh",
    locationSource: "default", // "gps" | "manual" | "default"
    category: "all",
    radius: 25,
    hasContactOnly: false,
    activeTab: "all",
    placesData: null,
    eventsData: null,
    platformsData: null,
    connectionsData: [],
    isLoadingPlaces: false,
    isLoadingEvents: false,
    isLoadingPlatforms: false,
    isLoadingConnections: false
  };

  window.CraftMarketDiscovery = {
    getState: () => ({ ...state }),
    init,
    requestGPSLocation,
    promptManualLocation,
    searchManualCity,
    setCategory,
    setRadius,
    toggleContactOnly,
    switchTab,
    refreshAll,
    loadPlaces,
    loadEvents,
    loadPlatforms,
    loadConnections,
    openOnboardingModal,
    closeOnboardingModal,
    openApiConfigModal,
    closeApiConfigModal,
    updateOnboardingStage,
    saveApiCredentials,
    disconnectPlatform
  };

  document.addEventListener("DOMContentLoaded", () => {
    init();
  });

  function init() {
    // If artisan profile has craft category or state, adapt defaults
    if (window.CC_USER) {
      if (window.CC_USER.craft) {
        const c = window.CC_USER.craft.toLowerCase();
        if (c.includes("pottery") || c.includes("terracotta") || c.includes("clay")) state.category = "pottery";
        else if (c.includes("textile") || c.includes("handloom") || c.includes("weave") || c.includes("chanderi") || c.includes("zardozi")) state.category = "textiles";
        else if (c.includes("bamboo") || c.includes("wood") || c.includes("cane")) state.category = "bamboo";
        else if (c.includes("jewel") || c.includes("bead")) state.category = "jewellery";
        else if (c.includes("paint") || c.includes("gond") || c.includes("art")) state.category = "paintings";
      }
      if (window.CC_USER.state && !state.lat) {
        state.stateName = window.CC_USER.state;
      }
    }

    // Set initial filter dropdown values if elements exist
    const catSelect = document.getElementById("marketCategorySelect");
    if (catSelect) catSelect.value = state.category;

    const radSelect = document.getElementById("marketRadiusSelect");
    if (radSelect) radSelect.value = String(state.radius);

    updateLocationDisplay();
    refreshAll();
  }

  /* ================= 1. LOCATION & GEOCODING ================= */

  function updateLocationDisplay() {
    const displays = document.querySelectorAll(".market-location-text");
    const fullLoc = state.city + (state.stateName ? `, ${state.stateName}` : "");
    displays.forEach(el => { el.innerText = fullLoc; });

    const statusBadge = document.getElementById("marketLocationBadge");
    const statusDot = document.getElementById("marketStatusDot");
    const statusText = document.getElementById("marketStatusText");

    if (state.locationSource === "gps") {
      if (statusBadge) statusBadge.className = "loc-badge loc-badge-gps";
      if (statusDot) statusDot.style.backgroundColor = "#2E7D32";
      if (statusText) statusText.innerText = "GPS Active • Real Coordinates";
    } else if (state.locationSource === "manual") {
      if (statusBadge) statusBadge.className = "loc-badge loc-badge-manual";
      if (statusDot) statusDot.style.backgroundColor = "#075C55";
      if (statusText) statusText.innerText = "Manual Location Set";
    } else {
      if (statusBadge) statusBadge.className = "loc-badge loc-badge-default";
      if (statusDot) statusDot.style.backgroundColor = "#F36B21";
      if (statusText) statusText.innerText = "Default Location • Tap 'Use My GPS'";
    }

    // Also update legacy display elements if present on page
    const legacyLoc = document.getElementById("locationDisplay");
    if (legacyLoc) legacyLoc.innerText = fullLoc;
    const legacyDot = document.getElementById("statusDot");
    if (legacyDot) legacyDot.style.backgroundColor = state.locationSource === "gps" ? "#2E7D32" : "#075C55";
    const legacyStatus = document.getElementById("statusText");
    if (legacyStatus) legacyStatus.innerText = state.locationSource === "gps" ? "GPS active • Real coordinates verified" : "Manual location set";
  }

  function requestGPSLocation() {
    const banner = document.getElementById("marketLocationBanner");
    const statusText = document.getElementById("marketStatusText");
    const statusDot = document.getElementById("marketStatusDot");

    if (!navigator.geolocation) {
      showLocationError("Geolocation is not supported by your browser. Please enter your city manually.");
      return;
    }

    if (statusText) statusText.innerText = "Detecting GPS coordinates...";
    if (statusDot) statusDot.style.backgroundColor = "#F36B21";

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        state.lat = pos.coords.latitude;
        state.lng = pos.coords.longitude;
        state.locationSource = "gps";

        try {
          // Reverse geocode via server-side endpoint
          const res = await fetch(`/api/markets/geocode?lat=${state.lat}&lng=${state.lng}`);
          const data = await res.json();
          if (data.ok && data.city) {
            state.city = data.city;
            state.stateName = data.state || "";
          }
        } catch (err) {
          console.warn("[MarketDiscovery] Reverse geocoding fallback:", err);
        }

        updateLocationDisplay();
        hideLocationError();
        refreshAll();
      },
      (err) => {
        console.warn("[MarketDiscovery] GPS permission denied or error:", err);
        state.locationSource = "default";
        updateLocationDisplay();
        let message = "Location permission was denied. Please enter your city or district name manually below.";
        if (err.code === 2) message = "Unable to determine your GPS location. Please enter your city name manually.";
        if (err.code === 3) message = "GPS detection timed out. Please enter your city name manually.";
        showLocationError(message);
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  }

  function showLocationError(msg) {
    const errorBox = document.getElementById("marketLocationErrorBox");
    if (errorBox) {
      errorBox.innerHTML = `
        <div style="background: #FEF2F2; border: 1px solid #FCA5A5; color: #991B1B; padding: 12px 16px; border-radius: 12px; font-size: 13.5px; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span>⚠️</span>
            <span>${msg}</span>
          </div>
          <button type="button" onclick="CraftMarketDiscovery.promptManualLocation()" style="background: #075C55; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">Enter City</button>
        </div>
      `;
      errorBox.style.display = "block";
    }
  }

  function hideLocationError() {
    const errorBox = document.getElementById("marketLocationErrorBox");
    if (errorBox) errorBox.style.display = "none";
  }

  async function searchManualCity(cityName) {
    if (!cityName || !cityName.trim()) return;
    const clean = cityName.trim();

    try {
      const res = await fetch(`/api/markets/geocode?query=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "Location not found in India. Please check city spelling.");
        return;
      }

      state.lat = data.lat;
      state.lng = data.lng;
      state.city = data.city;
      state.stateName = data.state || "";
      state.locationSource = "manual";

      updateLocationDisplay();
      hideLocationError();
      refreshAll();
    } catch (err) {
      alert("Error searching location. Please try again.");
    }
  }

  function promptManualLocation() {
    const manual = prompt("Enter your city and state in India (e.g., Bhopal, Jaipur, Udaipur, Madurai):", state.city);
    if (manual) {
      searchManualCity(manual);
    }
  }

  function setCategory(cat) {
    state.category = cat;
    refreshAll();
  }

  function setRadius(rad) {
    state.radius = parseInt(rad, 10) || 25;
    loadPlaces();
    loadEvents();
  }

  function toggleContactOnly(hasContact) {
    state.hasContactOnly = Boolean(hasContact);
    loadPlaces();
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    const tabButtons = document.querySelectorAll(".market-tab-btn");
    tabButtons.forEach(btn => {
      const isTarget = btn.getAttribute("data-tab") === tabId;
      btn.classList.toggle("active", isTarget);
    });

    const sections = {
      local: document.getElementById("marketLocalSection"),
      events: document.getElementById("marketEventsSection"),
      digital: document.getElementById("marketDigitalSection"),
      connections: document.getElementById("marketConnectionsSection")
    };

    if (tabId === "all") {
      Object.values(sections).forEach(sec => { if (sec) sec.style.display = "block"; });
    } else {
      Object.keys(sections).forEach(key => {
        if (sections[key]) {
          sections[key].style.display = key === tabId ? "block" : "none";
        }
      });
    }
  }

  function refreshAll() {
    loadPlaces();
    loadEvents();
    loadPlatforms();
    loadConnections();
  }

  /* ================= 2. LOCAL RETAIL & SHOPS ================= */

  async function loadPlaces() {
    const container = document.getElementById("localMarketsList");
    const countBadge = document.getElementById("localMarketsCount");
    const loadingEl = document.getElementById("localLoading");
    const setupBanner = document.getElementById("placesSetupBanner");

    if (!container) return;
    if (loadingEl) loadingEl.style.display = "block";
    container.innerHTML = getLoadingSkeletonHtml(3);

    try {
      let url = `/api/markets/nearby?city=${encodeURIComponent(state.city)}&category=${encodeURIComponent(state.category)}&radius=${state.radius}&hasContact=${state.hasContactOnly}`;
      if (state.lat != null && state.lng != null) {
        url += `&lat=${state.lat}&lng=${state.lng}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      state.placesData = data;

      // Handle Places API Setup State Banner
      if (setupBanner) {
        if (!data.configured) {
          setupBanner.innerHTML = `
            <div class="setup-state-box">
              <div class="setup-header">
                <span class="setup-icon">ℹ️</span>
                <div>
                  <strong>Google Places API Setup Mode:</strong> ${data.setupMessage || "GOOGLE_PLACES_API_KEY is not configured in .env."}
                </div>
              </div>
              <div class="setup-actions">
                <a href="${data.directMapQuery}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-teal btn-sm">
                  🔍 Live Google Maps Discovery for "${state.category}" in ${state.city} ↗
                </a>
              </div>
            </div>
          `;
          setupBanner.style.display = "block";
        } else {
          setupBanner.style.display = "none";
        }
      }

      const places = data.places || data.localMarkets || [];
      if (countBadge) {
        countBadge.innerText = `${places.length} Retail Opportunities (${state.radius} km)`;
      }

      if (places.length === 0) {
        container.innerHTML = `
          <div class="empty-state-card">
            <span style="font-size: 32px;">🏪</span>
            <h3>No retail craft partners found within ${state.radius} km of ${state.city}</h3>
            <p style="color: #64748B; font-size: 13.5px; max-width: 480px; margin: 6px auto 16px;">
              Try increasing your discovery radius or search directly on Google Maps for craft boutiques and souvenir shops in this area.
            </p>
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
              <button type="button" class="btn btn-teal btn-sm" onclick="CraftMarketDiscovery.setRadius(50)">Try 50 km Radius</button>
              <a href="${data.directMapQuery}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-teal btn-sm">
                Search on Google Maps ↗
              </a>
            </div>
          </div>
        `;
        return;
      }

      container.innerHTML = places.map(p => `
        <div class="market-card local-card">
          <div class="card-header-row">
            <span class="type-pill">🏪 ${p.retailType || p.types?.[0] || 'Artisan Retail Partner'}</span>
            <span class="distance-pill">📍 ${p.distanceText}</span>
          </div>
          <h3 class="card-title">${escapeHtml(p.name)}</h3>
          <p class="card-address">
            <strong>Address:</strong> ${escapeHtml(p.address || p.city || 'Local area')}<br>
            ${p.timings ? `🕒 <strong>Timings:</strong> ${escapeHtml(p.timings)}<br>` : ''}
            ${p.organizer ? `🏛️ <strong>Authority:</strong> ${escapeHtml(p.organizer)}<br>` : ''}
            ${p.phone ? `📞 <strong>Contact:</strong> <a href="tel:${escapeHtml(p.phone)}" style="color:#075C55; font-weight:600;">${escapeHtml(p.phone)}</a><br>` : ''}
          </p>
          <div class="card-disclaimer">
            💡 <em>Potential retail partner / shelf-space opportunity. Not a guaranteed buyer.</em>
          </div>
          ${p.notes ? `<div class="card-notes">${escapeHtml(p.notes)}</div>` : ''}
          <div class="card-actions-row">
            <a href="${p.mapSearchUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-teal btn-sm" style="flex:1;">
              🗺️ View Map
            </a>
            <a href="${p.directionsUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-teal btn-sm" style="flex:1;">
              🧭 Get Directions
            </a>
            ${p.website ? `
              <a href="${p.website}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-teal btn-sm" title="Visit Business Website">
                🌐 Website ↗
              </a>
            ` : ''}
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error("[MarketDiscovery] Failed to load places:", err);
      container.innerHTML = `
        <div class="error-state-card">
          <p>⚠️ Error discovering nearby physical markets. Please retry.</p>
          <button type="button" class="btn btn-teal btn-sm" onclick="CraftMarketDiscovery.loadPlaces()">Retry Discovery</button>
        </div>
      `;
    } finally {
      if (loadingEl) loadingEl.style.display = "none";
    }
  }

  /* ================= 3. FAIRS & EXHIBITIONS ================= */

  async function loadEvents() {
    const container = document.getElementById("marketEventsList");
    const countBadge = document.getElementById("marketEventsCount");
    const loadingEl = document.getElementById("eventsLoading");

    if (!container) return;
    if (loadingEl) loadingEl.style.display = "block";
    container.innerHTML = getLoadingSkeletonHtml(2);

    try {
      let url = `/api/markets/events?category=${encodeURIComponent(state.category)}&upcomingOnly=true`;
      if (state.lat != null && state.lng != null) {
        url += `&lat=${state.lat}&lng=${state.lng}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      state.eventsData = data;

      const events = data.events || [];
      if (countBadge) {
        countBadge.innerText = `${events.length} Verified Exhibitions`;
      }

      if (events.length === 0) {
        container.innerHTML = `
          <div class="empty-state-card">
            <span style="font-size: 32px;">🎪</span>
            <h3>No upcoming craft exhibitions found for this category</h3>
            <p style="color: #64748B; font-size: 13.5px; margin: 6px auto 14px;">
              Check the official Ministry of Textiles portal for seasonal notifications.
            </p>
            <a href="https://indian.handicrafts.gov.in/" target="_blank" rel="noopener noreferrer" class="btn btn-teal btn-sm">
              Visit DC (Handicrafts) Portal ↗
            </a>
          </div>
        `;
        return;
      }

      container.innerHTML = events.map(ev => `
        <div class="market-card event-card">
          <div class="card-header-row">
            <span class="status-badge ${ev.badgeClass}">${ev.label}</span>
            <span class="distance-pill">📍 ${ev.distanceText}</span>
          </div>
          <h3 class="card-title">${escapeHtml(ev.name)}</h3>
          <p class="card-meta">
            📍 <strong>Venue:</strong> ${escapeHtml(ev.venue)}, ${escapeHtml(ev.city)}<br>
            📅 <strong>Event Dates:</strong> ${formatDate(ev.startDate)} – ${formatDate(ev.endDate)}<br>
            ⏰ <strong>Application Deadline:</strong> <span style="color: #B45309; font-weight: 700;">${formatDate(ev.applicationDeadline)}</span><br>
            🏛️ <strong>Organizer:</strong> ${escapeHtml(ev.organizer)}
          </p>
          <div class="craft-eligibility-box">
            <strong>Eligible Artisans:</strong> ${escapeHtml(ev.eligibleCraftsText)}<br>
            <em>Stall Terms: ${escapeHtml(ev.stallFeePolicy)}</em>
          </div>
          <div class="card-verification-meta">
            <span>✓ Verified via ${escapeHtml(ev.verificationSource)}</span>
            <span>Ref: ${ev.lastVerifiedDate}</span>
          </div>
          <div class="card-actions-row">
            <a href="${ev.applicationUrl || ev.officialUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-orange btn-sm" style="flex:1;">
              📝 Apply on Official Portal ↗
            </a>
            <a href="${ev.directionsUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-teal btn-sm">
              🧭 Venue Map
            </a>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error("[MarketDiscovery] Failed to load events:", err);
      container.innerHTML = `<p style="color:red; text-align:center;">Failed to load verified exhibitions.</p>`;
    } finally {
      if (loadingEl) loadingEl.style.display = "none";
    }
  }

  /* ================= 4. ONLINE MARKETPLACES ================= */

  async function loadPlatforms() {
    const container = document.getElementById("digitalMarketsList");
    const countBadge = document.getElementById("digitalMarketsCount");
    const loadingEl = document.getElementById("digitalLoading");

    if (!container) return;
    if (loadingEl) loadingEl.style.display = "block";
    container.innerHTML = getLoadingSkeletonHtml(3);

    try {
      const res = await fetch(`/api/markets/platforms?category=${encodeURIComponent(state.category)}`);
      const platforms = await res.json();
      state.platformsData = platforms;

      if (countBadge) countBadge.innerText = `${platforms.length} Selling Channels`;

      container.innerHTML = platforms.map(p => {
        const isConnected = p.connectionStatus === 'connected';
        const hasExternalReg = p.connectionStatus === 'external_registration';
        const isAwaiting = p.connectionStatus === 'awaiting_approval';

        let connBadge = '<span class="status-badge badge-not-started">Seller Registration Required</span>';
        if (isConnected) connBadge = '<span class="status-badge badge-connected">✓ Authorized Integration</span>';
        else if (isAwaiting) connBadge = '<span class="status-badge badge-awaiting">Awaiting API Approval</span>';
        else if (hasExternalReg) connBadge = '<span class="status-badge badge-external">External Registration Active</span>';

        return `
          <div class="market-card digital-platform-card" id="card-${p.id}">
            <div class="card-header-row">
              <span class="platform-logo-badge" style="background:${p.logoColor}15; color:${p.logoColor}; border:1px solid ${p.logoColor}40;">
                ${escapeHtml(p.shortName || p.name)}
              </span>
              <span class="match-tier-badge">${escapeHtml(p.matchTier)}</span>
            </div>
            <h3 class="card-title">${escapeHtml(p.name)}</h3>
            <div class="match-explain-box">
              <strong>Why This Fits:</strong> ${escapeHtml(p.matchReason)}
            </div>
            <div class="fee-transparency-box">
              <strong>Fee Structure:</strong> ${escapeHtml(p.feeStructure.summary)}<br>
              <span style="font-size:12px; color:#64748B;">${escapeHtml(p.feeStructure.waiverNotes)}</span>
            </div>
            <div class="documents-required-box">
              <span style="font-size:12px; font-weight:700; color:#334155;">Required Onboarding Documents:</span>
              <ul style="margin:4px 0 0 16px; padding:0; font-size:12px; color:#475569;">
                ${p.eligibilityRequirements.map(doc => `<li>${escapeHtml(doc)}</li>`).join('')}
              </ul>
            </div>
            <div class="connection-status-row">
              <span style="font-size:12px; color:#475569;">Status:</span>
              ${connBadge}
            </div>
            <div class="card-actions-row">
              <a href="${p.sellerUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-teal btn-sm" style="flex:1;">
                ${escapeHtml(p.actionLabel || 'Visit Official Seller Portal ↗')}
              </a>
              <button type="button" class="btn btn-outline-teal btn-sm" onclick="CraftMarketDiscovery.openOnboardingModal('${p.id}')">
                📋 Onboarding Checklist
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error("[MarketDiscovery] Failed to load platforms:", err);
      container.innerHTML = `<p style="color:red; text-align:center;">Failed to load online marketplace catalog.</p>`;
    } finally {
      if (loadingEl) loadingEl.style.display = "none";
    }
  }

  /* ================= 5. MY MARKETPLACE CONNECTIONS ================= */

  async function loadConnections() {
    const container = document.getElementById("marketConnectionsList");
    const countBadge = document.getElementById("marketConnectionsCount");

    if (!container) return;

    try {
      const res = await fetch("/api/markets/connections");
      const data = await res.json();
      const connections = data.connections || [];
      state.connectionsData = connections;

      if (countBadge) countBadge.innerText = `${connections.length} Accounts Tracked`;

      if (connections.length === 0) {
        container.innerHTML = `
          <div class="empty-state-card" style="padding: 24px; border: 1.5px dashed #CBD5E1;">
            <span style="font-size: 28px;">🔗</span>
            <h4 style="margin: 6px 0; color: #0F172A;">No Marketplace Connections Configured Yet</h4>
            <p style="color: #64748B; font-size: 13px; max-width: 520px; margin: 0 auto 14px;">
              CraftConnect never fabricates connected seller accounts. Use the Onboarding Checklist on any marketplace above to track your external registration or configure authorized developer API credentials.
            </p>
            <button type="button" class="btn btn-teal btn-sm" onclick="CraftMarketDiscovery.switchTab('digital')">
              Browse Online Marketplaces →
            </button>
          </div>
        `;
        return;
      }

      container.innerHTML = connections.map(conn => {
        let statusClass = "badge-not-started";
        let statusTitle = "Not Started";
        if (conn.status === "connected") { statusClass = "badge-connected"; statusTitle = "✓ Connected (Authorized API)"; }
        else if (conn.status === "external_registration") { statusClass = "badge-external"; statusTitle = "External Registration Active"; }
        else if (conn.status === "awaiting_approval") { statusClass = "badge-awaiting"; statusTitle = "Awaiting API Approval"; }
        else if (conn.status === "error") { statusClass = "badge-apply-closed"; statusTitle = "Needs Attention"; }

        return `
          <div class="market-card connection-card">
            <div class="card-header-row">
              <strong style="color: #075C55; font-size: 16px;">${escapeHtml(conn.platformName)}</strong>
              <span class="status-badge ${statusClass}">${statusTitle}</span>
            </div>
            <p class="card-meta" style="margin: 8px 0;">
              ${conn.merchantId ? `🔑 <strong>Merchant / Seller ID:</strong> <code>${escapeHtml(conn.merchantId)}</code><br>` : ''}
              ${conn.sellerStoreName ? `🏪 <strong>Store Name:</strong> ${escapeHtml(conn.sellerStoreName)}<br>` : ''}
              🕒 <strong>Last Updated:</strong> ${new Date(conn.updatedAt).toLocaleString()}<br>
              📡 <strong>API Authorization:</strong> ${conn.apiConfig?.isAuthorized ? '✓ Authorized via Developer Credentials' : 'External Account (Portal Managed)'}
            </p>
            ${conn.onboardingNotes ? `<div class="card-notes"><strong>Notes:</strong> ${escapeHtml(conn.onboardingNotes)}</div>` : ''}
            <div class="card-actions-row">
              <button type="button" class="btn btn-outline-teal btn-sm" onclick="CraftMarketDiscovery.openOnboardingModal('${conn.platformId}')">
                Update Stage
              </button>
              <button type="button" class="btn btn-outline-teal btn-sm" onclick="CraftMarketDiscovery.openApiConfigModal('${conn.platformId}')">
                ⚙️ API Settings
              </button>
              <button type="button" class="btn btn-outline-red btn-sm" onclick="CraftMarketDiscovery.disconnectPlatform('${conn.platformId}')">
                Disconnect
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error("[MarketDiscovery] Failed to load connections:", err);
    }
  }

  /* ================= 6. MODALS & ONBOARDING WORKFLOW ================= */

  function openOnboardingModal(platformId) {
    const platform = (state.platformsData || []).find(p => p.id === platformId);
    if (!platform) return;

    const modal = document.getElementById("marketOnboardingModal");
    if (!modal) return;

    const existingConn = (state.connectionsData || []).find(c => c.platformId === platformId);

    document.getElementById("onboardingModalPlatformName").innerText = platform.name;
    document.getElementById("onboardingModalPlatformType").innerText = platform.badgeLabel;
    document.getElementById("onboardingModalSellerUrl").href = platform.sellerUrl;

    const docsContainer = document.getElementById("onboardingModalDocsList");
    if (docsContainer) {
      docsContainer.innerHTML = platform.eligibilityRequirements.map(doc => `
        <li style="padding: 6px 0; border-bottom: 1px solid #F1F5F9; display: flex; align-items: flex-start; gap: 8px; font-size: 13px;">
          <span style="color:#075C55; font-weight:bold;">✓</span>
          <span>${escapeHtml(doc)}</span>
        </li>
      `).join('');
    }

    const feeContainer = document.getElementById("onboardingModalFeeInfo");
    if (feeContainer) {
      feeContainer.innerHTML = `
        <strong>Fee Policy:</strong> ${escapeHtml(platform.feeStructure.summary)}<br>
        <span style="font-size: 12px; color: #64748B;">${escapeHtml(platform.feeStructure.waiverNotes)}</span>
      `;
    }

    const stageSelect = document.getElementById("onboardingStageSelect");
    if (stageSelect) {
      stageSelect.value = existingConn ? existingConn.status : "external_registration";
    }

    const merchantInput = document.getElementById("onboardingMerchantIdInput");
    if (merchantInput) {
      merchantInput.value = existingConn?.merchantId || "";
    }

    modal.setAttribute("data-platform-id", platformId);
    modal.style.display = "flex";
  }

  function closeOnboardingModal() {
    const modal = document.getElementById("marketOnboardingModal");
    if (modal) modal.style.display = "none";
  }

  async function updateOnboardingStage() {
    const modal = document.getElementById("marketOnboardingModal");
    if (!modal) return;
    const platformId = modal.getAttribute("data-platform-id");
    const stageSelect = document.getElementById("onboardingStageSelect");
    const merchantInput = document.getElementById("onboardingMerchantIdInput");

    const status = stageSelect ? stageSelect.value : "external_registration";
    const merchantId = merchantInput ? merchantInput.value.trim() : "";

    try {
      const res = await fetch("/api/markets/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformId,
          status,
          merchantId: merchantId || null,
          onboardingNotes: `Status updated to ${status} by artisan`
        })
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      closeOnboardingModal();
      loadPlatforms();
      loadConnections();
    } catch (err) {
      alert("Failed to update onboarding status: " + err.message);
    }
  }

  function openApiConfigModal(platformId) {
    const platform = (state.platformsData || []).find(p => p.id === platformId);
    const modal = document.getElementById("marketApiConfigModal");
    if (!modal || !platform) return;

    document.getElementById("apiConfigModalPlatformName").innerText = platform.name;
    document.getElementById("apiConfigModalApiName").innerText = platform.apiCapability.apiName;
    document.getElementById("apiConfigModalRequirements").innerText = platform.apiCapability.requirements;
    document.getElementById("apiConfigModalDocLink").href = platform.apiCapability.docUrl;

    modal.setAttribute("data-platform-id", platformId);
    modal.style.display = "flex";
  }

  function closeApiConfigModal() {
    const modal = document.getElementById("marketApiConfigModal");
    if (modal) modal.style.display = "none";
  }

  async function saveApiCredentials() {
    const modal = document.getElementById("marketApiConfigModal");
    if (!modal) return;
    const platformId = modal.getAttribute("data-platform-id");

    const clientIdInput = document.getElementById("apiConfigClientId");
    const clientSecretInput = document.getElementById("apiConfigClientSecret");

    const clientId = clientIdInput ? clientIdInput.value.trim() : "";
    const clientSecret = clientSecretInput ? clientSecretInput.value.trim() : "";

    if (!clientId) {
      alert("Please provide the Developer App / Client ID to authorize direct API integration.");
      return;
    }

    try {
      const res = await fetch("/api/markets/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformId,
          status: "connected",
          apiCredentials: { clientId, clientSecret },
          onboardingNotes: "Authorized via developer credentials"
        })
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      alert(`✅ Developer API configuration saved for ${platformId}. Authorized connection active.`);
      closeApiConfigModal();
      loadPlatforms();
      loadConnections();
    } catch (err) {
      alert("Error saving API credentials: " + err.message);
    }
  }

  async function disconnectPlatform(platformId) {
    if (!confirm(`Are you sure you want to disconnect or reset your connection tracking for this platform?`)) return;

    try {
      const res = await fetch(`/api/markets/connections/${encodeURIComponent(platformId)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      loadPlatforms();
      loadConnections();
    } catch (err) {
      alert("Error disconnecting platform: " + err.message);
    }
  }

  /* ================= 7. HELPERS ================= */

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(dateStr) {
    if (!dateStr) return "TBA";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
    } catch (e) {
      return dateStr;
    }
  }

  function getLoadingSkeletonHtml(count = 2) {
    return Array.from({ length: count }).map(() => `
      <div class="market-card skeleton-card">
        <div class="skeleton-line" style="width: 40%; height: 16px; margin-bottom: 12px;"></div>
        <div class="skeleton-line" style="width: 70%; height: 22px; margin-bottom: 10px;"></div>
        <div class="skeleton-line" style="width: 90%; height: 14px; margin-bottom: 6px;"></div>
        <div class="skeleton-line" style="width: 60%; height: 14px; margin-bottom: 16px;"></div>
        <div class="skeleton-line" style="width: 100%; height: 36px;"></div>
      </div>
    `).join('');
  }

})();
