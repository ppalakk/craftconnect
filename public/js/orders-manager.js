/* =========================================================
 *  CraftConnect — Orders Management & Fulfillment Module
 * ========================================================= */

var ordersActiveFilter = "all";
var cachedOrders = null;
var isLoadingOrders = false;

/* ─── Helpers ─────────────────────────────────────────── */

function formatOrderDate(dateStr) {
    if (!dateStr) return "Recent";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr);
        return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
    } catch { return String(dateStr); }
}

function normalizeOrderItem(o) {
    if (!o) return o;
    const item = { ...o };
    if (!item.id  && item.orderId) item.id  = item.orderId;
    if (!item.orderId && item.id)  item.orderId = item.id;

    if (item.qty === undefined) {
        const match = String(item.item || "").match(/(\d+)/);
        item.qty = match ? parseInt(match[1], 10) : 1;
    }
    if (!item.productId) {
        const il = String(item.item || "").toLowerCase();
        if      (il.includes("bamboo"))                                  item.productId = "prod_bamboo_basket";
        else if (il.includes("diya")  || il.includes("urli")  || il.includes("terracotta")) item.productId = "prod_terracotta_diya";
        else if (il.includes("dupatta") || il.includes("indigo") || il.includes("stole"))   item.productId = "prod_indigo_stole";
        else if (il.includes("coaster") || il.includes("sheesham") || il.includes("wood"))  item.productId = "prod_wood_coasters";
    }
    if (!item.productImage) {
        const imgMap = {
            "prod_bamboo_basket":  "/public/images/hero_crafts.jpg",
            "prod_indigo_stole":   "/public/images/store_craft_bazaar.jpg",
            "prod_terracotta_diya":"/public/images/hero_pots.jpg",
            "prod_wood_coasters":  "/public/images/store_artisan_hub.jpg"
        };
        item.productImage = imgMap[item.productId] || "/public/images/hero_crafts.jpg";
    }
    if (!item.date) {
        const dateMap = {
            "ord_001":"2026-10-01","ord_002":"2026-09-30","ord_003":"2026-10-01",
            "ord_004":"2026-09-28","ord_005":"2026-09-26","ord_006":"2026-09-22",
            "ord_007":"2026-09-18","ord_008":"2026-09-12","ord_009":"2026-08-25",
            "ord_010":"2026-08-14","ord_011":"2026-05-20","ord_012":"2025-10-15"
        };
        item.date = dateMap[item.id] || "2026-09-28";
    }
    // Normalise buyer: might be an object (from API) or a plain string (localStorage seed)
    if (item.buyer && typeof item.buyer === "object") {
        item.buyerName    = item.buyer.name     || "Customer";
        item.buyerLoc     = item.buyer.location || "📍 India";
        item.buyerDetails = item.buyer;
        item.buyer        = item.buyerName;      // keep .buyer as string for legacy code
    } else {
        item.buyerName = item.buyer || "Customer";
        item.buyerLoc  = item.location || "📍 India";
    }
    return item;
}

/* ─── LocalStorage persistence ───────────────────────── */

function loadLocalOrders() {
    const storageKey = getOrdersKey();
    try {
        const stored = localStorage.getItem(storageKey);
        const list   = stored ? JSON.parse(stored) : (isDemoUser() ? [...getDefaultOrders()] : []);
        return Array.isArray(list) ? list.map(normalizeOrderItem) : [];
    } catch (e) {
        return isDemoUser() ? [...getDefaultOrders()].map(normalizeOrderItem) : [];
    }
}

function loadOrders() {
    if (Array.isArray(cachedOrders) && cachedOrders.length > 0) return cachedOrders;
    const local = loadLocalOrders();
    if (local && local.length > 0) {
        cachedOrders = local;
        return local;
    }
    return [];
}

function saveOrders(orders) {
    try { localStorage.setItem(getOrdersKey(), JSON.stringify(orders)); } catch (e) {}
}

/* ─── Badge updater ───────────────────────────────────── */

function getPendingCount(orders) {
    if (!Array.isArray(orders)) return 0;
    return orders.filter(o => o.status === "pending").length;
}

