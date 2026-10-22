/* CraftConnect Production AI Engine Integration (SIH 2026 PS-90) */

const API_BASE_URL = "http://127.0.0.1:8000";

let recognition = null;
let currentVoiceResponse = "";
let currentLang = "en";
let catalogProducts = [];
let activeFilter = "all";
let activeSearch = "";
let catalogSort = "default";
let pendingCatalogDraft = null;

/* ========== USER-SCOPED STORAGE HELPERS ========== */
/**
 * Returns the current signed-in user's unique ID, or "guest" as a fallback.
 * This is used to namespace localStorage keys so data never leaks between users.
 */
function getCurrentUserId() {
    const user = window.CC_USER;
    return (user && user.id) ? user.id : "guest";
}

/**
 * Demo accounts are the pre-seeded artisan/supplier/buyer accounts.
 * Only these accounts should receive pre-populated catalog, orders, and notifications.
 * Any freshly registered user gets an empty workspace.
 */
const DEMO_USER_EMAILS = ["sita@artisan.com", "rajesh@supplier.com", "priya@buyer.com"];
function isDemoUser() {
    const user = window.CC_USER;
    if (!user) return false;
    return DEMO_USER_EMAILS.includes((user.email || "").toLowerCase());
}

/** Returns a user-scoped localStorage key for the catalog. */
function getCatalogKey() {
    return "craftconnect_catalog_" + getCurrentUserId();
}

/** Returns a user-scoped localStorage key for orders. */
function getOrdersKey() {
    return "craftconnect_orders_" + getCurrentUserId();
}


/* ================= SCREEN NAVIGATION ================= */
function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add("active");
    }

    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });

    const navMap = {
        "home": 0,
        "catalog": 1,
        "products": 2,
        "markets": 3,
        "insights": 4,
        "profile": 5,
        "orders": 1
    };

    if (navMap[screenId] !== undefined) {
        const navItems = document.querySelectorAll(".nav-item");
        if (navItems[navMap[screenId]]) {
            navItems[navMap[screenId]].classList.add("active");
        }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    if (location.hash !== "#" + screenId) {
        history.replaceState(null, "", "#" + screenId);
    }

    // Dynamic data fetch on view
    if (screenId === "catalog") {
        renderCatalog();
    } else if (screenId === "insights") {
        loadDemandTrends();
    } else if (screenId === "profile") {
        loadArtisanInsights();
        if (typeof renderArtisanQr === "function") renderArtisanQr();
    } else if (screenId === "orders") {
        renderOrdersList();
    } else if (screenId === "materials" && typeof renderMaterials === "function") {
        renderMaterials();
    } else if (screenId === "schemes" && typeof renderSchemes === "function") {
        renderSchemes();
    } else if (screenId === "forum" && typeof renderForum === "function") {
        renderForum();
    } else if (screenId === "finance" && typeof renderFinance === "function") {
        renderFinance();
    }

    const search = document.getElementById("globalAppSearch");
    if (search) {
        search.placeholder = screenId === "schemes"
            ? "Search schemes, loans, subsidies, or keywords..."
            : "Search products, markets, schemes, or anything...";
    }
}

/* ================= MULTILINGUAL (I18N) LOGIC ================= */
function toggleLanguageMenu() {
    const menu = document.getElementById("languageMenu");
    if (menu) {
        menu.classList.toggle("show");
    }
}

function changeLanguage(langCode, langName) {
    currentLang = langCode;
    const selectedSpan = document.getElementById("selectedLanguage");
    if (selectedSpan) {
        selectedSpan.innerText = langName;
    }

    const menu = document.getElementById("languageMenu");
    if (menu) {
        menu.classList.remove("show");
    }

    // Save language to localStorage
    try {
        localStorage.setItem("craftconnect_selected_lang", langCode);
        localStorage.setItem("craftconnect_selected_lang_name", langName);
    } catch (e) {
        console.warn("Storage warning:", e);
    }

    // Set HTML lang attribute
    document.documentElement.lang = langCode;

    // Apply translations to all data-i18n elements
    applyTranslations(langCode);

    // Sync Voice Modal's language selector
    const voiceLangSelect = document.getElementById("voiceLang");
    if (voiceLangSelect) {
        const langMap = {
            "en": "en-IN",
            "hi": "hi-IN",
            "mr": "mr-IN",
            "gu": "gu-IN"
        };
        if (langMap[langCode]) {
            voiceLangSelect.value = langMap[langCode];
        }
    }

    // Re-render catalog so cards and metrics reflect language
    renderCatalog();

    // Re-render auth UI so dynamic Login/Logout buttons localize
    if (typeof applyAuthUi === "function") applyAuthUi();

    console.log(`CraftConnect language switched to: ${langCode} (${langName})`);
}

function applyTranslations(lang) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS["en"];

    // Update text content for elements with data-i18n
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        // Never overwrite logged-in user identity with static demo dictionary translations
        if ((key === "artisan_name" || key === "artisan_craft" || key === "artisan_loc") && window.CC_USER && window.CC_USER.name) {
            return;
        }
        if (dict[key]) {
            el.innerText = dict[key];
        }
    });

    // Update placeholders for inputs with data-i18n-placeholder
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (dict[key]) {
            el.placeholder = dict[key];
        }
    });

    // Update active state in language menu
    document.querySelectorAll(".lang-opt").forEach(btn => {
        btn.classList.remove("active");
        if (btn.innerText.includes(lang) || btn.getAttribute("onclick")?.includes(`'${lang}'`)) {
            btn.classList.add("active");
        }
    });

    // Re-render dynamic module content that uses inline English strings
    if (typeof renderOrdersList === "function") renderOrdersList();
    if (typeof renderMaterials === "function") renderMaterials();
    if (typeof renderSchemes === "function") renderSchemes();
    if (typeof renderForum === "function") renderForum();
    if (typeof renderFinance === "function") renderFinance();
    _applyMarketsDynamicText(lang);
    _applyInsightsDynamicText(lang);
}

/* ================= GLOBAL TRANSLATION HELPER ================= */
/**
 * Returns the translated string for `key` in the current language,
 * falling back to English and then to `fallback`.
 */
function t(key, fallback) {
    const dict = (typeof TRANSLATIONS !== "undefined" && TRANSLATIONS[currentLang])
        ? TRANSLATIONS[currentLang]
        : {};
    return dict[key] || (TRANSLATIONS["en"] && TRANSLATIONS["en"][key]) || fallback || key;
}
window.t = t;

/* Translate static Markets screen text that is inline in the HTML */
function _applyMarketsDynamicText(lang) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS["en"];
    const safe = (key, fb) => dict[key] || fb;

    const spaTabAll    = document.getElementById("spaTabAll");
    const spaTabLocal  = document.getElementById("spaTabLocal");
    const spaTabDigital = document.getElementById("spaTabDigital");
    const localCount   = document.getElementById("spaLocalCount");
    const localDesc    = document.querySelector("#localSection > p");
    const digitalDesc  = document.querySelector("#digitalSection > p");
    const localH2      = document.querySelector("#localSection h2");
    const digitalH2    = document.querySelector("#digitalSection h2");
    const localLoading = document.getElementById("localLoading");
    const digitalLoading = document.getElementById("digitalLoading");
    const digitalBadge = document.querySelector("#digitalSection .badge-craft-orange");
    const quickSwitchLabel = document.querySelector("#spaCityChips")?.previousElementSibling;

    if (spaTabAll) spaTabAll.textContent    = safe("markets_all_streams", "⚡ All Streams");
    if (spaTabLocal) spaTabLocal.textContent = safe("markets_local_tab", "🏪 Dynamic Local Markets");
    if (spaTabDigital) spaTabDigital.textContent = safe("markets_digital_tab", "🌐 Constant Digital Channels");
    if (localCount) localCount.textContent   = safe("markets_location_adaptive", "Location Adaptive");
    if (localH2) localH2.textContent         = safe("markets_stream1", "🏪 Stream 1: Dynamic Local Markets");
    if (digitalH2) digitalH2.textContent     = safe("markets_stream2", "🌐 Stream 2: Constant Digital Markets");
    if (localDesc) localDesc.textContent     = safe("markets_stream1_sub", "Physical craft haats, exhibition grounds, and traditional weekly bazaars tailored to your detected location.");
    if (digitalDesc) digitalDesc.textContent = safe("markets_stream2_sub", "Direct, actionable onboarding and storefront linking portals for major national seller platforms.");
    if (localLoading) localLoading.textContent = safe("markets_searching", "Searching nearby physical markets...");
    if (digitalLoading) digitalLoading.textContent = safe("markets_finding_digital", "Finding digital platform channels...");
    if (digitalBadge) digitalBadge.textContent = safe("markets_pan_india", "Pan-India E-Commerce");

    // Refresh GPS & Enter City buttons
    const refreshGpsBtn = document.querySelector("#markets .btn-deep-teal:first-of-type");
    const enterCityBtn  = document.querySelector("#markets .btn-deep-teal:nth-of-type(2)");
    if (refreshGpsBtn && refreshGpsBtn.textContent.trim().startsWith("↻")) refreshGpsBtn.textContent = safe("markets_refresh_gps", "↻ Refresh GPS");
    if (enterCityBtn  && enterCityBtn.textContent.trim().startsWith("✏")) enterCityBtn.textContent  = safe("markets_enter_city", "✏️ Enter City");

    // Quick Switch label (div sibling before chip buttons)
    const qs = document.querySelector("#spaCityChips")?.previousElementSibling;
    if (qs) qs.textContent = safe("markets_quick_switch", "Quick Switch Artisan Hub City:");
}

