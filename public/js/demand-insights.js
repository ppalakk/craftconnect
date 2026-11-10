/* =========================================================
 *  CraftConnect — Demand Insights & Trend Intelligence
 * ========================================================= */

var activeChartCategory = 'all';

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
            const aiTitleEl = document.getElementById("aiInsightTitle");
            const aiTextEl = document.getElementById("aiInsightText");
            if (aiTitleEl && data.aiInsightTitle) aiTitleEl.innerText = data.aiInsightTitle;
            if (aiTextEl && data.aiInsightText) aiTextEl.innerText = data.aiInsightText;
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

    let circlesSvg = points.map((p) => `
        <circle cx="${p.x}" cy="${p.y}" r="5" fill="#0F5147" stroke="white" stroke-width="2">
            <title>${p.label}: ${p.val} Index</title>
        </circle>
        <text x="${p.x}" y="${height - 10}" text-anchor="middle" font-size="11" fill="#5a7571" font-family="Outfit, sans-serif">${p.label}</text>
        <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" font-size="11" font-weight="bold" fill="#0F5147" font-family="Outfit, sans-serif">${p.val}</text>
    `).join("");

    container.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; display: block; overflow: visible;">
            <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="#E7EEEA" stroke-dasharray="4" />
            <line x1="${padding}" y1="${(height - padding * 2) / 2 + padding}" x2="${width - padding}" y2="${(height - padding * 2) / 2 + padding}" stroke="#E7EEEA" stroke-dasharray="4" />
            <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#cce2dc" />
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

async function loadArtisanInsights() {
    try {
        const res = await fetch(`/api/insights?period=monthly&category=all`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log("Artisan Insights:", data);
    } catch (err) {
        console.log("Artisan insights loaded locally.");
    }
}

function _applyInsightsDynamicText(lang) {
    const dict = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[lang]) ? TRANSLATIONS[lang] : {};
    const safe = (key, fb) => dict[key] || fb;

    document.querySelectorAll("#insights .section-title").forEach((sec, i) => {
        const h2 = sec.querySelector("h2");
        const span = sec.querySelector("span");
        if (i === 0 && h2) {
            h2.textContent = safe("insights_trending_title", "🔥 Trending Right Now");
            if (span) span.textContent = safe("insights_trending_sub", "Top performing product categories in demand");
        } else if (i === 1 && h2) {
            h2.textContent = safe("insights_emerging_title", "🎯 Emerging Business Opportunities");
            if (span) span.textContent = safe("insights_emerging_sub", "High-margin product ideas & seasonal demand picks");
        }
    });

    const aiLabel  = document.querySelector("#insights .advice-card .advice-header span");
    const viewCataBtn = document.querySelector("#insights .btn-outline");
    const findMarkBtn = document.querySelector("#insights .btn-deep-teal");

    if (aiLabel) aiLabel.textContent = safe("insights_ai_label", "🤖 Personalized AI Production Recommendations");
    if (viewCataBtn) viewCataBtn.textContent = safe("insights_view_catalog", "View My Catalog");
    if (findMarkBtn) findMarkBtn.textContent = safe("insights_find_markets", "Find Matching Markets");
}