function updatePendingOrdersBadge(orders) {
    const list       = orders || cachedOrders || loadOrders();
    const pending    = getPendingCount(list);
    const dispatched = list.filter(o => o.status === "dispatched").length;

    const el = document.getElementById("statOrders");
    if (el) el.innerText = pending;

    const profileOrders = document.getElementById("profileStatOrders");
    if (profileOrders) profileOrders.innerText = list.length;

    const sideBadge = document.getElementById("sidebarOrdersBadge");
    if (sideBadge) {
        sideBadge.innerText      = pending;
        sideBadge.style.display  = pending > 0 ? "inline-flex" : "none";
    }
    const homeBadge = document.getElementById("homeOrdersActionBadge");
    if (homeBadge) {
        homeBadge.innerText     = pending;
        homeBadge.style.display = pending > 0 ? "inline-flex" : "none";
    }
    const ordersDelta = document.getElementById("statOrdersDelta");
    if (ordersDelta) ordersDelta.innerText = pending ? `\u2192 ${pending} new` : "All caught up";

    const subtitleEl = document.getElementById("ordersModalSubtitle");
    if (subtitleEl) {
        const tFunc = typeof t === "function" ? t : (k, fb) => fb || k;
        subtitleEl.innerText = `${pending} ${tFunc("orders_tab_pending","Pending").replace(/[⏳ ]/g,"").trim()} · ${dispatched} ${tFunc("orders_tab_dispatched","Dispatched").replace(/[✅ ]/g,"").trim()}`;
    }
}

/* ─── API fetch ───────────────────────────────────────── */