/* Translate static Insights screen text that is inline in the HTML */
function _applyInsightsDynamicText(lang) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS["en"];
    const safe = (key, fb) => dict[key] || fb;

    // Section titles
    const trendingTitle = document.querySelector("#insights .section-title h2[style*='0F5147']:first-of-type");
    const emergingTitle = document.querySelectorAll("#insights .section-title h2");
    const aiLabel  = document.querySelector("#insights .advice-card .advice-header span");
    const viewCataBtn = document.querySelector("#insights .btn-outline");
    const findMarkBtn = document.querySelector("#insights .btn-deep-teal");
    const locationH3  = document.querySelector("#insights .location-box h3") ||
                        document.querySelector("[id='demandLocation']~*") ||
                        document.querySelector("#insights h3");

    // Rebuild section titles inline
    document.querySelectorAll("#insights .section-title").forEach((sec, i) => {
        const h2 = sec.querySelector("h2");
        const span = sec.querySelector("span");
        if (i === 0 && h2) {
            // Trending section
            h2.textContent = safe("insights_trending_title", "🔥 Trending Right Now");
            if (span) span.textContent = safe("insights_trending_sub", "Top performing product categories in demand");
        } else if (i === 1 && h2) {
            // Emerging section
            h2.textContent = safe("insights_emerging_title", "🎯 Emerging Business Opportunities");
            if (span) span.textContent = safe("insights_emerging_sub", "High-margin product ideas & seasonal demand picks");
        }
    });

    if (aiLabel) aiLabel.textContent = safe("insights_ai_label", "🤖 Personalized AI Production Recommendations");
    if (viewCataBtn) viewCataBtn.textContent = safe("insights_view_catalog", "View My Catalog");
    if (findMarkBtn) findMarkBtn.textContent = safe("insights_find_markets", "Find Matching Markets");
}


// Close language menu on outside click
window.addEventListener("click", function (event) {
    if (!event.target.closest(".language-dropdown-container")) {
        const menu = document.getElementById("languageMenu");
        if (menu && menu.classList.contains("show")) {
            menu.classList.remove("show");
        }
    }
});

/* ================= PRODUCT CATALOG LOGIC ================= */
function initCatalog() {
    const storageKey = getCatalogKey();
    try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            // User has their own saved catalog — load it
            catalogProducts = JSON.parse(stored);
        } else if (isDemoUser()) {
            // Demo accounts get the pre-seeded sample products
            catalogProducts = [...DEFAULT_PRODUCTS];
            saveCatalogToStorage();
        } else {
            // New/real users start with a completely empty catalog
            catalogProducts = [];
            saveCatalogToStorage();
        }
    } catch (e) {
        catalogProducts = isDemoUser() ? [...DEFAULT_PRODUCTS] : [];
    }

    const defaultCostMap = {
        "prod_bamboo_basket": { material_cost: 280, labour_cost: 150 },
        "prod_terracotta_diya": { material_cost: 140, labour_cost: 80 },
        "prod_indigo_stole": { material_cost: 450, labour_cost: 250 },
        "prod_wood_coasters": { material_cost: 190, labour_cost: 110 }
    };
    catalogProducts.forEach(p => {
        if (!p.material_cost && defaultCostMap[p.id]) {
            p.material_cost = defaultCostMap[p.id].material_cost;
            p.labour_cost = defaultCostMap[p.id].labour_cost;
        } else if (!p.material_cost) {
            p.material_cost = Math.round((Number(p.price) || 0) * 0.38);
            p.labour_cost = Math.round((Number(p.price) || 0) * 0.20);
        }
    });

    updateDashboardCounts();
    renderCatalog();
}

function saveCatalogToStorage() {
    try {
        localStorage.setItem(getCatalogKey(), JSON.stringify(catalogProducts));
    } catch (e) {
        console.warn("Storage quota warning:", e);
    }
}

function updateDashboardCounts() {
    const count = catalogProducts.length;
    const statHome = document.getElementById("statProducts");
    const statProfile = document.getElementById("profileStatProducts");
    const catCount = document.getElementById("catalogCount");

    if (statHome) statHome.innerText = count;
    if (statProfile) statProfile.innerText = count;
    if (catCount) catCount.innerText = count;

    // Calculate total catalog value
    const totalVal = catalogProducts.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
    const catValEl = document.getElementById("catalogTotalValue");
    if (catValEl) {
        catValEl.innerText = "₹" + totalVal.toLocaleString("en-IN");
    }

    const readyEl = document.getElementById("catalogReadyCount");
    if (readyEl) {
        readyEl.innerText = count > 0 ? "100%" : "0%";
    }

    // Market Leads counter: demo users see their pre-seeded lead count; new users start at 0
    const statMarkets = document.getElementById("statMarkets");
    if (statMarkets) {
        statMarkets.innerText = isDemoUser() ? 5 : 0;
    }
    const prodDelta = document.getElementById("statProductsDelta");
    const mktDelta = document.getElementById("statMarketsDelta");
    if (prodDelta) prodDelta.innerText = count ? "↑ 12% this month" : "Add your first craft";
    if (mktDelta) mktDelta.innerText = isDemoUser() ? "↑ 8% this month" : "Explore markets nearby";
    setHomeGreeting();
}

function setHomeGreeting() {
    const el = document.getElementById("homeGreetingText");
    if (!el) return;
    const hour = new Date().getHours();
    el.textContent = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
}

function handleGlobalAppSearch(value) {
    const q = (value || "").trim().toLowerCase();
    const active = document.querySelector(".screen.active");
    const onSchemes = active && active.id === "schemes";
    if (onSchemes) {
        window.schemeSearchQuery = q;
        if (typeof renderSchemes === "function") renderSchemes();
        return;
    }
    if (!q) return;
    const schemes = typeof getSchemesCatalog === "function" ? getSchemesCatalog() : (window.SCHEMES || []);
    const schemeHit = schemes.find((s) =>
        `${s.name} ${s.blurb} ${s.badge}`.toLowerCase().includes(q)
    );
    if (schemeHit) {
        showScreen("schemes");
        window.schemeSearchQuery = q;
        if (typeof renderSchemes === "function") renderSchemes();
        return;
    }
    if (["catalog", "product", "craft", "basket", "terracotta"].some((k) => q.includes(k))) {
        showScreen("catalog");
        if (typeof searchCatalog === "function") {
            const input = document.getElementById("catalogSearchInput");
            if (input) input.value = value;
            searchCatalog({ target: { value } });
        }
        return;
    }
    if (["market", "mela", "fair", "exhibition"].some((k) => q.includes(k))) {
        showScreen("markets");
    }
}

