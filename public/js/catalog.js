/* =========================================================
 *  CraftConnect — Product Catalog & AI Scan Module
 * ========================================================= */

var catalogProducts = [];
var activeFilter = "all";
var activeSearch = "";
var catalogSort = "default";
var pendingCatalogDraft = null;
var selectedProductForDetail = null;

function initCatalog() {
    const storageKey = getCatalogKey();
    try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            catalogProducts = JSON.parse(stored);
        } else if (isDemoUser()) {
            const defs = typeof DEFAULT_PRODUCTS !== 'undefined' ? DEFAULT_PRODUCTS : [];
            catalogProducts = [...defs];
            saveCatalogToStorage();
        } else {
            catalogProducts = [];
            saveCatalogToStorage();
        }
    } catch (e) {
        const defs = typeof DEFAULT_PRODUCTS !== 'undefined' ? DEFAULT_PRODUCTS : [];
        catalogProducts = isDemoUser() ? [...defs] : [];
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

    const totalVal = catalogProducts.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
    const catValEl = document.getElementById("catalogTotalValue");
    if (catValEl) {
        catValEl.innerText = "₹" + totalVal.toLocaleString("en-IN");
    }

    const readyEl = document.getElementById("catalogReadyCount");
    if (readyEl) {
        readyEl.innerText = count > 0 ? "100%" : "0%";
    }

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

    const filtered = catalogProducts.filter(prod => {
        const matchesCategory = (activeFilter === "all") ||
            (prod.category_code === activeFilter) ||
            (prod.category && prod.category.toLowerCase().includes(activeFilter)) ||
            (prod.craft_type && prod.craft_type.toLowerCase().includes(activeFilter));

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
        if (emptyState) emptyState.style.display = "block";
    } else {
        if (emptyState) emptyState.style.display = "none";
        filtered.forEach(prod => {
            const card = document.createElement("div");
            card.className = "catalog-card";
            card.id = `card_${prod.id}`;

            const langKey = typeof currentLang !== 'undefined' ? currentLang : 'en';
            const dict = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[langKey]) ? TRANSLATIONS[langKey] : {};
            const viewTxt = dict.card_view_details || "View Details";
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

function openProductDetail(productId) {
    const prod = catalogProducts.find(p => p.id === productId);
    if (!prod) return;

    selectedProductForDetail = productId;

    document.getElementById("modalProductTitle").innerText = prod.name;
    document.getElementById("modalProductCraft").innerText = prod.craft_type || prod.category || "Handicraft";
    document.getElementById("modalCategory").innerText = prod.category || "Traditional Craft";
    document.getElementById("modalProductImg").src = prod.image || "images/image.png";
    document.getElementById("modalProductDesc").innerText = prod.description || "Detailed AI description not available.";

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

    document.getElementById("modalTargetMarket").innerText = prod.target_market || "Home Decor Buyers, Cultural Exhibitions, Retailers";
    document.getElementById("modalPrice").innerText = "₹" + (Number(prod.price) || 750).toLocaleString("en-IN");
    document.getElementById("modalPriceTier").innerText = prod.price_tier || "Mid-range";
    document.getElementById("modalPriceReason").innerText = prod.reasoning || "Based on AI pricing analysis evaluated against craft complexity and market demand.";

    document.getElementById("productDetailModal").classList.add("active");
}

function closeProductDetail() {
    const modal = document.getElementById("productDetailModal");
    if (modal) modal.classList.remove("active");
    selectedProductForDetail = null;
}

function deleteCurrentProduct() {
    if (!selectedProductForDetail) return;
    deleteProductFromCatalog(selectedProductForDetail);
    closeProductDetail();
}

function deleteProductFromCatalog(productId, event) {
    if (event) event.stopPropagation();
    const langKey = typeof currentLang !== 'undefined' ? currentLang : 'en';
    const confirmMsg = langKey === "hi" ? "क्या आप वाकई इस उत्पाद को कैटलॉग से हटाना चाहते हैं?" :
        langKey === "mr" ? "तुम्हाला नक्की हे उत्पादन कॅटलॉगमधून काढून टाकायचे आहे का?" :
            langKey === "gu" ? "શું તમે ખરેખર આ પ્રોડક્ટને કેટલોગમાંથી કાઢી નાખવા માંગો છો?" :
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
    const fileInput = event.target;

    const reader = new FileReader();
    reader.onload = function (e) {
        preview.src = e.target.result;
    };
    reader.readAsDataURL(file);

    result.style.display = "none";
    if (notice) notice.style.display = "none";
    loading.style.display = "block";
    pendingCatalogDraft = null;
    fileInput.disabled = true;

    const uploadTimestamp = Date.now();
    window._lastScanTimestamp = uploadTimestamp;

    const formData = new FormData();
    formData.append("file", file);

    let catalogData = null;
    let pricingData = null;

    try {
        const response = await fetch('/api/ai/scan', {
            method: "POST",
            body: formData
        });

        if (window._lastScanTimestamp !== uploadTimestamp) {
            console.log("Discarding stale AI scan response.");
            return;
        }

        if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(errBody.error || `AI analysis error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Live AI Analysis Response:", data);

        catalogData = {
            product_name: data.title,
            category: data.category,
            craft_type: data.craftType,
            description: data.description,
            visual_features: data.features || [],
            materials: data.materials || [],
            tags: data.tags || [],
            target_market: typeof data.targetMarket === "string"
                ? data.targetMarket.split(", ").filter(Boolean)
                : (Array.isArray(data.targetMarket) ? data.targetMarket : [])
        };

        const confVal = Number(data.confidence) || 75;
        let priceTier = "Mid-range";
        if (data.recommendedPrice > 1500) priceTier = "Premium";
        else if (data.recommendedPrice < 500) priceTier = "Budget";

        pricingData = {
            predicted_price_tier: priceTier,
            price_display: data.priceRange || `₹${data.suggestedPriceMin || 0} – ₹${data.suggestedPriceMax || 0}`,
            recommended_price_inr: data.recommendedPrice,
            suggested_min_inr: data.suggestedPriceMin,
            suggested_max_inr: data.suggestedPriceMax,
            confidence_score: confVal / 100,
            reasoning: `Evaluated by Gemini Vision AI analysis with ${confVal}% confidence based on the detected product characteristics.`
        };
    } catch (err) {
        console.error("AI API failed:", err);
        loading.style.display = "none";
        fileInput.disabled = false;

        if (notice) {
            notice.style.display = "flex";
            const strong = notice.querySelector("strong");
            if (strong) strong.innerText = "⚠️ AI analysis failed: " + (err.message || "Please try again.");
            const sub = notice.querySelector("p");
            if (sub) sub.innerText = "You can retry by uploading the image again.";
        }
        return;
    } finally {
        fileInput.disabled = false;
    }

    if (window._lastScanTimestamp !== uploadTimestamp) return;

    document.getElementById("resTitle").innerText = catalogData.product_name || "Handcrafted Craft";
    document.getElementById("resCategory").innerText = catalogData.category || "Handicraft";
    document.getElementById("resCraft").innerText = catalogData.craft_type || "Traditional Craft";
    document.getElementById("resDescription").innerText = catalogData.description || "";

    const featList = document.getElementById("resFeatures");
    featList.innerHTML = "";
    if (catalogData.visual_features && catalogData.visual_features.length > 0) {
        catalogData.visual_features.forEach(feat => {
            const li = document.createElement("li");
            li.innerText = feat;
            featList.appendChild(li);
        });
    }

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

    document.getElementById("resTargetMarket").innerText = Array.isArray(catalogData.target_market) ?
        catalogData.target_market.join(", ") : catalogData.target_market;

    document.getElementById("resTier").innerText = pricingData.predicted_price_tier || "Mid-range";
    document.getElementById("resPriceRange").innerText = pricingData.price_display || `₹${pricingData.suggested_min_inr || 0} – ₹${pricingData.suggested_max_inr || 0}`;
    document.getElementById("resRecPrice").innerText = `₹${pricingData.recommended_price_inr || 0}`;

    const confScore = Math.round((pricingData.confidence_score || 0) * 100);
    document.getElementById("resConfidence").innerText = `${confScore}%`;
    document.getElementById("resConfidenceFill").style.width = `${confScore}%`;
    document.getElementById("resReasoning").innerText = pricingData.reasoning || "";

    const categoryCode = mapCategoryCode(catalogData.category);
    const uniqueTitle = uniqueProductName(catalogData.product_name, file && file.name);
    const uniqueDesc = catalogData.description || `Handcrafted ${uniqueTitle} analyzed on ${new Date().toLocaleDateString("en-IN")}.`;

    pendingCatalogDraft = {
        id: "prod_" + Date.now(),
        name: uniqueTitle,
        category_code: categoryCode,
        category: catalogData.category || "Handicraft",
        craft_type: catalogData.craft_type || "Traditional Craft",
        image: preview.src,
        price: Number(pricingData.recommended_price_inr) || 500,
        price_tier: pricingData.predicted_price_tier || "Mid-range",
        price_range: pricingData.price_display || "Price estimate unavailable",
        confidence: pricingData.confidence_score || 0,
        description: uniqueDesc,
        features: catalogData.visual_features || [],
        tags: catalogData.tags || [],
        target_market: Array.isArray(catalogData.target_market) ? catalogData.target_market.join(", ") : catalogData.target_market,
        reasoning: pricingData.reasoning || ""
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
        const strong = notice.querySelector("strong");
        if (strong) strong.innerText = "Review the unique fields below, then save to catalog.";
        const sub = notice.querySelector("p");
        if (sub) sub.innerText = "Available under your digital artisan showcase.";
    }

    loading.style.display = "none";
    result.style.display = "block";
    result.scrollIntoView({ behavior: "smooth" });
}

function mapCategoryCode(category) {
    const text = String(category || "").toLowerCase();
    if (text.includes("bamboo") || (text.includes("wood") && !text.includes("decor"))) return "bamboo";
    if (text.includes("terra") || text.includes("clay") || text.includes("pott") || text.includes("ceramic")) return "terracotta";
    if (text.includes("textile") || text.includes("loom") || text.includes("fabric") || text.includes("weav") || text.includes("embroid")) return "textile";
    if (text.includes("decor") || text.includes("gift") || text.includes("metal") || text.includes("paint")) return "decor";
    return "decor";
}

function uniqueProductName(aiName, fileName) {
    if (aiName && String(aiName).trim() && !/^handcrafted artisan specialty$/i.test(aiName) && !/^handwoven bamboo basket$/i.test(aiName)) {
        return String(aiName).trim();
    }
    const fromFile = fileName ? fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() : "";
    if (fromFile && fromFile.length > 2 && !/image|img|photo|dsc|screenshot/i.test(fromFile)) {
        return fromFile.replace(/\b\w/g, (c) => c.toUpperCase());
    }
    const stamp = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
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
        textile: "Textiles & Weaving",
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

