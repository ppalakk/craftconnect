/* =========================================================
 *  CraftConnect — Core Application Coordinator & Navigation
 * ========================================================= */

window.API_BASE_URL = "";
window.currentLang = window.currentLang || "en";

function getDefaultOrders() {
    if (typeof window !== "undefined" && Array.isArray(window.DEFAULT_ORDERS) && window.DEFAULT_ORDERS.length) {
        return window.DEFAULT_ORDERS;
    }
    return (typeof DEFAULT_ORDERS !== 'undefined' && Array.isArray(DEFAULT_ORDERS)) ? DEFAULT_ORDERS : [];
}

/* ========== USER-SCOPED STORAGE HELPERS ========== */
function getCurrentUserId() {
    const user = window.CC_USER;
    return (user && user.id) ? user.id : "guest";
}

const DEMO_USER_EMAILS = ["sita@artisan.com", "rajesh@supplier.com", "priya@buyer.com"];
function isDemoUser() {
    const user = window.CC_USER;
    if (!user) return false;
    return DEMO_USER_EMAILS.includes((user.email || "").toLowerCase());
}

function getCatalogKey() {
    return "craftconnect_catalog_" + getCurrentUserId();
}

function getOrdersKey() {
    return "craftconnect_orders_" + getCurrentUserId();
}

/* ================= SCREEN NAVIGATION ================= */
function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));

    const target = document.getElementById(screenId);
    if (target) target.classList.add("active");

    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    const navMap = { "home": 0, "catalog": 1, "products": 2, "markets": 3, "profile": 4, "insights": 3, "orders": 1 };
    if (navMap[screenId] !== undefined) {
        const navItems = document.querySelectorAll(".nav-item");
        if (navItems[navMap[screenId]]) navItems[navMap[screenId]].classList.add("active");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    if (location.hash !== "#" + screenId) {
        history.replaceState(null, "", "#" + screenId);
    }

    if (screenId === "catalog" && typeof renderCatalog === "function") renderCatalog();
    else if (screenId === "insights" && typeof loadDemandTrends === "function") loadDemandTrends();
    else if (screenId === "profile") {
        if (typeof loadArtisanInsights === "function") loadArtisanInsights();
        if (typeof renderArtisanQr === "function") renderArtisanQr();
    } else if (screenId === "orders") {
        if (typeof renderOrdersList === "function") renderOrdersList();
        if (typeof fetchOrdersFromApi === "function") fetchOrdersFromApi(true);
    }
    else if (screenId === "materials" && typeof renderMaterials === "function") renderMaterials();
    else if (screenId === "schemes" && typeof renderSchemes === "function") renderSchemes();
    else if (screenId === "forum" && typeof renderForum === "function") renderForum();
    else if (screenId === "finance" && typeof renderFinance === "function") renderFinance();

    const search = document.getElementById("globalAppSearch");
    if (search) {
        search.placeholder = screenId === "schemes"
            ? "Search schemes, loans, subsidies, or keywords..."
            : "Search products, markets, schemes, or anything...";
    }
}

/* ================= MOBILE HEADER CONTROLLERS ================= */
function toggleMobileSearch(forceState) {
    const searchWrap = document.getElementById("mobileSearchExpand");
    const searchInput = document.getElementById("mobileAppSearch");
    if (!searchWrap) return;
    const shouldShow = (typeof forceState === "boolean")
        ? forceState
        : (searchWrap.style.display === "none" || !searchWrap.style.display);
    searchWrap.style.display = shouldShow ? "block" : "none";
    if (shouldShow && searchInput) setTimeout(() => searchInput.focus(), 60);
}

function toggleMobileProfileMenu() {
    const menu = document.getElementById("mobileProfileMenu");
    if (menu) menu.classList.toggle("show");
}

function closeMobileProfileMenu() {
    const menu = document.getElementById("mobileProfileMenu");
    if (menu) menu.classList.remove("show");
}

/* ================= EVENT LISTENERS & BOOTSTRAP ================= */
document.addEventListener("click", function(e) {
    const profileContainer = document.getElementById("mobileProfileDropdownContainer");
    if (profileContainer && !profileContainer.contains(e.target)) closeMobileProfileMenu();
    const langDropdown = document.getElementById("languageDropdown");
    if (langDropdown && !langDropdown.contains(e.target)) {
        const langMenu = document.getElementById("languageMenu");
        if (langMenu) langMenu.classList.remove("show");
    }
});

document.addEventListener("DOMContentLoaded", () => {
    console.log("CraftConnect Production Prototype Ready");

    if (typeof initCatalog === "function") initCatalog();
    if (typeof updatePendingOrdersBadge === "function") updatePendingOrdersBadge();

    const savedLang = localStorage.getItem("craftconnect_selected_lang");
    const savedLangName = localStorage.getItem("craftconnect_selected_lang_name");
    if (savedLang && savedLangName && typeof changeLanguage === "function") {
        changeLanguage(savedLang, savedLangName);
    } else if (typeof applyTranslations === "function") {
        applyTranslations("en");
    }

    const hashScreen = (location.hash || "").replace("#", "");
    if (hashScreen && document.getElementById(hashScreen)) {
        showScreen(hashScreen);
    }
});