function renderCatalog(filter, search) {
    const grid = document.getElementById("catalogGrid");
    const emptyState = document.getElementById("catalogEmpty");
    if (!grid) return;

    if (filter !== undefined) activeFilter = filter;
    if (search !== undefined) activeSearch = search.toLowerCase();

    // Filter products
    const filtered = catalogProducts.filter(prod => {
        // Category check
        const matchesCategory = (activeFilter === "all") ||
            (prod.category_code === activeFilter) ||
            (prod.category && prod.category.toLowerCase().includes(activeFilter)) ||
            (prod.craft_type && prod.craft_type.toLowerCase().includes(activeFilter));

        // Search check
        const matchesSearch = !activeSearch ||
            (prod.name && prod.name.toLowerCase().includes(activeSearch)) ||
            (prod.craft_type && prod.craft_type.toLowerCase().includes(activeSearch)) ||
            (prod.description && prod.description.toLowerCase().includes(activeSearch)) ||
            (prod.tags && prod.tags.some(t => t.toLowerCase().includes(activeSearch)));

        return matchesCategory && matchesSearch;
    });

    if (catalogSort === "price-asc") {
        filtered.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (catalogSort === "price-desc") {
        filtered.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    }

    grid.innerHTML = "";

    if (filtered.length === 0) {
        emptyState.style.display = "block";
    } else {
        emptyState.style.display = "none";
        filtered.forEach(prod => {
            const card = document.createElement("div");
            card.className = "catalog-card";
            card.id = `card_${prod.id}`;

            const dict = TRANSLATIONS[currentLang] || TRANSLATIONS["en"];
            const viewTxt = dict.card_view_details || "View Details";
            const delTxt = dict.card_delete || "Delete";
            const priceVal = Number(prod.price) || 750;

            card.innerHTML = `
                <img class="catalog-card-thumb" src="${prod.image || 'images/image.png'}" alt="${prod.name}">
                <div class="catalog-card-details">
                    <div>
                        <div class="catalog-card-header">
                            <span class="catalog-card-cat">${prod.craft_type || prod.category || 'Handicraft'}</span>
                        </div>
                        <h4 class="catalog-card-title">${prod.name}</h4>
                        <p class="catalog-card-desc">${prod.description || ''}</p>
                    </div>
                    <div class="catalog-card-footer">
                        <span class="catalog-card-price">₹${priceVal.toLocaleString("en-IN")}</span>
                        <div class="catalog-card-btns">
                            <button class="cat-view-btn" onclick="openProductDetail('${prod.id}')">${viewTxt}</button>
                            <button class="cat-del-btn" onclick="deleteProductFromCatalog('${prod.id}', event)" title="Remove">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    updateDashboardCounts();
}

function filterCatalog(category, buttonEl) {
    activeFilter = category;
    document.querySelectorAll(".filter-chip").forEach(btn => {
        btn.classList.remove("active");
    });
    if (buttonEl) {
        buttonEl.classList.add("active");
    }
    renderCatalog();
}

function setCatalogSort(value) {
    catalogSort = value || "default";
    renderCatalog();
}

function searchCatalog(event) {
    activeSearch = event.target.value;
    renderCatalog();
}

/* ================= PRODUCT DETAILS MODAL ================= */
function openProductDetail(productId) {
    const prod = catalogProducts.find(p => p.id === productId);
    if (!prod) return;

    selectedProductForDetail = productId;

    document.getElementById("modalProductTitle").innerText = prod.name;
    document.getElementById("modalProductCraft").innerText = prod.craft_type || prod.category || "Handicraft";
    document.getElementById("modalCategory").innerText = prod.category || "Traditional Craft";
    document.getElementById("modalProductImg").src = prod.image || "images/image.png";
    document.getElementById("modalProductDesc").innerText = prod.description || "Detailed AI description not available.";

    // Features
    const featList = document.getElementById("modalFeaturesList");
    featList.innerHTML = "";
    if (prod.features && prod.features.length > 0) {
        prod.features.forEach(f => {
            const li = document.createElement("li");
            li.innerText = f;
            featList.appendChild(li);
        });
    } else {
        featList.innerHTML = "<li>Authentic hand-finished craftsmanship</li><li>Environmentally sustainable natural materials</li>";
    }

    // Tags
    const tagsContainer = document.getElementById("modalTagsContainer");
    tagsContainer.innerHTML = "";
    if (prod.tags && prod.tags.length > 0) {
        prod.tags.forEach(t => {
            const span = document.createElement("span");
            span.className = "tag";
            span.innerText = t.startsWith("#") ? t : `#${t}`;
            tagsContainer.appendChild(span);
        });
    }

    // Target Buyers
    document.getElementById("modalTargetMarket").innerText = prod.target_market || "Home Decor Buyers, Cultural Exhibitions, Retailers";

    // Pricing
    document.getElementById("modalPrice").innerText = "₹" + (Number(prod.price) || 750).toLocaleString("en-IN");
    document.getElementById("modalPriceTier").innerText = prod.price_tier || "Mid-range";
    document.getElementById("modalPriceReason").innerText = prod.reasoning || "Based on Random Forest ML pricing model evaluated against craft complexity and market demand.";

    document.getElementById("productDetailModal").classList.add("active");
}

function closeProductDetail() {
    document.getElementById("productDetailModal").classList.remove("active");
    selectedProductForDetail = null;
}

function deleteCurrentProduct() {
    if (!selectedProductForDetail) return;
    deleteProductFromCatalog(selectedProductForDetail);
    closeProductDetail();
}

function deleteProductFromCatalog(productId, event) {
    if (event) event.stopPropagation();
    const confirmMsg = currentLang === "hi" ? "क्या आप वाकई इस उत्पाद को कैटलॉग से हटाना चाहते हैं?" :
        currentLang === "mr" ? "तुम्हाला नक्की हे उत्पादन कॅटलॉगमधून काढून टाकायचे आहे का?" :
            currentLang === "gu" ? "શું તમે ખરેખર આ પ્રોડક્ટને કેટલોગમાંથી કાઢી નાખવા માંગો છો?" :
                "Are you sure you want to remove this product from your catalog?";

    if (confirm(confirmMsg)) {
        const removed = catalogProducts.find(p => p.id === productId);
        catalogProducts = catalogProducts.filter(p => p.id !== productId);
        saveCatalogToStorage();
        renderCatalog();
        updateDashboardCounts();
        if (typeof logAction === "function") {
            logAction("Deleted item", removed ? removed.name : productId);
        }
    }
}

function shareCatalogProduct() {
    if (!selectedProductForDetail) return;
    const prod = catalogProducts.find(p => p.id === selectedProductForDetail);
    if (!prod) return;

    const artisan = (window.CC_USER && window.CC_USER.name) || "CraftConnect Artisan";
    const shareUrl = `${window.location.origin}${window.location.pathname}#catalog`;
    const shareText = `🌿 CraftConnect Showcase: ${prod.name} by ${artisan}. Fair Price: ₹${prod.price}. ${shareUrl}`;

    if (typeof sharePayload === "function") {
        sharePayload({ title: prod.name, text: shareText, url: shareUrl });
        return;
    }

    if (navigator.share) {
        navigator.share({
            title: prod.name,
            text: shareText,
            url: shareUrl
        }).catch(() => { });
    } else {
        navigator.clipboard?.writeText(shareText);
        alert("Product details copied to clipboard.");
    }
}

async function analyzeProduct(event) {
    if (typeof requireUserAuth === "function" && !requireUserAuth("Gemini Vision AI Scan & Pricing")) {
        if (event && event.target) event.target.value = "";
        return;
    }
    const file = event.target.files[0];
    if (!file) return;

    const loading = document.getElementById("loading");
    const result = document.getElementById("catalogResult");
    const preview = document.getElementById("previewImage");
    const notice = document.getElementById("catalogAddNotice");

    // Show image preview immediately
    const reader = new FileReader();
    reader.onload = function (e) {
        preview.src = e.target.result;
    };
    reader.readAsDataURL(file);

    loading.style.display = "block";
    result.style.display = "none";
    if (notice) notice.style.display = "none";

    const formData = new FormData();
    formData.append("file", file);

    let catalogData = null;
    let pricingData = null;

    try {
        const response = await fetch('/api/ai/scan', {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`API analysis error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Live AI Analysis Response:", data);

        catalogData = {
            product_name: data.title,
            category: data.category,
            craft_type: data.craftType,
            description: data.description,
            visual_features: data.features,
            tags: ["Handmade", "EcoFriendly", "ArtisanCraft"],
            target_market: data.targetMarket.split(", ")
        };

        pricingData = {
            predicted_price_tier: "Mid-range",
            price_display: data.priceRange,
            recommended_price_inr: data.recommendedPrice,
            confidence_score: data.confidence / 100,
            reasoning: "Evaluated by Random Forest ML model using handicraft material complexity."
        };
    } catch (err) {
        console.error("AI API failed", err);
        loading.style.display = "none";
        return;
    }

    // Render results into UI
    document.getElementById("resTitle").innerText = catalogData.product_name || "Handcrafted Craft";
    document.getElementById("resCategory").innerText = catalogData.category || "Handicraft";
    document.getElementById("resCraft").innerText = catalogData.craft_type || "Traditional Craft";
    document.getElementById("resDescription").innerText = catalogData.description || "";

    // Features list
    const featList = document.getElementById("resFeatures");
    featList.innerHTML = "";
    if (catalogData.visual_features && catalogData.visual_features.length > 0) {
        catalogData.visual_features.forEach(feat => {
            const li = document.createElement("li");
            li.innerText = feat;
            featList.appendChild(li);
        });
    }

    // Tags
    const tagContainer = document.getElementById("resTags");
    tagContainer.innerHTML = "";
    if (catalogData.tags && catalogData.tags.length > 0) {
        catalogData.tags.forEach(tag => {
            const span = document.createElement("span");
            span.className = "tag";
            span.innerText = tag.startsWith("#") ? tag : `#${tag}`;
            tagContainer.appendChild(span);
        });
    }

    // Target Market
    document.getElementById("resTargetMarket").innerText = Array.isArray(catalogData.target_market) ?
        catalogData.target_market.join(", ") : catalogData.target_market;

    // Pricing
    document.getElementById("resTier").innerText = pricingData.predicted_price_tier || "Mid-range";
    document.getElementById("resPriceRange").innerText = pricingData.price_display || `₹${pricingData.suggested_min_inr || 600} – ₹${pricingData.suggested_max_inr || 1000}`;
    document.getElementById("resRecPrice").innerText = `₹${pricingData.recommended_price_inr || 850}`;

    const confScore = Math.round((pricingData.confidence_score || 0.88) * 100);
    document.getElementById("resConfidence").innerText = `${confScore}%`;
    document.getElementById("resConfidenceFill").style.width = `${confScore}%`;
    document.getElementById("resReasoning").innerText = pricingData.reasoning || "Based on ML Random Forest pricing model.";

    const categoryCode = mapCategoryCode(catalogData.category);
    const uniqueTitle = uniqueProductName(catalogData.product_name, file && file.name);
    const uniqueDesc = catalogData.description && !/exquisitely hand-formed handicraft product made by traditional artisans/i.test(catalogData.description)
        ? catalogData.description
        : `Handcrafted ${uniqueTitle} photographed on ${new Date().toLocaleDateString("en-IN")}.`;

    pendingCatalogDraft = {
        id: "prod_" + Date.now(),
        name: uniqueTitle,
        category_code: categoryCode,
        category: catalogData.category || "Handicraft",
        craft_type: catalogData.craft_type || "Traditional Craft",
        image: preview.src,
        price: Number(pricingData.recommended_price_inr) || 850,
        price_tier: pricingData.predicted_price_tier || "Mid-range",
        price_range: pricingData.price_display || "₹650 – ₹1,100",
        confidence: pricingData.confidence_score || 0.88,
        description: uniqueDesc,
        features: catalogData.visual_features || ["Eco-friendly natural materials", "Handmade craft"],
        tags: catalogData.tags || ["Handmade", "CraftConnect"],
        target_market: Array.isArray(catalogData.target_market) ? catalogData.target_market.join(", ") : catalogData.target_market,
        reasoning: pricingData.reasoning || "Evaluated by AI ML Pricing Model."
    };

    const titleInput = document.getElementById("editTitle");
    const priceInput = document.getElementById("editPrice");
    const descInput = document.getElementById("editDescription");
    const catInput = document.getElementById("editCategory");
    if (titleInput) titleInput.value = pendingCatalogDraft.name;
    if (priceInput) priceInput.value = pendingCatalogDraft.price;
    if (descInput) descInput.value = pendingCatalogDraft.description;
    if (catInput) catInput.value = pendingCatalogDraft.category_code;

    if (notice) {
        notice.style.display = "flex";
        notice.querySelector("strong").innerText = "Review the unique fields below, then save to catalog.";
    }

    loading.style.display = "none";
    result.style.display = "block";

    result.scrollIntoView({ behavior: "smooth" });
}

function mapCategoryCode(category) {
    const text = String(category || "").toLowerCase();
    if (text.includes("terra") || text.includes("clay") || text.includes("pott")) return "terracotta";
    if (text.includes("textile") || text.includes("loom") || text.includes("fabric")) return "textile";
    if (text.includes("decor") || text.includes("gift") || text.includes("wood")) return "decor";
    return "bamboo";
}

function uniqueProductName(aiName, fileName) {
    const stamp = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const fromFile = fileName ? fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() : "";
    if (fromFile && fromFile.length > 2 && !/image|img|photo|dsc|screenshot/i.test(fromFile)) {
        return fromFile.replace(/\b\w/g, (c) => c.toUpperCase());
    }
    if (aiName && !/^handcrafted artisan specialty$/i.test(aiName) && !/^handwoven bamboo basket$/i.test(aiName)) {
        return `${aiName} · ${stamp}`;
    }
    return `New craft listing · ${stamp}`;
}

function confirmSaveProduct() {
    if (typeof requireUserAuth === "function" && !requireUserAuth("Save Craft to Catalog")) return;
    if (!pendingCatalogDraft) {
        alert("Scan or select a craft photo first.");
        return;
    }
    const title = (document.getElementById("editTitle") || {}).value;
    const price = (document.getElementById("editPrice") || {}).value;
    const description = (document.getElementById("editDescription") || {}).value;
    const categoryCode = (document.getElementById("editCategory") || {}).value;
    const categoryLabels = {
        bamboo: "Bamboo & Wood",
        terracotta: "Terracotta & Clay",
        textile: "Textiles",
        decor: "Decor & Gifts"
    };

    pendingCatalogDraft.name = (title || "").trim() || pendingCatalogDraft.name;
    pendingCatalogDraft.price = Number(price) || pendingCatalogDraft.price;
    pendingCatalogDraft.description = (description || "").trim() || pendingCatalogDraft.description;
    pendingCatalogDraft.category_code = categoryCode || pendingCatalogDraft.category_code;
    pendingCatalogDraft.category = categoryLabels[pendingCatalogDraft.category_code] || pendingCatalogDraft.category;

    catalogProducts.unshift({ ...pendingCatalogDraft });
    saveCatalogToStorage();
    updateDashboardCounts();
    if (typeof logAction === "function") logAction("Added item", pendingCatalogDraft.name);
    if (typeof enqueueSync === "function") {
        enqueueSync({ type: "product.upload", payload: { id: pendingCatalogDraft.id, name: pendingCatalogDraft.name } });
    }
    pendingCatalogDraft = null;
    const notice = document.getElementById("catalogAddNotice");
    if (notice) {
        notice.style.display = "flex";
        const strong = notice.querySelector("strong");
        if (strong) strong.innerText = "Product successfully added to your catalog!";
    }
    renderCatalog();
    showScreen("catalog");
}

/* ================= MULTILINGUAL VOICE AI ASSISTANT & TTS ================= */
function openVoiceModal() {
    if (typeof requireUserAuth === "function" && !requireUserAuth("Multilingual Voice AI Assistant")) return;
    document.getElementById("voiceModal").classList.add("active");
}

function closeVoiceModal() {
    document.getElementById("voiceModal").classList.remove("active");
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}

function setVoiceQuery(queryText) {
    document.getElementById("voiceQueryInput").value = queryText;
    sendVoiceQuery();
}

function handleVoiceEnter(event) {
    if (event.key === "Enter") {
        sendVoiceQuery();
    }
}

async function sendVoiceQuery() {
    const inputField = document.getElementById("voiceQueryInput");
    const query = inputField.value.trim();
    if (!query) return;

    const lang = document.getElementById("voiceLang").value;
    const statusBox = document.getElementById("voiceStatus");
    const respBox = document.getElementById("voiceResponseBox");
    const respText = document.getElementById("voiceResponseText");

    const loadingMsg = currentLang === "hi" ? "⚡ जेमिनी एआई वॉइस इंजन सोच रहा है..." :
        currentLang === "mr" ? "⚡ जेमिनी एआय व्हॉइस इंजिन विचार करत आहे..." :
            currentLang === "gu" ? "⚡ જેમિની AI વૉઇસ એન્જિન વિચારી રહ્યું છે..." :
                "⚡ Thinking with Gemini AI Voice Engine...";

    statusBox.innerText = loadingMsg;
    respBox.style.display = "none";

    try {
        const response = await fetch(`${API_BASE_URL}/voice-assistant`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: query, language: lang })
        });

        const data = await response.json();
        currentVoiceResponse = data.response_text || "नमस्ते! CraftConnect AI आपकी सहायता के लिए तैयार है।";

        respText.innerText = currentVoiceResponse;
        respBox.style.display = "block";
        statusBox.innerText = "Click microphone or type another question:";
        speakResponse();

    } catch (err) {
        console.warn("Voice assistant fallback:", err);
        // Language-specific fallback responses
        if (lang.startsWith("hi")) {
            currentVoiceResponse = "नमस्ते सीता जी! CraftConnect AI के अनुसार आपके हस्तशिल्प उत्पाद की सही कीमत ₹700 से ₹1,100 के बीच है और दिल्ली हस्तशिल्प मेला आपके लिए सबसे उपयुक्त बाजार है।";
        } else if (lang.startsWith("mr")) {
            currentVoiceResponse = "नमस्कार सीता जी! CraftConnect AI नुसार तुमच्या हस्तकलेची योग्य किंमत ₹700 ते ₹1,100 दरम्यान आहे आणि दिल्ली प्रदर्शन तुमच्या उत्पादनांसाठी सर्वोत्तम आहे.";
        } else if (lang.startsWith("gu")) {
            currentVoiceResponse = "નમસ્તે સીતા જી! CraftConnect AI મુજબ તમારી હસ્તકળા માટે યોગ્ય કિંમત ₹700 થી ₹1,100 છે અને દિલ્હી હસ્તકળા પ્રદર્શન તમારા માટે સૌથી યોગ્ય બજાર છે.";
        } else {
            currentVoiceResponse = "Hello Sita Ji! Based on CraftConnect AI analysis, your handmade crafts should be priced between ₹700 and ₹1,100, and Delhi Handicraft Exhibition offers your highest match rate of 94%.";
        }

        respText.innerText = currentVoiceResponse;
        respBox.style.display = "block";
        statusBox.innerText = "Click microphone or type another question:";
        speakResponse();
    }
}

