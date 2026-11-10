/* =========================================================
 *  CraftConnect — Market Linkage & Channels Module
 * ========================================================= */

var currentLat = null;
var currentLng = null;
var currentCity = null;

function contactMarket(marketName) {
    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'en';
    const msg = activeLang === "hi" ? `${marketName} के साथ संपर्क हो रहा है... सीधा क्राफ्टकनेक्ट लीड जनरेट हुआ!` :
        activeLang === "mr" ? `${marketName} शी संपर्क साधला जात आहे... थेट क्राफ्टकनेक्ट लीड तयार झाले!` :
            activeLang === "gu" ? `${marketName} સાથે સંપર્ક થઈ રહ્યો છે... સીધું ક્રાફ્ટકનેક્ટ લીડ મળ્યું!` :
                `Connecting with ${marketName}... Direct CraftConnect Market Linkage lead generated!`;
    alert(msg);
}

function _applyMarketsDynamicText(lang) {
    const dict = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[lang]) ? TRANSLATIONS[lang] : {};
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

    const refreshGpsBtn = document.querySelector("#markets .btn-deep-teal:first-of-type");
    const enterCityBtn  = document.querySelector("#markets .btn-deep-teal:nth-of-type(2)");
    if (refreshGpsBtn && refreshGpsBtn.textContent.trim().startsWith("↻")) refreshGpsBtn.textContent = safe("markets_refresh_gps", "↻ Refresh GPS");
    if (enterCityBtn  && enterCityBtn.textContent.trim().startsWith("✏")) enterCityBtn.textContent  = safe("markets_enter_city", "✏️ Enter City");

    const qs = document.querySelector("#spaCityChips")?.previousElementSibling;
    if (qs) qs.textContent = safe("markets_quick_switch", "Quick Switch Artisan Hub City:");
}

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
            () => {
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
                        <button class="btn btn-digital" onclick="openSellerModal('${p.id}', '${p.name}', '${p.type}', '${p.sellerUrl}', ${benefitsJson})" style="background-color: #0F5147; color: #FFFFFF; border: none; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 250ms ease; display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%;">
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

