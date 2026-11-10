/**
 * CraftConnect - Smart Market Linkage & Marketplace Discovery Platform
 * Worldwide Dynamic Local Market Discovery Client Controller
 */

(function () {
  // Global State
  const state = {
    lat: null,
    lng: null,
    city: "Bhopal",
    stateName: "Madhya Pradesh",
    country: "India",
    locationSource: "default", // "gps" | "manual" | "default"
    category: "all",
    radius: 25,
    hasContactOnly: false,
    activeTab: "all",
    placesData: null,
    eventsData: null,
    platformsData: null,
    connectionsData: [],
    allLoadedPlaces: [],
    searchQuery: "",
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
    filterStores,
    searchKeyword,
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

  // Expose modal and preset handlers to window for template compatibility
  window.openCityModal = openCityModal;
  window.closeCityModal = closeCityModal;
  window.applySearchedCity = applySearchedCity;
  window.chooseCityPreset = chooseCityPreset;
  window.updateRadius = function(val) {
    CraftMarketDiscovery.setRadius(val);
  };

  document.addEventListener("DOMContentLoaded", () => {
    init();
  });

  function init() {
    // 1. Check persistent location in localStorage first
    try {
      const saved = localStorage.getItem('craftconnect_artisan_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lat && parsed.lng && parsed.city) {
          state.lat = parsed.lat;
          state.lng = parsed.lng;
          state.city = parsed.city;
          state.stateName = parsed.state || "";
          state.country = parsed.country || "";
          state.locationSource = parsed.locationSource || "manual";
        }
      }
    } catch (e) {
      console.warn("[MarketDiscovery] Failed to parse saved location:", e);
    }

    // 2. Adapt from logged-in artisan profile if not in localStorage
    if (window.CC_USER && !state.lat) {
      if (window.CC_USER.craft) {
        const c = window.CC_USER.craft.toLowerCase();
        if (c.includes("pottery") || c.includes("terracotta") || c.includes("clay")) state.category = "pottery";
        else if (c.includes("textile") || c.includes("handloom") || c.includes("weave") || c.includes("chanderi") || c.includes("zardozi")) state.category = "textiles";
        else if (c.includes("bamboo") || c.includes("wood") || c.includes("cane")) state.category = "bamboo";
        else if (c.includes("jewel") || c.includes("bead")) state.category = "jewellery";
        else if (c.includes("paint") || c.includes("gond") || c.includes("art")) state.category = "paintings";
      }
      if (window.CC_USER.state) {
        state.stateName = window.CC_USER.state;
      }
    }

    // 3. Sync radius dropdown values
    const spaRad = document.getElementById("spaRadiusSelect");
    if (spaRad) spaRad.value = String(state.radius);
    const radSelect = document.getElementById("radiusSelect");
    if (radSelect) radSelect.value = String(state.radius);

    const spaRadLabel = document.getElementById("spaRadiusLabel");
    if (spaRadLabel) spaRadLabel.innerText = `Within ${state.radius} km`;

    updateLocationDisplay();
    refreshAll();
  }

  /* ================= 1. LOCATION & GEOCODING ================= */

  function saveLocationToStorage() {
    try {
      localStorage.setItem('craftconnect_artisan_location', JSON.stringify({
        city: state.city,
        state: state.stateName,
        country: state.country,
        lat: state.lat,
        lng: state.lng,
        locationSource: state.locationSource,
        updatedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.warn("[MarketDiscovery] Failed to save location to localStorage:", e);
    }
  }

  function updateLocationDisplay() {
    const parts = [
      state.city,
      state.stateName && state.stateName !== state.city ? state.stateName : null,
      state.country && state.country !== "India" ? state.country : null
    ].filter(Boolean);
    const fullLoc = parts.join(", ") || "Selected Location";

    // Update all matching elements across both SPA and /markets view
    const targetIds = [
      "spaLocDisplay",
      "currentLocationName",
      "mapLocLabel",
      "demandLocation",
      "locationDisplay"
    ];
    targetIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerText = fullLoc;
    });

    const classEls = document.querySelectorAll(".market-location-text");
    classEls.forEach(el => { el.innerText = fullLoc; });

    // Status badges & indicators
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
      if (statusText) statusText.innerText = "Location Verified";
    } else {
      if (statusBadge) statusBadge.className = "loc-badge loc-badge-default";
      if (statusDot) statusDot.style.backgroundColor = "#F36B21";
      if (statusText) statusText.innerText = "Default • Tap 'Change' to explore";
    }

    const legacyLoc = document.getElementById("locationDisplay");
    if (legacyLoc) legacyLoc.innerText = fullLoc;
  }

  function requestGPSLocation() {
    const statusText = document.getElementById("marketStatusText");
    const statusDot = document.getElementById("marketStatusDot");
    const gpsBtn = document.getElementById("btnUseGps");
    const gpsLabel = document.getElementById("gpsBtnText");

    if (!navigator.geolocation) {
      showLocationError("Geolocation is not supported by your browser. Please enter your city manually.");
      return;
    }

    if (statusText) statusText.innerText = "Detecting GPS coordinates...";
    if (statusDot) statusDot.style.backgroundColor = "#F36B21";
    if (gpsLabel) gpsLabel.innerText = "Locating...";

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
            state.country = data.country || "";
          }
        } catch (err) {
          console.warn("[MarketDiscovery] Reverse geocoding fallback:", err);
        }

        saveLocationToStorage();
        updateLocationDisplay();
        hideLocationError();
        if (gpsBtn) gpsBtn.classList.add("active");
        if (gpsLabel) gpsLabel.innerText = "✓ GPS Active";
        closeCityModal();
        refreshAll();
      },
      (err) => {
        console.warn("[MarketDiscovery] GPS permission denied or error:", err);
        if (gpsLabel) gpsLabel.innerText = "Use GPS";
        let message = "Location permission was denied or timed out. Please enter your city manually below.";
        showLocationError(message);
        openCityModal();
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
            <span>${escapeHtml(msg)}</span>
          </div>
          <button type="button" onclick="openCityModal()" style="background: #075C55; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">Enter City</button>
        </div>
      `;
      errorBox.style.display = "block";
    }
  }

  function hideLocationError() {
    const errorBox = document.getElementById("marketLocationErrorBox");
    if (errorBox) errorBox.style.display = "none";
  }

  // Worldwide Forward Geocoding via Backend
  async function searchManualCity(cityName) {
    if (!cityName || !cityName.trim()) return;
    const clean = cityName.trim();

    const setBtn = document.getElementById("btnSetCityModal");
    if (setBtn) {
      setBtn.disabled = true;
      setBtn.innerText = "Searching...";
    }

    try {
      const res = await fetch(`/api/markets/geocode?query=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!data.ok || !data.lat || !data.lng) {
        alert(data.error || "Location not found. Please enter a valid city, state, or country.");
        return;
      }

      state.lat = data.lat;
      state.lng = data.lng;
      state.city = data.city;
      state.stateName = data.state || "";
      state.country = data.country || "";
      state.locationSource = "manual";

      saveLocationToStorage();
      updateLocationDisplay();
      hideLocationError();
      closeCityModal();

      const gpsBtn = document.getElementById("btnUseGps");
      const gpsLabel = document.getElementById("gpsBtnText");
      if (gpsBtn) gpsBtn.classList.remove("active");
      if (gpsLabel) gpsLabel.innerText = "Use GPS";

      refreshAll();
    } catch (err) {
      alert("Error searching location. Please check your network and try again.");
    } finally {
      if (setBtn) {
        setBtn.disabled = false;
        setBtn.innerText = "Set";
      }
    }
  }

  function chooseCityPreset(city, stateName, lat, lng, country = "") {
    state.city = city;
    state.stateName = stateName;
    state.country = country;
    state.lat = lat;
    state.lng = lng;
    state.locationSource = "manual";

    saveLocationToStorage();
    updateLocationDisplay();
    hideLocationError();
    closeCityModal();

    const gpsBtn = document.getElementById("btnUseGps");
    const gpsLabel = document.getElementById("gpsBtnText");
    if (gpsBtn) gpsBtn.classList.remove("active");
    if (gpsLabel) gpsLabel.innerText = "Use GPS";

    refreshAll();
  }

  function openCityModal() {
    const modal = document.getElementById("cityPickerModal");
    if (modal) {
      modal.style.display = "flex";
      const inp = document.getElementById("citySearchInput");
      if (inp) {
        inp.value = "";
        setTimeout(() => inp.focus(), 120);
      }
      return;
    }
    // Fallback if modal is not present
    promptManualLocation();
  }

  function closeCityModal() {
    const modal = document.getElementById("cityPickerModal");
    if (modal) modal.style.display = "none";
  }

  function applySearchedCity() {
    const inp = document.getElementById("citySearchInput");
    const query = inp ? inp.value.trim() : "";
    if (query) {
      searchManualCity(query);
    }
  }

  function promptManualLocation() {
    const modal = document.getElementById("cityPickerModal");
    if (modal) {
      openCityModal();
      return;
    }
    const manual = prompt("Enter any city, state, or country worldwide (e.g. Agra, London, Kathmandu, New York):", state.city);
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
    const spaRad = document.getElementById("spaRadiusSelect");
    if (spaRad && spaRad.value !== String(state.radius)) spaRad.value = String(state.radius);
    const radSelect = document.getElementById("radiusSelect");
    if (radSelect && radSelect.value !== String(state.radius)) radSelect.value = String(state.radius);

    const spaRadLabel = document.getElementById("spaRadiusLabel");
    if (spaRadLabel) spaRadLabel.innerText = `Within ${state.radius} km`;

    loadPlaces();
    loadEvents();
  }

  function toggleContactOnly(hasContact) {
    state.hasContactOnly = Boolean(hasContact);
    loadPlaces();
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    const tabButtons = document.querySelectorAll(".market-tab-btn, .cc-tab-pill");
    tabButtons.forEach(btn => {
      const isTarget = btn.getAttribute("data-tab") === tabId;
      if (isTarget) btn.classList.add("active");
    });

    const sections = {
      local: document.getElementById("spaStoresSection") || document.getElementById("localSection"),
      events: document.getElementById("spaFairsSection") || document.getElementById("fairsSection"),
      digital: document.getElementById("spaDigitalSection") || document.getElementById("onlineSection")
    };

    if (tabId === "all") {
      Object.values(sections).forEach(sec => { if (sec) sec.style.display = ""; });
    } else {
      Object.keys(sections).forEach(key => {
        if (sections[key]) {
          sections[key].style.display = key === tabId ? "" : "none";
        }
      });
    }
  }

  function filterStores(query) {
    state.searchQuery = (query || "").trim().toLowerCase();
    renderStoresGrid(state.allLoadedPlaces);
  }

  function searchKeyword(keyword) {
    filterStores(keyword);
  }

  function refreshAll() {
    loadPlaces();
    loadEvents();
    loadPlatforms();
    loadConnections();
  }

  /* ================= 2. LOCAL RETAIL & SHOPS DISCOVERY ================= */

  async function loadPlaces() {
    const storesGrid = document.getElementById("storesContainer");
    const spaStoresCarousel = document.getElementById("spaStoresContainer");
    const localCountBadge = document.getElementById("localResultsCount");
    const spaLocalCount = document.getElementById("spaLocalCount");
    const setupBanner = document.getElementById("placesSetupBanner");

    const skeletonHtml = getLoadingSkeletonHtml(3);
    if (spaStoresCarousel) spaStoresCarousel.innerHTML = skeletonHtml;
    if (storesGrid) storesGrid.innerHTML = skeletonHtml;
    if (localCountBadge) localCountBadge.innerText = "Discovering stores...";

    try {
      let url = `/api/markets/nearby?city=${encodeURIComponent(state.city)}&category=${encodeURIComponent(state.category)}&radius=${state.radius}&hasContact=${state.hasContactOnly}`;
      if (state.lat != null && state.lng != null) {
        url += `&lat=${state.lat}&lng=${state.lng}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      state.placesData = data;

      const places = data.places || data.localMarkets || [];
      state.allLoadedPlaces = places;

      renderStoresGrid(places);

      // Synchronize SPA map if Leaflet is initialized
      if (window.updateSpaMap && state.lat && state.lng) {
        window.updateSpaMap(state.lat, state.lng, places, state.radius);
      }
    } catch (err) {
      console.error("[MarketDiscovery] Failed to load places:", err);
      const errorHtml = `
        <div style="padding: 24px; text-align: center; background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 14px; width: 100%; box-sizing: border-box;">
          <p style="color: #991B1B; font-size: 13.5px; margin: 0 0 12px; font-weight: 500;">
            ⚠️ Unable to load nearby craft markets right now. Please check your connection and retry.
          </p>
          <button type="button" class="btn btn-teal btn-sm" onclick="CraftMarketDiscovery.loadPlaces()" style="background:#075C55; color:white; border:none; padding:8px 16px; border-radius:8px; cursor:pointer;">
            ↻ Retry Search
          </button>
        </div>
      `;
      if (spaStoresCarousel) spaStoresCarousel.innerHTML = errorHtml;
      if (storesGrid) storesGrid.innerHTML = errorHtml;
      if (localCountBadge) localCountBadge.innerText = "Error loading";
    }
  }

  function getClientCategoryFallback(category) {
    const map = {
      pottery: '/images/store_mitti_more.jpg',
      textiles: '/images/hero_crafts.jpg',
      bamboo: '/images/store_artisan_hub.jpg',
      woodcraft: '/images/store_artisan_hub.jpg',
      jewellery: '/images/hero_pots.jpg',
      paintings: '/images/hero_pots.jpg',
      decor: '/images/store_craft_bazaar.jpg',
      village: '/images/hero_crafts.jpg',
      market: '/images/store_craft_bazaar.jpg'
    };
    return map[category] || '/images/store_craft_bazaar.jpg';
  }

  function getCategoryBadgeLabel(category) {
    const map = {
      pottery: '🏺 Pottery',
      textiles: '🧵 Handloom',
      bamboo: '🎋 Bamboo',
      woodcraft: '🪵 Woodcraft',
      jewellery: '💍 Jewellery',
      paintings: '🎨 Folk Art',
      decor: '🏺 Decor & Craft',
      village: '🏡 Craft Village',
      market: '🏪 Craft Market'
    };
    return map[category] || '✨ Handicrafts';
  }

  function renderStoresGrid(places) {
    const storesGrid = document.getElementById("storesContainer");
    const spaStoresCarousel = document.getElementById("spaStoresContainer");
    const localCountBadge = document.getElementById("localResultsCount");
    const spaLocalCount = document.getElementById("spaLocalCount");

    // Client-side search filter
    let filtered = places;
    if (state.searchQuery) {
      const q = state.searchQuery;
      filtered = places.filter(p => {
        const searchable = `${p.name} ${(p.types || []).join(' ')} ${p.address || ''} ${p.retailType || ''}`.toLowerCase();
        return searchable.includes(q);
      });
    }

    if (localCountBadge) localCountBadge.innerText = `${filtered.length} store${filtered.length !== 1 ? 's' : ''} found`;
    if (spaLocalCount) spaLocalCount.innerText = `${filtered.length} Physical Stores`;

    if (filtered.length === 0) {
      const emptyHtml = `
        <div class="cc-empty-card" style="padding: 26px; text-align: center; background: white; border-radius: 14px; border: 1px dashed #CBD5E1; width: 100%; box-sizing: border-box;">
          <span style="font-size: 32px;">🏪</span>
          <h4 style="margin: 8px 0 4px; font-size: 15px; color: #0F172A; font-weight: 700;">No relevant craft markets found near this location</h4>
          <p style="color: #64748B; font-size: 12.5px; max-width: 440px; margin: 0 auto 14px; line-height: 1.45;">
            We couldn't find registered craft stores within ${state.radius} km of ${escapeHtml(state.city)}. Try expanding your discovery radius or search directly on Google Maps.
          </p>
          <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-teal btn-sm" onclick="CraftMarketDiscovery.setRadius(50)" style="background:#075C55; color:white; border:none; padding:8px 14px; border-radius:8px; font-size:12px; cursor:pointer;">Expand to 50 km</button>
            <button type="button" class="btn btn-teal btn-sm" onclick="CraftMarketDiscovery.setRadius(100)" style="background:#075C55; color:white; border:none; padding:8px 14px; border-radius:8px; font-size:12px; cursor:pointer;">Expand to 100 km</button>
            <a href="https://www.google.com/maps/search/craft+stores+near+${encodeURIComponent(state.city + (state.stateName ? ' ' + state.stateName : ''))}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-teal btn-sm" style="display:inline-flex; align-items:center; background:#F1F5F9; color:#075C55; border:1px solid #CBD5E1; padding:8px 14px; border-radius:8px; font-size:12px; text-decoration:none; font-weight:600;">
              Search on Google Maps ↗
            </a>
          </div>
        </div>
      `;
      if (spaStoresCarousel) spaStoresCarousel.innerHTML = emptyHtml;
      if (storesGrid) storesGrid.innerHTML = emptyHtml;
      return;
    }

    const storeCardsHtml = filtered.map(p => {
      const catKey = p.imageCategory || p.category || 'all';
      const fallback = escapeHtml(p.fallbackUrl || getClientCategoryFallback(catKey));
      const imgSrc = escapeHtml(p.imageUrl || fallback);
      const altText = escapeHtml(p.imageAlt || `${p.name} - Craft Store`);
      const isActual = Boolean(p.isActualPhoto);
      const photoBadge = isActual
        ? `<span class="cc-store-photo-badge" title="Verified business photograph">📷 Real Photo</span>`
        : `<span class="cc-store-photo-badge cc-badge-category" title="Representative category image: ${escapeHtml(catKey)}">${escapeHtml(getCategoryBadgeLabel(catKey))}</span>`;

      return `
      <div class="cc-store-card" data-store-id="${escapeHtml(p.id)}">
        <div class="cc-store-thumb-wrap">
          <img src="${imgSrc}" alt="${altText}" class="cc-store-thumb" loading="lazy" onerror="this.onerror=null; this.src='${fallback}'">
          <span class="cc-store-dist-badge">📍 ${escapeHtml(p.distanceText || 'Nearby')}</span>
          ${photoBadge}
        </div>
        <div class="cc-store-body">
          <h4 class="cc-store-title">${escapeHtml(p.name)}</h4>
          <div class="cc-store-tags">
            ${(p.types || ['Handicrafts']).slice(0, 3).map(t => `<span class="cc-tag-pill">${escapeHtml(t)}</span>`).join('')}
          </div>
          <div class="cc-store-detail-row">
            <span>📍</span>
            <span title="${escapeHtml(p.address || p.city || 'Local area')}">${escapeHtml(p.address || p.city || 'Local area')}</span>
          </div>
          ${p.timings ? `
          <div class="cc-store-detail-row">
            <span>🕒</span>
            <span>${escapeHtml(p.timings)}</span>
          </div>` : ''}
          ${p.phone ? `
          <div class="cc-store-detail-row">
            <span>📞</span>
            <a href="tel:${escapeHtml(p.phone)}" style="color:inherit; text-decoration:none;">${escapeHtml(p.phone)}</a>
          </div>` : ''}
          <div class="cc-store-rating-row">
            ${p.rating ? `
              <span class="cc-star-icon">⭐</span>
              <span>${p.rating}</span>
              <span class="cc-reviews-count">(${p.userRatingsTotal || 1} reviews)</span>
            ` : `
              <span style="color:#64748B; font-size:11.5px; font-weight:500;">📍 Verified Local Opportunity</span>
            `}
          </div>
          <div style="display: flex; gap: 6px; margin-top: 10px;">
            <a href="${p.directionsUrl}" target="_blank" rel="noopener noreferrer" class="cc-btn-directions" style="flex: 1;">
              Get Directions ↗
            </a>
            ${p.website ? `
              <a href="${escapeHtml(p.website)}" target="_blank" rel="noopener noreferrer" class="cc-btn-directions" style="background: #F1F5F9; color: #075C55; border: 1px solid #CBD5E1; padding: 7px 10px;" title="Official Website">
                🌐
              </a>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    }).join('');

    if (storesGrid) storesGrid.innerHTML = storeCardsHtml;
    if (spaStoresCarousel) spaStoresCarousel.innerHTML = storeCardsHtml;
  }

  /* ================= 3. FAIRS & EXHIBITIONS ================= */

  async function loadEvents() {
    const container = document.getElementById("marketEventsList");
    const countBadge = document.getElementById("marketEventsCount");
    const loadingEl = document.getElementById("eventsLoading");

    if (loadingEl) loadingEl.style.display = "block";

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

      const fairsGrid = document.getElementById("fairsContainer");
      const spaFairsGrid = document.querySelector("#spaFairsSection .cc-fairs-grid");
      const fairsCountBadge = document.getElementById("fairsResultsCount");
      if (fairsCountBadge) fairsCountBadge.innerText = `${events.length} events`;

      if (events.length === 0) {
        const emptyEvents = `
          <div class="cc-empty-card" style="padding: 24px; text-align: center; background: white; border-radius: 14px; border: 1px dashed #CBD5E1; width: 100%;">
            <span style="font-size: 30px;">🎪</span>
            <h4 style="margin: 8px 0 4px; font-size: 15px; color: #0F172A; font-weight: 700;">No upcoming craft exhibitions found for this category</h4>
            <p style="color: #64748B; font-size: 12.5px; margin: 4px auto 14px;">Check the official Ministry of Textiles portal for seasonal notifications.</p>
            <a href="https://indian.handicrafts.gov.in/" target="_blank" rel="noopener noreferrer" class="btn btn-teal btn-sm" style="background:#075C55; color:white; text-decoration:none; padding:8px 14px; border-radius:8px; font-size:12px;">
              Visit DC (Handicrafts) Portal ↗
            </a>
          </div>
        `;
        if (fairsGrid) fairsGrid.innerHTML = emptyEvents;
        if (spaFairsGrid) spaFairsGrid.innerHTML = emptyEvents;
        return;
      }

      const fairsCardsHtml = events.map(ev => {
        let statusPillClass = "cc-status-upcoming";
        if (ev.status === "Application Open") statusPillClass = "cc-status-open";
        else if (ev.status === "Ongoing") statusPillClass = "cc-status-open";

        return `
          <div class="cc-fair-card" onclick="window.open('${escapeHtml(ev.applicationUrl || ev.officialUrl)}', '_blank')" style="cursor: pointer;" title="View official event circular">
            <img src="${escapeHtml(ev.imageUrl || '/images/fair_saras.jpg')}" alt="${escapeHtml(ev.name)}" class="cc-fair-thumb" onerror="this.onerror=null; this.src='/images/fair_saras.jpg'">
            <div class="cc-fair-info">
              <div class="cc-fair-badges-row">
                <span class="cc-fair-status-pill ${statusPillClass}">${escapeHtml(ev.label || ev.status)}</span>
                <span class="cc-fair-dist-pill">📍 ${escapeHtml(ev.distanceText || 'Regional')}</span>
              </div>
              <h4 class="cc-fair-title" title="${escapeHtml(ev.name)}">${escapeHtml(ev.name)}</h4>
              <div class="cc-fair-meta-row">
                <span class="cc-fair-meta-item">📅 ${formatDate(ev.startDate)} – ${formatDate(ev.endDate)}</span>
                <span class="cc-fair-meta-item">📍 ${escapeHtml(ev.venue || ev.city)}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');

      if (fairsGrid) fairsGrid.innerHTML = fairsCardsHtml;
      if (spaFairsGrid) spaFairsGrid.innerHTML = fairsCardsHtml;
    } catch (err) {
      console.error("[MarketDiscovery] Failed to load events:", err);
    } finally {
      if (loadingEl) loadingEl.style.display = "none";
    }
  }

  /* ================= 4. ONLINE MARKETPLACES ================= */

  async function loadPlatforms() {
    const container = document.getElementById("digitalMarketsList");
    const countBadge = document.getElementById("digitalMarketsCount");
    const loadingEl = document.getElementById("digitalLoading");

    if (loadingEl) loadingEl.style.display = "block";

    try {
      const res = await fetch(`/api/markets/platforms?category=${encodeURIComponent(state.category)}`);
      const platforms = await res.json();
      state.platformsData = platforms;

      if (countBadge) countBadge.innerText = `${platforms.length} Platforms Available`;
    } catch (err) {
      console.error("[MarketDiscovery] Failed to load digital platforms:", err);
    } finally {
      if (loadingEl) loadingEl.style.display = "none";
    }
  }

  /* ================= 5. ARTISAN MARKETPLACE CONNECTIONS ================= */

  async function loadConnections() {
    try {
      const res = await fetch("/api/markets/connections");
      const data = await res.json();
      state.connectionsData = data.connections || [];
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

    const titleEl = document.getElementById("onboardingModalPlatformName");
    if (titleEl) titleEl.innerText = platform.name;

    const typeEl = document.getElementById("onboardingModalPlatformType");
    if (typeEl) typeEl.innerText = platform.badgeLabel || "Marketplace";

    const sellerUrlEl = document.getElementById("onboardingModalSellerUrl");
    if (sellerUrlEl) sellerUrlEl.href = platform.sellerUrl || "#";

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

      alert(`✅ Developer API configuration saved. Authorized connection active.`);
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

  function getLoadingSkeletonHtml(count = 3) {
    return Array.from({ length: count }).map(() => `
      <div class="cc-store-card" style="opacity: 0.65;">
        <div class="cc-store-thumb-wrap" style="background: #E2E8F0; min-height: 140px; animation: pulse 1.5s infinite;"></div>
        <div class="cc-store-body">
          <div style="height: 16px; width: 70%; background: #E2E8F0; border-radius: 6px; margin-bottom: 8px;"></div>
          <div style="height: 12px; width: 50%; background: #E2E8F0; border-radius: 4px; margin-bottom: 12px;"></div>
          <div style="height: 12px; width: 90%; background: #E2E8F0; border-radius: 4px; margin-bottom: 14px;"></div>
          <div style="height: 32px; width: 100%; background: #E2E8F0; border-radius: 8px;"></div>
        </div>
      </div>
    `).join('');
  }

})();