/* TEXT TO SPEECH SYNTHESIS */
function speakResponse() {
    if (!('speechSynthesis' in window) || !currentVoiceResponse) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(currentVoiceResponse);
    const lang = document.getElementById("voiceLang").value;
    utterance.lang = lang || "hi-IN";
    utterance.rate = 0.95;

    window.speechSynthesis.speak(utterance);
}

/* SPEECH RECOGNITION (VOICE INPUT) */
function toggleSpeechRecognition() {
    const micBtn = document.getElementById("micBtn");
    const statusBox = document.getElementById("voiceStatus");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Web Speech recognition is best supported in Google Chrome or Microsoft Edge.");
        return;
    }

    if (recognition && micBtn.classList.contains("recording")) {
        recognition.stop();
        micBtn.classList.remove("recording");
        statusBox.innerText = "Voice recording stopped.";
        return;
    }

    recognition = new SpeechRecognition();
    const lang = document.getElementById("voiceLang").value;
    recognition.lang = lang || "hi-IN";
    recognition.interimResults = false;

    recognition.onstart = function () {
        micBtn.classList.add("recording");
        statusBox.innerText = "🎙️ Listening... Speak your craft question now.";
    };

    recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById("voiceQueryInput").value = transcript;
        micBtn.classList.remove("recording");
        statusBox.innerText = `Recognized: "${transcript}"`;
        sendVoiceQuery();
    };

    recognition.onerror = function (event) {
        micBtn.classList.remove("recording");
        statusBox.innerText = `Speech error: ${event.error}. You can also type below.`;
    };

    recognition.onend = function () {
        micBtn.classList.remove("recording");
    };

    recognition.start();
}