async function fetchOrdersFromApi(force) {
    if (isLoadingOrders && !force) return;
    isLoadingOrders = true;

    const pageList = document.getElementById("ordersPageList");
    const listEl   = document.getElementById("ordersList");

    // Show spinner only when cache is cold
    if (!cachedOrders || cachedOrders.length === 0) {
        const loadingHtml = `
            <div style="text-align:center;padding:48px 20px;">
                <div style="display:inline-block;width:32px;height:32px;border:3px solid #d8ede3;border-top-color:#0F5147;border-radius:50%;animation:orderSpin 0.75s linear infinite;margin-bottom:12px;"></div>
                <p style="font-size:13.5px;font-weight:600;color:#173f39;margin-bottom:4px;">Loading artisan orders…</p>
                <p style="font-size:12px;color:#777;">Fetching verified buyer orders from database</p>
            </div>`;
        if (pageList) pageList.innerHTML = loadingHtml;
        if (listEl)   listEl.innerHTML   = loadingHtml;
    }

    try {
        const response = await fetch("/api/orders?status=all", {
            headers: { Accept: "application/json" }
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const data = await response.json();
        if (data && data.ok && Array.isArray(data.orders)) {
            cachedOrders = data.orders.map(normalizeOrderItem);
            saveOrders(cachedOrders);
            updatePendingOrdersBadge(cachedOrders);
            renderOrdersList();
            isLoadingOrders = false;
            return;
        }
        throw new Error("Invalid response format");
    } catch (e) {
        console.warn("Orders API notice (using local seed):", e.message);
        cachedOrders = loadLocalOrders();
        // If still empty force getDefaultOrders
        if ((!cachedOrders || cachedOrders.length === 0) && isDemoUser()) {
            cachedOrders = [...getDefaultOrders()].map(normalizeOrderItem);
        }
        updatePendingOrdersBadge(cachedOrders);
        renderOrdersList();
    } finally {
        isLoadingOrders = false;
    }
}

/* ─── Modal open/close ────────────────────────────────── */

function openOrdersModal() {
    const modal = document.getElementById("ordersModal");
    if (!modal) return;
    modal.classList.remove("closing");
    modal.classList.add("active");
    ordersActiveFilter = "all";
    document.querySelectorAll("#ordersFilterTabs .orders-tab").forEach(t => t.classList.remove("active"));
    const tabAll = document.getElementById("tabAll");
    if (tabAll) tabAll.classList.add("active");
    renderOrdersList();
    fetchOrdersFromApi(true);
}

function closeOrdersModal() {
    const modal = document.getElementById("ordersModal");
    if (!modal) return;
    modal.classList.add("closing");
    setTimeout(() => modal.classList.remove("active", "closing"), 210);
}

function handleOrdersModalBackdropClick(event) {
    if (event.target === document.getElementById("ordersModal")) closeOrdersModal();
}

/* ─── Tab filtering ───────────────────────────────────── */

function filterOrders(filter, tabEl) {
    ordersActiveFilter = filter;

    // Reset all tabs in BOTH the page screen and the modal
    document.querySelectorAll(".orders-tab").forEach(t => t.classList.remove("active"));

    // Activate the clicked tab (and its twin if present)
    document.querySelectorAll(".orders-tab").forEach(t => {
        const oc = t.getAttribute("onclick") || "";
        if (oc.includes(`'${filter}'`)) t.classList.add("active");
    });
    // Explicit clicked element in case onclick attr differs
    if (tabEl) tabEl.classList.add("active");

    renderOrdersList();
}

/* ─── Render ──────────────────────────────────────────── */

function renderOrdersList() {
    const listEl   = document.getElementById("ordersList");
    const pageList = document.getElementById("ordersPageList");
    if (!listEl && !pageList) return;

    const orders     = cachedOrders || loadOrders();
    const pending    = orders.filter(o => o.status === "pending");
    const dispatched = orders.filter(o => o.status === "dispatched");

    const tFunc = typeof t === "function" ? t : (k, fb) => fb || k;

    const subtitleEl = document.getElementById("ordersModalSubtitle");
    if (subtitleEl) {
        subtitleEl.innerText = `${pending.length} ${tFunc("orders_tab_pending","Pending").replace(/[⏳ ]/g,"").trim()} · ${dispatched.length} ${tFunc("orders_tab_dispatched","Dispatched").replace(/[✅ ]/g,"").trim()}`;
    }

    // Update summary pills on orders page screen
    const pgPend = document.getElementById("ordersPagePendingCount");
    if (pgPend) pgPend.innerText = pending.length;
    const pgDisp = document.getElementById("ordersPageDispatchedCount");
    if (pgDisp) pgDisp.innerText = dispatched.length;

    let filtered = orders;
    if (ordersActiveFilter === "pending")    filtered = pending;
    else if (ordersActiveFilter === "dispatched") filtered = dispatched;

    if (filtered.length === 0) {
        let emptyMsg  = "No orders found yet.";
        let emptyIcon = "🛍️";
        if (ordersActiveFilter === "pending") {
            emptyMsg  = tFunc("orders_empty_pending", "No pending orders right now — great work! 🎉");
            emptyIcon = "🎉";
        } else if (ordersActiveFilter === "dispatched") {
            emptyMsg  = tFunc("orders_empty_dispatched", "No dispatched orders yet.");
            emptyIcon = "📦";
        }
        const emptyHtml = `
            <div class="orders-empty-state">
                <div class="orders-empty-icon">${emptyIcon}</div>
                <h4 style="font-size:15px;font-weight:700;color:#173f39;margin-bottom:6px;">${emptyMsg}</h4>
                <p style="font-size:13px;color:#777;max-width:340px;margin:0 auto;line-height:1.45;">
                    ${ordersActiveFilter === "all"
                        ? "When buyers purchase your handcrafted creations, fulfillment details appear here."
                        : "Switch to another tab to view all orders."}
                </p>
            </div>`;
        if (listEl)   listEl.innerHTML   = emptyHtml;
        if (pageList) pageList.innerHTML = emptyHtml;
        return;
    }

    const html = filtered.map((order, idx) => {
        const isPending        = order.status === "pending";
        const statusLabel      = isPending
            ? tFunc("order_status_pending", "⏳ Pending Fulfillment")
            : tFunc("order_status_dispatched", "✅ Completed / Dispatched");
        const badgeClass       = isPending ? "pending" : "dispatched";
        const itemClass        = isPending ? "" : " dispatched-item";
        const delayStyle       = `animation-delay:${idx * 0.04}s`;
        const dispatchBtnLabel = tFunc("order_btn_dispatch", "🚀 Mark as Dispatched");

        const orderIdDisplay = (order.orderId || order.id || "").toString().toUpperCase();
        const buyerName      = order.buyerName || order.buyer || "Customer";
        const buyerLoc       = order.buyerLoc  || order.location || "📍 India";
        const orderDateFmt   = formatOrderDate(order.date);
        const orderImg       = order.productImage || "/public/images/hero_crafts.jpg";
        const qtyNum         = Number(order.qty)    || 1;
        const amountNum      = Number(order.amount) || 0;
        const orderId        = order.id || order.orderId || idx;

        return `
        <div class="order-item${itemClass}" id="order-row-${orderId}" style="${delayStyle}">
            <div class="order-item-header">
                <div class="order-buyer-info">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px;">
                        <span class="order-id-tag">#${orderIdDisplay}</span>
                        <span class="order-buyer-name">${buyerName}</span>
                    </div>
                    <div class="order-buyer-loc">${buyerLoc} &nbsp;·&nbsp; 📅 ${orderDateFmt}</div>
                </div>
                <span class="order-status-badge ${badgeClass}">${statusLabel}</span>
            </div>
            <div class="order-item-body" style="display:flex;align-items:center;gap:12px;margin-top:10px;">
                <img src="${orderImg}" alt="${order.item}" class="order-product-thumb"
                     onerror="this.src='/public/images/hero_crafts.jpg'">
                <div style="flex:1;min-width:0;">
                    <div class="order-item-desc" style="font-weight:600;color:#173f39;margin-bottom:2px;">${order.item}</div>
                    <div style="font-size:12px;color:#666;">Quantity: <strong>${qtyNum}</strong> unit${qtyNum !== 1 ? "s" : ""}</div>
                </div>
                <div class="order-amount">\u20B9${amountNum.toLocaleString("en-IN")}</div>
            </div>
            ${isPending ? `<button class="order-dispatch-btn" onclick="markOrderDispatched('${orderId}')">${dispatchBtnLabel}</button>` : ""}
        </div>`;
    }).join("");

    if (listEl)   listEl.innerHTML   = html;
    if (pageList) pageList.innerHTML = html;
}

/* ─── Dispatch action ─────────────────────────────────── */

async function markOrderDispatched(orderId) {
    if (typeof requireUserAuth === "function" && !requireUserAuth("Order Fulfillment & Dispatch")) return;

    const orders = cachedOrders || loadOrders();
    const order  = orders.find(o => (o.id === orderId || o.orderId === orderId));
    if (!order || order.status !== "pending") return;

    try {
        const response = await fetch(`/api/orders/${orderId}/dispatch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
    } catch (e) {
        console.warn("Dispatch API notice (updating locally):", e.message);
    }

    order.status      = "dispatched";
    order.dispatchedAt = new Date().toISOString();
    saveOrders(orders);
    updatePendingOrdersBadge(orders);

    if (typeof logAction       === "function") logAction("Dispatched item", order.item);
    if (typeof pushNotification === "function") pushNotification("Order dispatched", `${order.buyerName || order.buyer} · ${order.item}`);

    const row = document.getElementById(`order-row-${orderId}`);
    if (row) {
        row.style.transition = "opacity 0.25s ease, transform 0.25s ease";
        row.style.opacity    = "0";
        row.style.transform  = "scale(0.96) translateX(12px)";
        setTimeout(() => { renderOrdersList(); updatePendingOrdersBadge(); }, 270);
    } else {
        renderOrdersList();
        updatePendingOrdersBadge();
    }
}

/* ─── Bootstrap on page load ──────────────────────────── */

function _bootstrapOrders() {
    // Seed from localStorage immediately so the UI isn't blank
    cachedOrders = loadLocalOrders();
    if ((!cachedOrders || cachedOrders.length === 0) && isDemoUser()) {
        cachedOrders = [...getDefaultOrders()].map(normalizeOrderItem);
    }
    updatePendingOrdersBadge(cachedOrders);

    // Then refresh from API in the background
    fetchOrdersFromApi(true);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _bootstrapOrders);
} else {
    _bootstrapOrders();
}
