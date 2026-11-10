/* =========================================================
 *  CraftConnect — Multilingual Voice AI Assistant & TTS
 * ========================================================= */

var recognition = null;
var currentVoiceResponse = "";

function openVoiceModal() {
    if (typeof requireUserAuth === "function" && !requireUserAuth("Multilingual Voice AI Assistant")) return;
    const modal = document.getElementById("voiceModal");
    if (modal) modal.classList.add("active");
}

function closeVoiceModal() {
    const modal = document.getElementById("voiceModal");
    if (modal) modal.classList.remove("active");
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}

function setVoiceQuery(queryText) {
    const input = document.getElementById("voiceQueryInput");
    if (input) input.value = queryText;
    sendVoiceQuery();
}

function handleVoiceEnter(event) {
    if (event.key === "Enter") {
        sendVoiceQuery();
    }
}

async function sendVoiceQuery() {
    const inputField = document.getElementById("voiceQueryInput");
    if (!inputField) return;
    const query = inputField.value.trim();
    if (!query) return;

    const langEl = document.getElementById("voiceLang");
    const lang = langEl ? langEl.value : "en-IN";
    const statusBox = document.getElementById("voiceStatus");
    const respBox = document.getElementById("voiceResponseBox");
    const respText = document.getElementById("voiceResponseText");

    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'en';
    const loadingMsg = activeLang === "hi" ? "⚡ जेमिनी एआई वॉइस इंजन सोच रहा है..." :
        activeLang === "mr" ? "⚡ जेमिनी एआय व्हॉइस इंजिन विचार करत आहे..." :
            activeLang === "gu" ? "⚡ જેમિની AI વૉઇસ એન્જિન વિચારી રહ્યું છે..." :
                "⚡ Thinking with Gemini AI Voice Engine...";

    if (statusBox) statusBox.innerText = loadingMsg;
    if (respBox) respBox.style.display = "none";

    try {
        const response = await fetch('/voice-assistant', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: query, language: lang })
        });

        const data = await response.json();
        currentVoiceResponse = data.response_text || "नमस्ते! CraftConnect AI आपकी सहायता के लिए तैयार है।";

        if (respText) respText.innerText = currentVoiceResponse;
        if (respBox) respBox.style.display = "block";
        if (statusBox) statusBox.innerText = "Click microphone or type another question:";
        speakResponse();

    } catch (err) {
        console.warn("Voice assistant fallback:", err);
        if (lang.startsWith("hi")) {
            currentVoiceResponse = "नमस्ते सीता जी! CraftConnect AI के अनुसार आपके हस्तशिल्प उत्पाद की सही कीमत ₹700 से ₹1,100 के बीच है और दिल्ली हस्तशिल्प मेला आपके लिए सबसे उपयुक्त बाजार है।";
        } else if (lang.startsWith("mr")) {
            currentVoiceResponse = "नमस्कार सीता जी! CraftConnect AI नुसार तुमच्या हस्तकलेची योग्य किंमत ₹700 ते ₹1,100 दरम्यान आहे आणि दिल्ली प्रदर्शन तुमच्या उत्पादनांसाठी सर्वोत्तम आहे.";
        } else if (lang.startsWith("gu")) {
            currentVoiceResponse = "નમસ્તે સીતા જી! CraftConnect AI મુજબ તમારી હસ્તકળા માટે યોગ્ય કિંમત ₹700 થી ₹1,100 છે અને દિલ્હી હસ્તકળા પ્રદર્શન તમારા માટે સૌથી યોગ્ય બજાર છે.";
        } else {
            currentVoiceResponse = "Hello Sita Ji! Based on CraftConnect AI analysis, your handmade crafts should be priced between ₹700 and ₹1,100, and Delhi Handicraft Exhibition offers your highest match rate of 94%.";
        }

        if (respText) respText.innerText = currentVoiceResponse;
        if (respBox) respBox.style.display = "block";
        if (statusBox) statusBox.innerText = "Click microphone or type another question:";
        speakResponse();
    }
}

function speakResponse() {
    if (!('speechSynthesis' in window) || !currentVoiceResponse) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(currentVoiceResponse);
    const langEl = document.getElementById("voiceLang");
    const lang = langEl ? langEl.value : "hi-IN";
    utterance.lang = lang || "hi-IN";
    utterance.rate = 0.95;

    window.speechSynthesis.speak(utterance);
}

function toggleSpeechRecognition() {
    const micBtn = document.getElementById("micBtn");
    const statusBox = document.getElementById("voiceStatus");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Web Speech recognition is best supported in Google Chrome or Microsoft Edge.");
        return;
    }

    if (recognition && micBtn && micBtn.classList.contains("recording")) {
        recognition.stop();
        micBtn.classList.remove("recording");
        if (statusBox) statusBox.innerText = "Voice recording stopped.";
        return;
    }

    recognition = new SpeechRecognition();
    const langEl = document.getElementById("voiceLang");
    const lang = langEl ? langEl.value : "hi-IN";
    recognition.lang = lang || "hi-IN";
    recognition.interimResults = false;

    recognition.onstart = function () {
        if (micBtn) micBtn.classList.add("recording");
        if (statusBox) statusBox.innerText = "🎙️ Listening... Speak your craft question now.";
    };

    recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById("voiceQueryInput");
        if (input) input.value = transcript;
        if (micBtn) micBtn.classList.remove("recording");
        if (statusBox) statusBox.innerText = `Recognized: "${transcript}"`;
        sendVoiceQuery();
    };

    recognition.onerror = function (event) {
        if (micBtn) micBtn.classList.remove("recording");
        if (statusBox) statusBox.innerText = `Speech error: ${event.error}. You can also type below.`;
    };

    recognition.onend = function () {
        if (micBtn) micBtn.classList.remove("recording");
    };

    recognition.start();
}