/* DEMAND TRENDS FETCH */
async function loadDemandTrends() {
    try {
        const res = await fetch(`${API_BASE_URL}/demand-trends`);
        const data = await res.json();
        console.log("Demand Trends:", data);
    } catch (err) {
        console.log("Demand trends loaded locally.");
    }
}

/* ARTISAN INSIGHTS FETCH */
async function loadArtisanInsights() {
    try {
        const res = await fetch(`${API_BASE_URL}/artisan-insights`);
        const data = await res.json();
        console.log("Artisan Insights:", data);
    } catch (err) {
        console.log("Artisan insights loaded locally.");
    }
}

function contactMarket(marketName) {
    const msg = currentLang === "hi" ? `${marketName} के साथ संपर्क हो रहा है... सीधा क्राफ्टकनेक्ट लीड जनरेट हुआ!` :
        currentLang === "mr" ? `${marketName} शी संपर्क साधला जात आहे... थेट क्राफ्टकनेक्ट लीड तयार झाले!` :
            currentLang === "gu" ? `${marketName} સાથે સંપર્ક થઈ રહ્યો છે... સીધું ક્રાફ્ટકનેક્ટ લીડ મળ્યું!` :
                `Connecting with ${marketName}... Direct CraftConnect Market Linkage lead generated!`;
    alert(msg);
}

function loadOrders() {
    const storageKey = getOrdersKey();
    try {
        const stored = localStorage.getItem(storageKey);
        // Demo users: if no saved state yet, seed with DEFAULT_ORDERS
        // New/real users: if no saved state, return an empty list
        const list = stored ? JSON.parse(stored) : (isDemoUser() ? [...DEFAULT_ORDERS] : []);
        return list.map(o => {
            if (o.qty === undefined) {
                const match = String(o.item || "").match(/(\d+)/);
                o.qty = match ? parseInt(match[1], 10) : 1;
            }
            if (!o.productId) {
                const itemLower = String(o.item || "").toLowerCase();
                if (itemLower.includes("bamboo")) o.productId = "prod_bamboo_basket";
                else if (itemLower.includes("diya") || itemLower.includes("urli") || itemLower.includes("terracotta")) o.productId = "prod_terracotta_diya";
                else if (itemLower.includes("dupatta") || itemLower.includes("indigo") || itemLower.includes("stole")) o.productId = "prod_indigo_stole";
                else if (itemLower.includes("coaster") || itemLower.includes("sheesham") || itemLower.includes("wood")) o.productId = "prod_wood_coasters";
            }
            if (!o.date) {
                const dateMap = {
                    "ord_001": "2026-10-01",
                    "ord_002": "2026-09-30",
                    "ord_003": "2026-10-01",
                    "ord_004": "2026-09-28",
                    "ord_005": "2026-09-26",
                    "ord_006": "2026-09-22",
                    "ord_007": "2026-09-18",
                    "ord_008": "2026-09-12",
                    "ord_009": "2026-08-25",
                    "ord_010": "2026-08-14",
                    "ord_011": "2026-05-20",
                    "ord_012": "2025-10-15"
                };
                o.date = dateMap[o.id] || "2026-09-28";
            }
            return o;
        });
    } catch (e) {
        return isDemoUser() ? [...DEFAULT_ORDERS] : [];
    }
}

function saveOrders(orders) {
    try {
        localStorage.setItem(getOrdersKey(), JSON.stringify(orders));
    } catch (e) { }
}

function getPendingCount(orders) {
    return orders.filter(o => o.status === "pending").length;
}

function updatePendingOrdersBadge() {
    const orders = loadOrders();
    const pending = getPendingCount(orders);
    const el = document.getElementById("statOrders");
    if (el) el.innerText = pending;
    const profileOrders = document.getElementById("profileStatOrders");
    if (profileOrders) profileOrders.innerText = orders.length;
    const sideBadge = document.getElementById("sidebarOrdersBadge");
    if (sideBadge) {
        sideBadge.innerText = pending;
        sideBadge.style.display = pending > 0 ? "inline-flex" : "none";
    }
    const homeBadge = document.getElementById("homeOrdersActionBadge");
    if (homeBadge) {
        homeBadge.innerText = pending;
        homeBadge.style.display = pending > 0 ? "inline-flex" : "none";
    }
    const ordersDelta = document.getElementById("statOrdersDelta");
    if (ordersDelta) ordersDelta.innerText = pending ? `→ ${pending} new` : "All caught up";
}

function openOrdersModal() {
    const modal = document.getElementById("ordersModal");
    if (!modal) return;
    modal.classList.remove("closing");
    modal.classList.add("active");
    ordersActiveFilter = "all";
    // Reset tabs
    document.querySelectorAll(".orders-tab").forEach(t => t.classList.remove("active"));
    const tabAll = document.getElementById("tabAll");
    if (tabAll) tabAll.classList.add("active");
    renderOrdersList();
}

function closeOrdersModal() {
    const modal = document.getElementById("ordersModal");
    if (!modal) return;
    modal.classList.add("closing");
    setTimeout(() => {
        modal.classList.remove("active", "closing");
    }, 210);
}

function handleOrdersModalBackdropClick(event) {
    if (event.target === document.getElementById("ordersModal")) {
        closeOrdersModal();
    }
}

function filterOrders(filter, tabEl) {
    ordersActiveFilter = filter;
    document.querySelectorAll(".orders-tab").forEach(t => t.classList.remove("active"));
    if (tabEl) tabEl.classList.add("active");
    renderOrdersList();
}

function renderOrdersList() {
    const listEl = document.getElementById("ordersList");
    const pageList = document.getElementById("ordersPageList");
    const subtitleEl = document.getElementById("ordersModalSubtitle");
    if (!listEl && !pageList) return;

    const orders = loadOrders();
    const pending = orders.filter(o => o.status === "pending");
    const dispatched = orders.filter(o => o.status === "dispatched");

    if (subtitleEl) {
        subtitleEl.innerText = `${pending.length} ${t("orders_tab_pending", "Pending").replace(/[⏳ ]/g, "").trim()} · ${dispatched.length} ${t("orders_tab_dispatched", "Dispatched").replace(/[✅ ]/g, "").trim()}`;
    }

    let filtered = orders;
    if (ordersActiveFilter === "pending") filtered = pending;
    if (ordersActiveFilter === "dispatched") filtered = dispatched;

    if (filtered.length === 0) {
        const emptyMsg = ordersActiveFilter === "pending"
            ? t("orders_empty_pending", "No pending orders right now — great work!")
            : t("orders_empty_dispatched", "No dispatched orders yet.");
        const emptyHtml = `
            <div class="orders-empty-state">
                <div class="orders-empty-icon">${ordersActiveFilter === "dispatched" ? "✅" : "🎉"}</div>
                <p>${emptyMsg}</p>
            </div>`;
        if (listEl) listEl.innerHTML = emptyHtml;
        if (pageList) pageList.innerHTML = emptyHtml;
        return;
    }

    const html = filtered.map((order, idx) => {
        const isPending = order.status === "pending";
        const statusLabel = isPending
            ? t("order_status_pending", "⏳ Pending Fulfillment")
            : t("order_status_dispatched", "✅ Completed / Dispatched");
        const badgeClass = isPending ? "pending" : "dispatched";
        const itemClass = isPending ? "" : " dispatched-item";
        const delayStyle = `animation-delay: ${idx * 0.04}s`;
        const dispatchBtnLabel = t("order_btn_dispatch", "🚀 Mark as Dispatched");

        return `
        <div class="order-item${itemClass}" id="order-row-${order.id}" style="${delayStyle}">
            <div class="order-item-header">
                <div class="order-buyer-info">
                    <div class="order-buyer-name">${order.buyer}</div>
                    <div class="order-buyer-loc">${order.location}</div>
                </div>
                <span class="order-status-badge ${badgeClass}">${statusLabel}</span>
            </div>
            <div class="order-item-body">
                <div class="order-item-desc">${order.item}</div>
                <div class="order-amount">₹${order.amount.toLocaleString("en-IN")}</div>
            </div>
            ${isPending ? `<button class="order-dispatch-btn" onclick="markOrderDispatched('${order.id}')">${dispatchBtnLabel}</button>` : ""}
        </div>`;
    }).join("");
    if (listEl) listEl.innerHTML = html;
    if (pageList) pageList.innerHTML = html;
}

async function markOrderDispatched(orderId) {
    if (typeof requireUserAuth === "function" && !requireUserAuth("Order Fulfillment & Dispatch")) return;
    const orders = loadOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order || order.status !== "pending") return;

    try {
        const response = await fetch(`/api/orders/${orderId}/dispatch`, { method: "POST" });
        if (!response.ok) throw new Error("Failed to dispatch on server");
    } catch (e) {
        console.warn("API Error, falling back to local dispatch:", e);
    }

    order.status = "dispatched";
    saveOrders(orders);
    if (typeof logAction === "function") logAction("Dispatched item", order.item);
    if (typeof pushNotification === "function") {
        pushNotification("Order dispatched", `${order.buyer} · ${order.item}`);
    }

    // Animate the row out, then re-render
    const row = document.getElementById(`order-row-${orderId}`);
    if (row) {
        row.style.transition = "opacity 0.25s ease, transform 0.25s ease";
        row.style.opacity = "0";
        row.style.transform = "scale(0.96) translateX(12px)";
        setTimeout(() => {
            renderOrdersList();
            updatePendingOrdersBadge();
        }, 270);
    } else {
        renderOrdersList();
        updatePendingOrdersBadge();
    }
}

/* ================= INITIALIZATION ================= */
document.addEventListener("DOMContentLoaded", () => {
    console.log("CraftConnect Production Prototype Ready");

    // Initialize Catalog from localStorage or seed
    initCatalog();

    // Sync the Pending Orders badge from saved order state
    updatePendingOrdersBadge();

    // Restore saved language if available
    const savedLang = localStorage.getItem("craftconnect_selected_lang");
    const savedLangName = localStorage.getItem("craftconnect_selected_lang_name");
    if (savedLang && savedLangName) {
        changeLanguage(savedLang, savedLangName);
    } else {
        applyTranslations("en");
    }

    const hashScreen = (location.hash || "").replace("#", "");
    if (hashScreen && document.getElementById(hashScreen)) {
        showScreen(hashScreen);
    }
});

/* ================= DEMAND INSIGHTS LOGIC ================= */
let activeChartCategory = 'all';

async function loadDemandTrends() {
    console.log("Fetching Demand & Trend Intelligence signals...");
    const periodSelect = document.getElementById("demandPeriodFilter");
    const categorySelect = document.getElementById("demandCategoryFilter");

    const period = periodSelect ? periodSelect.value : "30";
    const category = categorySelect ? categorySelect.value : "all";

    const summaryCards = document.getElementById("demandSummaryCards");
    const trendingGrid = document.getElementById("trendingGridContainer");
    const emergingContainer = document.getElementById("emergingOppsContainer");
    const aiList = document.getElementById("aiRecommendationsList");
    const regionalGrid = document.getElementById("regionalGridContainer");

    try {
        const res = await fetch(`/api/insights?period=${period}&category=${category}`);
        const responseData = await res.json();
        const data = responseData.data;

        if (summaryCards && data.overviewCards) {
            renderOverviewCards(data.overviewCards, summaryCards);
        }

        if (data.timeSeries) {
            renderSVGChart(data.timeSeries, activeChartCategory);
        }

        if (trendingGrid && data.trendingRightNow) {
            renderTrendingProducts(data.trendingRightNow, trendingGrid, category);
        }

        if (emergingContainer && data.emergingOpportunities) {
            renderEmergingOpps(data.emergingOpportunities, emergingContainer);
        }

        if (aiList && data.aiRecommendations) {
            renderAIRecommendations(data.aiRecommendations, aiList);
        }

        if (regionalGrid && data.regionalDemand) {
            renderRegionalDemand(data.regionalDemand, regionalGrid);
        }

    } catch (err) {
        console.error("Error loading demand insights:", err);
    }
}

function renderOverviewCards(cards, container) {
    let html = '';
    cards.forEach(c => {
        // Draw inline SVG sparkline
        const pts = c.sparkline || [40, 55, 60, 75, 88];
        const maxP = Math.max(...pts, 100);
        const minP = Math.min(...pts, 0);
        const svgPts = pts.map((val, idx) => {
            const x = (idx / (pts.length - 1)) * 70;
            const y = 28 - ((val - minP) / (maxP - minP || 1)) * 22;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');

        html += `
            <div style="background: white; border-radius: 14px; padding: 14px; border: 1px solid #E7EEEA; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: space-between;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <span style="font-size: 20px;">${c.icon}</span>
                    <svg width="70" height="30" style="overflow: visible;">
                        <polyline fill="none" stroke="#0F5147" stroke-width="2.5" stroke-linecap="round" points="${svgPts}" />
                    </svg>
                </div>
                <div>
                    <h4 style="font-size: 11px; text-transform: uppercase; color: #5a7571; letter-spacing: 0.5px; margin: 0;">${c.title}</h4>
                    <div style="font-size: 18px; font-weight: 700; color: #0F5147; margin: 2px 0;">${c.value}</div>
                    <div style="font-size: 11px; font-weight: 600; color: ${c.isPositive ? '#2e7d32' : '#666'}; font-size: 11px;">${c.change}</div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderSVGChart(timeSeries, categoryKey) {
    const container = document.getElementById("chartContainer");
    if (!container) return;

    const labels = timeSeries.labels || ["W1", "W2", "W3", "W4"];
    const datasets = timeSeries.datasets || {};
    const dataset = datasets[categoryKey] || datasets.all || [60, 70, 80, 90];

    const width = 600;
    const height = 180;
    const padding = 30;

    const maxVal = 100;
    const minVal = 40;

    const points = dataset.map((val, idx) => {
        const x = padding + (idx / (dataset.length - 1)) * (width - padding * 2);
        const y = height - padding - ((val - minVal) / (maxVal - minVal)) * (height - padding * 2);
        return { x, y, val, label: labels[idx] };
    });

    const pathD = points.reduce((acc, p, idx) => {
        return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, "");

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    let circlesSvg = points.map((p, idx) => `
        <circle cx="${p.x}" cy="${p.y}" r="5" fill="#0F5147" stroke="white" stroke-width="2">
            <title>${p.label}: ${p.val} Index</title>
        </circle>
        <text x="${p.x}" y="${height - 10}" text-anchor="middle" font-size="11" fill="#5a7571" font-family="Outfit, sans-serif">${p.label}</text>
        <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" font-size="11" font-weight="bold" fill="#0F5147" font-family="Outfit, sans-serif">${p.val}</text>
    `).join("");

    container.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; display: block; overflow: visible;">
            <!-- Grid lines -->
            <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="#E7EEEA" stroke-dasharray="4" />
            <line x1="${padding}" y1="${(height - padding * 2) / 2 + padding}" x2="${width - padding}" y2="${(height - padding * 2) / 2 + padding}" stroke="#E7EEEA" stroke-dasharray="4" />
            <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#cce2dc" />

            <!-- Gradient Area -->
            <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#0F5147" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="#0F5147" stop-opacity="0.0"/>
                </linearGradient>
            </defs>
            <path d="${areaD}" fill="url(#chartGrad)"/>
            <path d="${pathD}" fill="none" stroke="#0F5147" stroke-width="3" stroke-linecap="round"/>

            ${circlesSvg}
        </svg>
    `;
}

function setChartCategory(catKey, btn) {
    activeChartCategory = catKey;
    const pills = document.querySelectorAll('#chartCategoryPills button');
    pills.forEach(p => {
        p.style.background = '#f5f5f5';
        p.style.color = '#333';
        p.style.border = '1px solid #ddd';
    });
    if (btn) {
        btn.style.background = '#0F5147';
        btn.style.color = 'white';
        btn.style.border = '1px solid #0F5147';
    }
    loadDemandTrends();
}

function renderTrendingProducts(products, container, selectedCategory) {
    let filtered = products;
    if (selectedCategory && selectedCategory !== 'all') {
        filtered = products.filter(p => p.category.toLowerCase().includes(selectedCategory.toLowerCase()));
    }

    if (filtered.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; color: #666; text-align: center; padding: 20px;">No trending products found for this category filter.</p>`;
        return;
    }

    let html = '';
    filtered.forEach(p => {
        html += `
            <div style="background: white; border-radius: 14px; padding: 16px; border: 1px solid #E7EEEA; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: space-between; transition: transform 250ms ease;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span class="badge-craft-orange">${p.badge}</span>
                        <span style="font-size: 12px; font-weight: 700; color: #2e7d32;">${p.growth}</span>
                    </div>
                    <div style="display: flex; gap: 12px; margin-bottom: 10px;">
                        <img src="${p.image}" alt="${p.name}" style="width: 55px; height: 55px; border-radius: 10px; object-fit: cover;" onerror="this.src='images/image.png'">
                        <div>
                            <h4 style="font-size: 14px; font-weight: 700; color: #0F5147; margin: 0 0 2px 0;">${p.name}</h4>
                            <span style="font-size: 11px; background: #e8f5e9; color: #0F5147; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Demand Index: ${p.demandIndex} / 100</span>
                        </div>
                    </div>
                    <p style="font-size: 12px; color: #5a7571; margin-bottom: 8px; line-height: 1.4;">${p.description}</p>
                    <div style="font-size: 11px; color: #333; background: #f9fbf9; padding: 6px 10px; border-radius: 6px; margin-bottom: 12px;">
                        🎯 <strong>Target:</strong> ${p.targetSegment}<br>
                        💰 <strong>Price Guide:</strong> ${p.samplePrice}
                    </div>
                </div>
                <button class="btn btn-deep-teal" onclick="navigateToMarketForCategory('${p.category}')" style="width: 100%; padding: 8px 12px; font-size: 12px; border-radius: 8px; background: #0F5147; color: white; border: none; cursor: pointer; transition: all 250ms ease;">
                    View Opportunity →
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderEmergingOpps(opps, container) {
    let html = '';
    opps.forEach(o => {
        html += `
            <div style="background: white; border-radius: 14px; padding: 18px; border: 1px solid #E7EEEA; border-top: 4px solid #E99436; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <span style="font-size: 11px; background: #FDF4E7; color: #D97E1E; font-weight: 700; padding: 3px 8px; border-radius: 6px;">🎯 ${o.category}</span>
                    <h3 style="font-size: 16px; font-weight: 700; color: #0F5147; margin: 8px 0 6px 0;">${o.title}</h3>
                    <p style="font-size: 12px; color: #5a7571; margin-bottom: 8px;">👥 <strong>Target Customers:</strong> ${o.targetCustomers}</p>
                    <p style="font-size: 12px; color: #4b635e; background: #fdfdfd; border-left: 3px solid #E99436; padding: 8px 10px; border-radius: 4px; margin-bottom: 12px; line-height: 1.4;">
                        💡 <strong>Demand Rationale:</strong> ${o.evidence}
                    </p>
                    <div style="font-size: 12px; font-weight: 600; color: #0F5147; margin-bottom: 12px;">
                        🏷️ Suggested Price Range: ${o.suggestedPrice}
                    </div>
                </div>
                <button class="btn btn-deep-teal" onclick="showScreen('markets')" style="width: 100%; padding: 9px 14px; font-size: 13px; border-radius: 8px; background: #0F5147; color: white; border: none; cursor: pointer; transition: all 250ms ease;">
                    ${o.actionText || 'Explore Opportunity'} →
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderAIRecommendations(recs, container) {
    let html = '';
    recs.forEach(r => {
        html += `
            <div style="background: #f9fbf9; border-radius: 12px; padding: 14px; border: 1px solid #cce2dc; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div style="flex: 1; min-width: 200px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <span style="font-size: 11px; background: #e8f5e9; color: #0F5147; font-weight: 700; padding: 2px 8px; border-radius: 4px;">${r.category}</span>
                        <h4 style="font-size: 14px; font-weight: 700; color: #0F5147; margin: 0;">${r.title}</h4>
                    </div>
                    <p style="font-size: 12px; color: #5a7571; margin: 2px 0 4px 0;"><strong>Why:</strong> ${r.reason}</p>
                    <p style="font-size: 11px; color: #666; margin: 0;">🎯 <strong>Audience:</strong> ${r.targetAudience} • ⚡ <strong>Action:</strong> ${r.suggestedAction}</p>
                </div>
                <button class="btn btn-deep-teal" onclick="showScreen('${r.screen || 'markets'}')" style="padding: 8px 14px; font-size: 12px; border-radius: 8px; background: #0F5147; color: white; border: none; cursor: pointer; white-space: nowrap;">
                    ${r.btnText || 'View Details'} →
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderRegionalDemand(regionalList, container) {
    let html = '';
    regionalList.forEach(reg => {
        html += `
            <div style="background: white; border-radius: 12px; padding: 14px; border: 1px solid #E7EEEA; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <h4 style="font-size: 14px; font-weight: 700; color: #0F5147; margin: 0;">${reg.region}</h4>
                    <span style="font-size: 11px; background: #e8f5e9; color: #2e7d32; font-weight: 700; padding: 2px 8px; border-radius: 10px;">${reg.demandIndex} Index (${reg.trend})</span>
                </div>
                <div style="background: #ebf2ee; border-radius: 10px; height: 6px; width: 100%; overflow: hidden; margin-bottom: 8px;">
                    <div style="background: linear-gradient(90deg, #0F5147, #197565); height: 100%; width: ${reg.demandIndex}%;"></div>
                </div>
                <p style="font-size: 12px; color: #5a7571; margin-bottom: 4px;"><strong>Top Crafts:</strong> ${reg.topCategories.join(' • ')}</p>
                <p style="font-size: 11px; color: #666; margin: 0;">🏛️ <strong>Key Melas:</strong> ${reg.activeMelas}</p>
            </div>
        `;
    });
    container.innerHTML = html;
}

function navigateToMarketForCategory(category) {
    showScreen('markets');
}


/* ================= MARKETS LOGIC ================= */
let currentLat = null;
let currentLng = null;

let currentCity = null;

async function fetchWeather(city) {
    try {
        const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
        if (!res.ok) throw new Error("Weather API failed");
        const data = await res.json();

        const wCity = document.getElementById('weatherCity');
        const wDesc = document.getElementById('weatherDesc');
        const wTemp = document.getElementById('weatherTemp');

        if (wCity) wCity.innerText = data.city;
        if (wDesc) wDesc.innerText = `${data.condition} · Humidity: ${data.humidity} · Wind: ${data.wind}`;
        if (wTemp) wTemp.innerText = `${data.temp}°C`;
    } catch (e) {
        const wDesc = document.getElementById('weatherDesc');
        if (wDesc) wDesc.innerText = "Weather unavailable (Retry)";
    }
}

function updateGlobalLocation(city, state) {
    currentCity = city;
    const locString = `${city}, ${state || ""}`;
    const locDisplay = document.getElementById('locationDisplay');
    const demLoc = document.getElementById('demandLocation');
    const locStatus = document.getElementById('statusText');
    const dot = document.getElementById('statusDot');

    if (locDisplay) locDisplay.innerText = locString;
    if (demLoc) demLoc.innerText = locString;
    if (locStatus) locStatus.innerText = "Location detected";
    if (dot) dot.style.backgroundColor = "#4CAF50";

    fetchWeather(city);
    fetchNearbyMarkets(currentLat, currentLng);
    loadDigitalMarkets();
}

function requestUserLocation() {
    if (window.CraftMarketDiscovery) {
        window.CraftMarketDiscovery.requestGPSLocation();
        return;
    }
    const locDisplay = document.getElementById('locationDisplay');
    const locStatus = document.getElementById('statusText');
    const dot = document.getElementById('statusDot');

    if (!locDisplay) return;

    locDisplay.innerText = "Detecting location...";
    locStatus.innerText = "Requesting permission...";
    if (dot) dot.style.backgroundColor = "#FF9800";

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                currentLat = position.coords.latitude;
                currentLng = position.coords.longitude;
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${currentLat}&lon=${currentLng}&format=json`);
                    const data = await res.json();
                    const city = data.address.city || data.address.town || data.address.state || "Unknown";
                    updateGlobalLocation(city, data.address.state);
                } catch (e) {
                    updateGlobalLocation("Unknown Location", "");
                    if (locDisplay) locDisplay.innerText = "Location detected (Reverse Geocoding failed)";
                }
            },
            (error) => {
                locDisplay.innerText = "Location permission denied";
                locStatus.innerText = "Please use 'Enter Manually'";
                if (dot) dot.style.backgroundColor = "#F44336";
            },
            { timeout: 10000 }
        );
    } else {
        locDisplay.innerText = "Geolocation not supported";
        locStatus.innerText = "Please use 'Enter Manually'";
        if (dot) dot.style.backgroundColor = "#F44336";
    }
}

function enterManualLocation() {
    if (window.CraftMarketDiscovery) {
        window.CraftMarketDiscovery.promptManualLocation();
        return;
    }
    const manual = prompt("Enter your city and state (e.g. Jaipur, Rajasthan):");
    if (manual) {
        const parts = manual.split(',');
        const city = parts[0].trim();
        const state = parts.length > 1 ? parts[1].trim() : "";
        updateGlobalLocation(city, state);
        const locStatus = document.getElementById('statusText');
        if (locStatus) locStatus.innerText = "Manual location set";
        const dot = document.getElementById('statusDot');
        if (dot) dot.style.backgroundColor = "#4CAF50";
        fetchNearbyMarkets(null, null, manual);
        loadDigitalMarkets();
    }
}

async function fetchNearbyMarkets(lat, lng, locName = "Bhopal") {
    const localList = document.getElementById('localMarketsList');
    const localLoading = document.getElementById('localLoading');
    if (!localList) return;

    if (localLoading) localLoading.style.display = 'block';

    try {
        let targetCity = currentCity || locName || "Bhopal";
        let url = `/api/markets/nearby?city=${encodeURIComponent(targetCity)}`;
        if (lat && lng) url += `&lat=${lat}&lng=${lng}`;

        const res = await fetch(url);
        const data = await res.json();

        const markets = data.localMarkets || data.local || [];
        const spaLocalCount = document.getElementById('spaLocalCount');
        if (spaLocalCount) spaLocalCount.innerText = `${markets.length} Physical Venues`;

        if (markets.length === 0) {
            localList.innerHTML = `<p style="color:#666; padding: 15px; text-align:center;">No physical artisan hubs found nearby.</p>`;
            return;
        }

        let html = '';
        markets.forEach(m => {
            html += `
                <div class="market-card local-card" style="background: white; border: 1px solid #e0ece7; border-left: 4px solid #17665a; padding: 16px; border-radius: 12px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                        <span style="font-size: 11px; background: #e8f5e9; color: #17665a; font-weight: 700; padding: 3px 8px; border-radius: 6px;">🏪 ${m.marketType || 'Artisan Hub'}</span>
                        <span style="font-size: 11px; background: linear-gradient(135deg, #17665a, #238575); color: white; font-weight: 700; padding: 3px 8px; border-radius: 10px;">✨ ${m.aiMatchScore}% Match</span>
                    </div>
                    <h3 style="margin: 4px 0 6px 0; font-size: 16px; color: #173f39;">${m.name}</h3>
                    <p style="color: #555; font-size: 13px; margin: 0 0 8px 0; line-height: 1.4;">
                        📍 <strong>${m.distance || '2.5 km'}</strong> away • ${m.address || m.city}<br>
                        🕒 <strong>Timings:</strong> ${m.timing || '10:00 AM - 8:30 PM'}<br>
                        🎪 <strong>Mela/Fair:</strong> ${m.melaInfo || 'Artisan Display'}
                    </p>
                    <p style="color: #666; font-size: 12px; margin-bottom: 12px;">
                        <strong>Suitable for:</strong> ${(m.categories || ['Handicrafts']).join(' • ')}
                    </p>
                    <div style="display: flex; gap: 8px;">
                        <a href="${m.mapUrl}" target="_blank" class="btn" style="flex:1; background: transparent; color: #17665a; border: 1px solid #17665a; padding: 7px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; text-align: center; display: inline-block;">🗺️ View Map</a>
                        <a href="${m.directionsUrl}" target="_blank" class="btn" style="flex:1; background: #17665a; color: white; border: none; padding: 7px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; text-align: center; display: inline-block;">🧭 Get Directions</a>
                    </div>
                </div>
            `;
        });
        localList.innerHTML = html;
    } catch (e) {
        console.error(e);
        localList.innerHTML = '<p style="color:red;">Error loading physical markets. Please retry.</p>';
    } finally {
        if (localLoading) localLoading.style.display = 'none';
    }
}

async function loadDigitalMarkets() {
    const digitalList = document.getElementById('digitalMarketsList');
    const digitalLoading = document.getElementById('digitalLoading');
    if (!digitalList) return;

    if (digitalLoading) digitalLoading.style.display = 'block';

    try {
        const res = await fetch('/api/digital-markets');
        const platforms = await res.json();

        let html = '';
        platforms.forEach(p => {
            const benefitsJson = JSON.stringify(p.benefits || []).replace(/'/g, "\\'");
            const secondaryLinkHtml = p.secondaryUrl ?
                `<a href="${p.secondaryUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: #0F5147; text-decoration: underline; margin-top: 6px; display: inline-block;">Visit Myntra Partner Portal ↗</a>` : '';

            html += `
                <div class="market-card digital-card" style="background: #FFFFFF; border: 1px solid #E7EEEA; border-left: 4px solid #0F5147; padding: 18px; border-radius: 16px; margin-bottom: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <span style="font-size: 11px; background: #EAF4F2; color: #0F5147; font-weight: 700; padding: 4px 10px; border-radius: 6px;">🌐 ${p.type || 'Pan-India Channel'}</span>
                        <span style="font-size: 11px; background: linear-gradient(135deg, #0F5147, #197565); color: #FFFFFF; font-weight: 700; padding: 4px 10px; border-radius: 12px;">✨ ${p.aiMatchScore}% Match</span>
                    </div>
                    <h3 style="margin: 4px 0 6px 0; font-size: 16px; color: #0F5147; font-weight: 700;">${p.name}</h3>
                    <p style="color: #5a7571; font-size: 13px; margin: 0 0 6px 0; line-height: 1.4;">
                        🌍 <strong>Reach:</strong> ${p.reach}<br>
                        💰 <strong>Commission:</strong> <span class="badge-craft-orange">${p.commission || '0%'}</span>
                    </p>
                    <p style="color: #4b635e; font-size: 12px; margin-bottom: 12px; line-height: 1.4;">${p.description}</p>
                    ${secondaryLinkHtml}
                    <div style="display: flex; gap: 8px; margin-top: 10px;">
                        <button class="btn btn-digital" onclick="openSellerModal('${p.id}', '${p.name}', '${p.type}', '${p.sellerUrl}', ${benefitsJson})" style="background-color: #0F5147; color: #FFFFFF; border: none; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 250ms ease; display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; shadow: 0 2px 6px rgba(15, 81, 71, 0.15);">
                            🚀 ${p.actionLabel || 'Connect Seller Account'} →
                        </button>
                    </div>
                </div>
            `;
        });
        digitalList.innerHTML = html;
    } catch (e) {
        console.error(e);
        digitalList.innerHTML = '<p style="color:red;">Error loading digital markets.</p>';
    } finally {
        if (digitalLoading) digitalLoading.style.display = 'none';
    }
}

function selectSpaCity(cityName) {
    if (window.CraftMarketDiscovery) {
        window.CraftMarketDiscovery.searchManualCity(cityName);
        return;
    }
    currentCity = cityName;
    currentLat = null;
    currentLng = null;

    const locDisplay = document.getElementById('locationDisplay');
    const locStatus = document.getElementById('statusText');
    const dot = document.getElementById('statusDot');

    if (locDisplay) locDisplay.innerText = `${cityName}, India`;
    if (locStatus) locStatus.innerText = `Selected regional artisan hub (${cityName})`;
    if (dot) dot.style.backgroundColor = '#4CAF50';

    const chips = document.querySelectorAll('#spaCityChips button');
    chips.forEach(c => {
        if (c.innerText.includes(cityName)) {
            c.style.background = '#0F5147';
            c.style.color = '#FFFFFF';
            c.style.border = '1px solid #0F5147';
        } else {
            c.style.background = '#f5f5f5';
            c.style.color = '#333';
            c.style.border = '1px solid #ddd';
        }
    });

    fetchNearbyMarkets(null, null, cityName);
}

function switchSpaTab(tab) {
    if (window.CraftMarketDiscovery) {
        window.CraftMarketDiscovery.switchTab(tab);
        return;
    }
    const localSec = document.getElementById('localSection');
    const digitalSec = document.getElementById('digitalSection');
    const tabAll = document.getElementById('spaTabAll');
    const tabLocal = document.getElementById('spaTabLocal');
    const tabDigital = document.getElementById('spaTabDigital');

    if (!localSec || !digitalSec) return;

    if (tab === 'all') {
        localSec.style.display = 'block';
        digitalSec.style.display = 'block';
        if (tabAll) { tabAll.style.background = 'white'; tabAll.style.color = '#0F5147'; }
        if (tabLocal) { tabLocal.style.background = 'transparent'; tabLocal.style.color = '#666'; }
        if (tabDigital) { tabDigital.style.background = 'transparent'; tabDigital.style.color = '#666'; }
    } else if (tab === 'local') {
        localSec.style.display = 'block';
        digitalSec.style.display = 'none';
        if (tabAll) { tabAll.style.background = 'transparent'; tabAll.style.color = '#666'; }
        if (tabLocal) { tabLocal.style.background = 'white'; tabLocal.style.color = '#0F5147'; }
        if (tabDigital) { tabDigital.style.background = 'transparent'; tabDigital.style.color = '#666'; }
    } else if (tab === 'digital') {
        localSec.style.display = 'none';
        digitalSec.style.display = 'block';
        if (tabAll) { tabAll.style.background = 'transparent'; tabAll.style.color = '#666'; }
        if (tabLocal) { tabLocal.style.background = 'transparent'; tabLocal.style.color = '#666'; }
        if (tabDigital) { tabDigital.style.background = 'white'; tabDigital.style.color = '#0F5147'; }
    }
}

function openSellerModal(id, name, type, sellerUrl, benefits) {
    if (window.CraftMarketDiscovery) {
        window.CraftMarketDiscovery.openOnboardingModal(id);
        return;
    }
    const modal = document.getElementById('sellerModal');
    if (!modal) {
        window.open(sellerUrl, '_blank', 'noopener,noreferrer');
        return;
    }
    const nameEl = document.getElementById('modalPlatformName');
    const typeEl = document.getElementById('modalPlatformType');
    const linkEl = document.getElementById('modalSellerLink');
    const perksEl = document.getElementById('modalPerksList');

    if (nameEl) nameEl.innerText = name;
    if (typeEl) typeEl.innerText = type;
    if (linkEl) {
        linkEl.href = sellerUrl;
        linkEl.target = "_blank";
        linkEl.rel = "noopener noreferrer";
    }

    if (perksEl) {
        const perks = benefits || [
            "Direct artisan seller registration",
            "0% commission listing support",
            "Pan-India logistics and payment processing"
        ];
        perksEl.innerHTML = perks.map(b => `<li style="padding: 6px 0; border-bottom: 1px solid #f0f4f3; font-size: 13px; display: flex; align-items: center; gap: 8px;"><span style="color:#0F5147; font-weight:bold;">✓</span> ${b}</li>`).join('');
    }

    modal.style.display = 'flex';
}

function closeSellerModal() {
    const modal = document.getElementById('sellerModal');
    if (modal) modal.style.display = 'none';
}

function simulateSync() {
    if (typeof requireUserAuth === "function" && !requireUserAuth("Queue Catalog Cloud Sync")) return;
    alert("⚡ Catalog Sync Queued!\n\nYour CraftConnect artisan catalog is ready to connect with the official seller account portal.");
    closeSellerModal();
}

function handleAddCraftClick() {
    if (typeof requireUserAuth === "function" && !requireUserAuth("Add Craft to Catalog", () => showScreen('products'))) return;
    showScreen('products');
}

function handleSelectImageClick(event) {
    if (typeof requireUserAuth === "function" && !requireUserAuth("Upload Craft Photo for AI Analysis")) {
        if (event) event.preventDefault();
        return false;
    }
}

window.handleAddCraftClick = handleAddCraftClick;
window.handleSelectImageClick = handleSelectImageClick;