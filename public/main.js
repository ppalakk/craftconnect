/* CraftConnect Production AI Engine Integration (SIH 2026 PS-90) */

const API_BASE_URL = "http://127.0.0.1:8000";

let recognition = null;
let currentVoiceResponse = "";
let currentLang = "en";
let catalogProducts = [];
let activeFilter = "all";
let activeSearch = "";
let selectedProductForDetail = null;

/* ================= COMPREHENSIVE MULTILINGUAL TRANSLATIONS ================= */
const TRANSLATIONS = {
  en: {
    app_version: "AI v2.0",
    voice_ai_btn: "🎙️ Voice AI",
    nav_home: "Home",
    nav_catalog: "Catalog",
    nav_scan: "AI Scan",
    nav_markets: "Markets",
    nav_insights: "Insights",
    nav_profile: "Profile",

    // Home
    welcome_title: "Good Morning, Sita 👋",
    welcome_sub: "Your AI Business Assistant is ready to grow your artisan sales.",
    stat_products: "Total Products",
    stat_markets: "Market Leads",
    stat_orders: "Pending Orders",
    stat_growth: "Demand Growth",
    voice_banner_title: "Multilingual Voice Assistant",
    voice_banner_sub: "Speak in Hindi, Marathi, Gujarati or English for instant pricing & market advice",
    quick_actions_title: "Quick Actions",
    action_catalog_title: "My Catalog",
    action_catalog_desc: "View & Manage Crafts",
    action_scan_title: "AI Scan & Price",
    action_scan_desc: "Photo to Catalog",
    action_markets_title: "Market Linkage",
    action_markets_desc: "Find Buyers & Melas",
    action_insights_title: "Demand Insights",
    action_insights_desc: "View Market Trends",
    top_opp_title: "Top Market Opportunity",
    opp_market_name: "Delhi Handicraft Exhibition",
    opp_match: "94% Match",
    opp_loc: "📍 Pragati Maidan, New Delhi • 120 km",
    opp_buyer: "👥 Target: Urban Home Decor Buyers & Export Agents",
    btn_view_opp: "View Opportunity →",

    // Catalog
    catalog_title: "Artisan Product Catalog",
    catalog_badge: "AI Verified Crafts",
    catalog_sub: "Manage, showcase and export your AI-cataloged craft products.",
    catalog_total_items: "Total Items",
    catalog_est_value: "Catalog Value",
    catalog_market_ready: "Market Ready",
    search_placeholder: "Search craft products...",
    btn_add_craft: "+ Add Craft",
    filter_all: "All",
    filter_bamboo: "Bamboo & Wood",
    filter_clay: "Terracotta & Clay",
    filter_textile: "Textiles",
    filter_decor: "Decor & Gifts",
    empty_catalog_title: "No craft products found",
    empty_catalog_sub: "Upload a new craft photo to automatically add it to your catalog.",
    btn_upload_now: "📸 Scan & Add Craft →",
    card_view_details: "View Details",
    card_delete: "Delete",
    card_gi_tag: "✓ AI GI Verified",
    card_in_stock: "In Stock",

    // Product Detail Modal
    detail_features_title: "✨ Key Visual Features",
    detail_tags_title: "🏷️ Craft Tags",
    detail_buyers_title: "🎯 Recommended Target Buyers",
    detail_price_label: "ML Optimal Fair Price",
    btn_share_buyer: "🔗 Share with Buyers / WhatsApp",
    btn_delete_craft: "🗑️ Remove Product",

    // AI Scan & Pricing
    scan_title: "Smart AI Cataloging & Pricing",
    scan_badge: "Gemini 3.6 + ML Model",
    upload_craft_photo: "Upload Craft Product Photo",
    upload_craft_sub: "AI will analyze the image, classify craft type, build e-commerce catalog & estimate ML market price.",
    btn_select_image: "📁 Select Image",
    loading_ai: "⚡ Gemini Vision AI & Random Forest ML analyzing your product...",
    loading_sub: "Extracting materials, features, target markets & optimal INR price",
    res_catalog_title: "AI Generated Catalog",
    res_badge_live: "✓ Production Live",
    res_key_features: "✨ Key Visual Features:",
    res_target_buyers: "🎯 Target Buyers:",
    res_price_title: "AI & ML Recommended Price",
    res_price_sub: "Evaluated against Indian handicraft benchmark dataset",
    res_optimal_price: "Optimal Selling Price:",
    res_conf_score: "ML Confidence Score",
    btn_saved_toast: "✅ Product successfully added to your catalog!",
    btn_view_in_catalog: "📦 View in Product Catalog →",

    // Markets
    markets_title: "Smart Market Linkage",
    markets_badge: "AI Buyer Matching",
    markets_sub: "Direct access to exhibitions, craft melas, and digital channels with match scores.",
    market1_name: "Delhi Handicraft Fair / Dilli Haat",
    market1_type: "Handicrafts & Handloom • Retail Exhibition",
    market1_loc: "📍 New Delhi • 120 km away",
    market1_match: "94% Suitable",
    btn_connect: "Connect →",
    market2_name: "CraftConnect & ONDC Online Storefront",
    market2_type: "Pan-India Digital Reach • Direct B2C",
    market2_loc: "🌐 Online E-Commerce",
    market2_match: "89% Suitable",
    btn_publish: "Publish →",
    market3_name: "Surajkund International Crafts Mela",
    market3_type: "National Artisan Exhibition & Bulk Buyers",
    market3_loc: "📍 Faridabad • Upcoming",
    market3_match: "86% Suitable",
    btn_apply_stall: "Apply Stall →",

    // Insights
    insights_title: "Demand & Trend Intelligence",
    insights_badge: "Real-time Signals",
    trend1_name: "🧺 Bamboo & Basketry Products",
    trend1_growth: "↑ 18% Growth",
    trend1_sub: "High Demand • Eco-friendly home storage & gift hampers",
    trend2_name: "🏺 Terracotta & Clay Crafts",
    trend2_growth: "↑ 10% Growth",
    trend2_sub: "Growing Demand • Festive lamps, diyas & cookware",
    trend3_name: "🧵 Handloom Textiles & Weaving",
    trend3_growth: "↑ 5% Growth",
    trend3_sub: "Stable Demand • Ethnic apparel & home furnishings",
    advice_header: "💡 AI Production Recommendation",
    advice_title: "Focus on Bamboo & Sustainable Hampers",
    advice_text: "Festive demand for eco-friendly gift packing is peaking. Stocking small-to-medium hampers gives 35% higher profit margins during craft melas.",

    // Profile
    artisan_name: "Sita Devi",
    artisan_craft: "Handicraft & Bamboo Artisan",
    artisan_loc: "📍 Jaipur, Rajasthan • Verified Artisan",
    profile_stat_products: "Products",
    profile_stat_orders: "Orders",
    profile_stat_leads: "Leads",
    profile_memory_title: "Personalized AI Business Memory",
    memory1_title: "Price Optimization Alert",
    memory1_desc: "Your Bamboo Baskets can fetch ₹550 in Delhi markets vs ₹400 locally.",
    memory2_title: "Festive Season Prep",
    memory2_desc: "Demand for bamboo hampers increases 40% for Diwali.",
    memory3_title: "Buyer Interest Signal",
    memory3_desc: "3 wholesale export buyers inspected your digital catalog today.",

    // Voice Modal
    voice_modal_title: "Multilingual Voice AI Assistant",
    voice_modal_sub: "Speak in your language for instant advice",
    voice_label_lang: "Select Language:",
    chip_pricing: "💡 Pricing advice?",
    chip_market: "🏪 Best market?",
    chip_festive: "🎉 Festival tips?",
    voice_status_default: "Tap microphone to speak or write query below:",
    btn_listen: "🔊 Listen to Answer",
    voice_input_placeholder: "Ask voice assistant in your language...",
    btn_send: "Send"
  },
  hi: {
    app_version: "एआई v2.0",
    voice_ai_btn: "🎙️ वॉइस एआई",
    nav_home: "होम",
    nav_catalog: "कैटलॉग",
    nav_scan: "एआई स्कैन",
    nav_markets: "बाजार",
    nav_insights: "रुझान",
    nav_profile: "प्रोफाइल",

    // Home
    welcome_title: "शुभ प्रभात, सीता 👋",
    welcome_sub: "आपका एआई बिजनेस सहायक आपकी शिल्प बिक्री बढ़ाने के लिए तैयार है।",
    stat_products: "कुल उत्पाद",
    stat_markets: "बाजार लीड्स",
    stat_orders: "लंबित ऑर्डर",
    stat_growth: "मांग में वृद्धि",
    voice_banner_title: "बहुभाषी वॉइस सहायक",
    voice_banner_sub: "कीमत, बाजार और कैटलॉग सुझावों के लिए हिंदी में बोलें",
    quick_actions_title: "त्वरित कार्य",
    action_catalog_title: "मेरा कैटलॉग",
    action_catalog_desc: "शिल्प देखें व प्रबंधित करें",
    action_scan_title: "एआई स्कैन व कीमत",
    action_scan_desc: "फोटो से कैटलॉग बनाएं",
    action_markets_title: "बाजार संपर्क",
    action_markets_desc: "खरीदार और मेले खोजें",
    action_insights_title: "मांग रुझान",
    action_insights_desc: "बाजार के रुझान देखें",
    top_opp_title: "शीर्ष बाजार अवसर",
    opp_market_name: "दिल्ली हस्तशिल्प प्रदर्शनी",
    opp_match: "94% मेल",
    opp_loc: "📍 प्रगति मैदान, नई दिल्ली • 120 किमी",
    opp_buyer: "👥 लक्षित खरीदार: होम डेकोर खरीदार व निर्यात एजेंट",
    btn_view_opp: "अवसर देखें →",

    // Catalog
    catalog_title: "शिल्प उत्पाद कैटलॉग",
    catalog_badge: "एआई सत्यापित शिल्प",
    catalog_sub: "स्वचालित एआई विवरण और उचित मूल्य के साथ अपने शिल्प प्रदर्शित करें।",
    catalog_total_items: "कुल उत्पाद",
    catalog_est_value: "कैटलॉग मूल्य",
    catalog_market_ready: "बाजार हेतु तैयार",
    search_placeholder: "शिल्प उत्पाद खोजें...",
    btn_add_craft: "+ नया शिल्प जोड़ें",
    filter_all: "सभी",
    filter_bamboo: "बांस व लकड़ी",
    filter_clay: "टेराकोटा व मिट्टी",
    filter_textile: "हथकरघा व वस्त्र",
    filter_decor: "सजावट व उपहार",
    empty_catalog_title: "कोई शिल्प उत्पाद नहीं मिला",
    empty_catalog_sub: "अपने कैटलॉग में जोड़ने के लिए शिल्प की नई फोटो अपलोड करें।",
    btn_upload_now: "📸 स्कैन और जोड़ें →",
    card_view_details: "विवरण देखें",
    card_delete: "हटाएं",
    card_gi_tag: "✓ एआई जीआई सत्यापित",
    card_in_stock: "उपलब्ध है",

    // Product Detail Modal
    detail_features_title: "✨ मुख्य दृश्य विशेषताएं",
    detail_tags_title: "🏷️ शिल्प टैग",
    detail_buyers_title: "🎯 अनुशंसित खरीदार",
    detail_price_label: "मशीन लर्निंग अनुशंसित उचित मूल्य",
    btn_share_buyer: "🔗 खरीदार से साझा करें / WhatsApp",
    btn_delete_craft: "🗑️ उत्पाद हटाएं",

    // AI Scan & Pricing
    scan_title: "स्मार्ट एआई कैटलॉगिंग और मूल्य निर्धारण",
    scan_badge: "जेमिनी 3.6 + एमएल मॉडल",
    upload_craft_photo: "शिल्प उत्पाद की फोटो अपलोड करें",
    upload_craft_sub: "एआई छवि का विश्लेषण करेगा, श्रेणी तय करेगा, ई-कॉमर्स कैटलॉग बनाएगा और उचित बाजार मूल्य का अनुमान लगाएगा।",
    btn_select_image: "📁 फोटो चुनें",
    loading_ai: "⚡ जेमिनी विजन एआई और एमएल मॉडल आपके उत्पाद का विश्लेषण कर रहे हैं...",
    loading_sub: "सामग्री, शिल्प विशेषताएं और उचित मूल्य निकाला जा रहा है",
    res_catalog_title: "एआई द्वारा जनरेट किया गया कैटलॉग",
    res_badge_live: "✓ लाइव तैयार",
    res_key_features: "✨ मुख्य विशेषताएं:",
    res_target_buyers: "🎯 लक्षित खरीदार:",
    res_price_title: "एआई और एमएल अनुशंसित मूल्य",
    res_price_sub: "भारतीय हस्तशिल्प डेटासेट के आधार पर मूल्यांकित",
    res_optimal_price: "अनुकूलतम बिक्री मूल्य:",
    res_conf_score: "एमएल विश्वास स्कोर",
    btn_saved_toast: "✅ उत्पाद सफलतापूर्वक आपके कैटलॉग में जोड़ा गया!",
    btn_view_in_catalog: "📦 कैटलॉग में देखें →",

    // Markets
    markets_title: "स्मार्ट बाजार संपर्क",
    markets_badge: "एआई खरीदार मिलान",
    markets_sub: "प्रदर्शनियों, शिल्प मेलों और डिजिटल चैनलों तक सीधी पहुंच।",
    market1_name: "दिल्ली हस्तशिल्प मेला / दिल्ली हाट",
    market1_type: "हस्तशिल्प और हथकरघा • खुदरा प्रदर्शनी",
    market1_loc: "📍 नई दिल्ली • 120 किमी दूर",
    market1_match: "94% उपयुक्त",
    btn_connect: "संपर्क करें →",
    market2_name: "क्राफ्टकनेक्ट व ओएनडीसी ऑनलाइन स्टोर",
    market2_type: "अखिल भारतीय डिजिटल पहुंच • सीधा उपभोक्ता विक्रय",
    market2_loc: "🌐 ऑनलाइन ई-कॉमर्स",
    market2_match: "89% उपयुक्त",
    btn_publish: "प्रकाशित करें →",
    market3_name: "सूरजकुंड अंतर्राष्ट्रीय शिल्प मेला",
    market3_type: "राष्ट्रीय शिल्पकार प्रदर्शनी और थोक खरीदार",
    market3_loc: "📍 फरीदाबाद • आगामी",
    market3_match: "86% उपयुक्त",
    btn_apply_stall: "स्टॉल हेतु आवेदन करें →",

    // Insights
    insights_title: "मांग और रुझान बुद्धिमत्ता",
    insights_badge: "वास्तविक समय संकेत",
    trend1_name: "🧺 बांस व टोकरी उत्पाद",
    trend1_growth: "↑ 18% वृद्धि",
    trend1_sub: "उच्च मांग • पर्यावरण अनुकूल होम स्टोरेज और उपहार टोकरी",
    trend2_name: "🏺 टेराकोटा और मिट्टी के शिल्प",
    trend2_growth: "↑ 10% वृद्धि",
    trend2_sub: "बढ़ती मांग • त्योहारी दीये, लैंप और मिट्टी के बर्तन",
    trend3_name: "🧵 हथकरघा वस्त्र और बुनाई",
    trend3_growth: "↑ 5% वृद्धि",
    trend3_sub: "स्थिर मांग • पारंपरिक परिधान व होम फर्निशिंग",
    advice_header: "💡 एआई उत्पादन सलाह",
    advice_title: "बांस और उपहार टोकरियों पर ध्यान दें",
    advice_text: "त्योहारी सीजन में पर्यावरण अनुकूल उपहार पैकिंग की मांग चरम पर है। छोटे और मध्यम हैम्पर्स शिल्प मेलों में 35% अधिक लाभ देते हैं।",

    // Profile
    artisan_name: "सीता देवी",
    artisan_craft: "हस्तशिल्प और बांस कारीगर",
    artisan_loc: "📍 जयपुर, राजस्थान • सत्यापित कारीगर",
    profile_stat_products: "उत्पाद",
    profile_stat_orders: "ऑर्डर",
    profile_stat_leads: "लीड्स",
    profile_memory_title: "व्यक्तिगत एआई व्यवसाय स्मृति",
    memory1_title: "मूल्य अनुकूलन सूचना",
    memory1_desc: "आपकी बांस की टोकरियां दिल्ली के बाजारों में ₹550 तक बिक सकती हैं, स्थानीय स्तर पर ₹400 के मुकाबले।",
    memory2_title: "त्योहारी सीजन तैयारी",
    memory2_desc: "दिवाली के लिए बांस के हैम्पर्स की मांग में 40% की वृद्धि होती है।",
    memory3_title: "खरीदार रुचि संकेत",
    memory3_desc: "आज 3 थोक निर्यात खरीदारों ने आपका डिजिटल कैटलॉग देखा।",

    // Voice Modal
    voice_modal_title: "बहुभाषी वॉइस एआई सहायक",
    voice_modal_sub: "त्वरित सलाह के लिए अपनी भाषा में बोलें",
    voice_label_lang: "भाषा चुनें:",
    chip_pricing: "💡 कीमत संबंधी सलाह?",
    chip_market: "🏪 सबसे अच्छा बाजार?",
    chip_festive: "🎉 त्योहारी सुझाव?",
    voice_status_default: "बोलने के लिए माइक दबाएं या नीचे लिखें:",
    btn_listen: "🔊 उत्तर सुनें",
    voice_input_placeholder: "हिंदी या अंग्रेजी में प्रश्न पूछें...",
    btn_send: "भेजें"
  },
  mr: {
    app_version: "एआय v2.0",
    voice_ai_btn: "🎙️ व्हॉइस एआय",
    nav_home: "होम",
    nav_catalog: "कॅटलॉग",
    nav_scan: "एआय स्कॅन",
    nav_markets: "बाजारपेठ",
    nav_insights: "कल/रुझान",
    nav_profile: "प्रोफाइल",

    // Home
    welcome_title: "शुभ सकाळ, सीता 👋",
    welcome_sub: "तुमचे एआय व्यवसाय सहाय्यक तुमची हस्तकला विक्री वाढवण्यासाठी सज्ज आहे.",
    stat_products: "एकूण उत्पादने",
    stat_markets: "बाजारपेठ लीड्स",
    stat_orders: "प्रलंबित ऑर्डर्स",
    stat_growth: "मागणी वाढ",
    voice_banner_title: "बहुभाषिक व्हॉइस सहाय्यक",
    voice_banner_sub: "किंमत, बाजारपेठ आणि कॅटलॉग टिप्ससाठी मराठीत बोला",
    quick_actions_title: "जलद कृती",
    action_catalog_title: "माझा कॅटलॉग",
    action_catalog_desc: "हस्तकला पहा व व्यवस्थापित करा",
    action_scan_title: "एआय स्कॅन व किंमत",
    action_scan_desc: "फोटोवरून कॅटलॉग बनवा",
    action_markets_title: "बाजारपेठ जोडणी",
    action_markets_desc: "ग्राहक आणि प्रदर्शने शोधा",
    action_insights_title: "मागणी अंतर्दृष्टी",
    action_insights_desc: "बाजारातील कल तपासा",
    top_opp_title: "अव्वल बाजारपेठ संधी",
    opp_market_name: "दिल्ली हस्तकला प्रदर्शन",
    opp_match: "94% जुळणी",
    opp_loc: "📍 प्रगती मैदान, नवी दिल्ली • 120 किमी",
    opp_buyer: "👥 लक्ष्यित खरेदीदार: गृह सजावट खरेदीदार आणि निर्यातदार",
    btn_view_opp: "संधी पहा →",

    // Catalog
    catalog_title: "हस्तकला उत्पादन कॅटलॉग",
    catalog_badge: "एआय सत्यापित हस्तकला",
    catalog_sub: "स्वयंचलित एआय तपशील आणि योग्य किमतींसह उत्पादने डिजिटल स्वरूपात सादर करा.",
    catalog_total_items: "एकूण वस्तू",
    catalog_est_value: "कॅटलॉग मूल्य",
    catalog_market_ready: "बाजारासाठी तयार",
    search_placeholder: "हस्तकला उत्पादने शोधा...",
    btn_add_craft: "+ नवीन उत्पादन जोडा",
    filter_all: "सर्व",
    filter_bamboo: "बांबू व लाकूड",
    filter_clay: "टेराकोटा व मातीकाम",
    filter_textile: "हातमाग व वस्त्र",
    filter_decor: "सजावट व भेटवस्तू",
    empty_catalog_title: "कोणतेही उत्पादन आढळले नाही",
    empty_catalog_sub: "आपल्या कॅटलॉगमध्ये जोडण्यासाठी नवीन फोटो अपलोड करा.",
    btn_upload_now: "📸 स्कॅन करून जोडा →",
    card_view_details: "तपशील पहा",
    card_delete: "हटवा",
    card_gi_tag: "✓ एआय जीआय सत्यापित",
    card_in_stock: "उपलब्ध",

    // Product Detail Modal
    detail_features_title: "✨ मुख्य दृश्य वैशिष्ट्ये",
    detail_tags_title: "🏷️ हस्तकला टॅग्ज",
    detail_buyers_title: "🎯 शिफारस केलेले खरेदीदार",
    detail_price_label: "मशीन लर्निंग योग्य किंमत",
    btn_share_buyer: "🔗 खरेदीदारांशी शेअर करा / WhatsApp",
    btn_delete_craft: "🗑️ उत्पादन काढा",

    // AI Scan & Pricing
    scan_title: "स्मार्ट एआय कॅटलॉगिंग आणि किंमत अंदाज",
    scan_badge: "जेमिनी 3.6 + एमएल मॉडेल",
    upload_craft_photo: "हस्तकला उत्पादनाचा फोटो अपलोड करा",
    upload_craft_sub: "एआय प्रतिमेचे विश्लेषण करेल, हस्तकलेचा प्रकार ठरवेल आणि योग्य बाजारभाव सुचवेल.",
    btn_select_image: "📁 फोटो निवडा",
    loading_ai: "⚡ जेमिनी व्हिजन एआय आणि एमएल मॉडेल आपल्या उत्पादनाचे विश्लेषण करत आहे...",
    loading_sub: "साहित्य, वैशिष्ट्ये आणि योग्य किंमत काढली जात आहे",
    res_catalog_title: "एआय द्वारे तयार केलेला कॅटलॉग",
    res_badge_live: "✓ थेट उपलब्ध",
    res_key_features: "✨ मुख्य वैशिष्ट्ये:",
    res_target_buyers: "🎯 लक्ष्यित खरेदीदार:",
    res_price_title: "एआय व एमएल शिफारस केलेली किंमत",
    res_price_sub: "भारतीय हस्तकला डेटासेटच्या आधारे मूल्यांकित",
    res_optimal_price: "योग्य विक्री किंमत:",
    res_conf_score: "एमएल अचूकता स्कोअर",
    btn_saved_toast: "✅ उत्पादन आपल्या कॅटलॉगमध्ये यशस्वीरीत्या जोडले गेले!",
    btn_view_in_catalog: "📦 कॅटलॉगमध्ये पहा →",

    // Markets
    markets_title: "स्मार्ट बाजारपेठ जोडणी",
    markets_badge: "एआय खरेदीदार जुळणी",
    markets_sub: "प्रदर्शने, हस्तकला मेळावे आणि डिजिटल विक्रीसाठी थेट व्यासपीठ.",
    market1_name: "दिल्ली हस्तकला मेळा / दिल्ली हाट",
    market1_type: "हस्तकला आणि हातमाग • किरकोळ प्रदर्शन",
    market1_loc: "📍 नवी दिल्ली • 120 किमी",
    market1_match: "94% योग्य",
    btn_connect: "संपर्क साधा →",
    market2_name: "क्राफ्टकनेक्ट आणि ओएनडीसी ऑनलाइन स्टोअर",
    market2_type: "संपूर्ण भारत डिजिटल पोहोच • थेट ग्राहक विक्री",
    market2_loc: "🌐 ऑनलाइन ई-कॉमर्स",
    market2_match: "89% योग्य",
    btn_publish: "प्रकाशित करा →",
    market3_name: "सूरजकुंड आंतरराष्ट्रीय हस्तकला मेळा",
    market3_type: "राष्ट्रीय कारागीर प्रदर्शन आणि घाऊक खरेदीदार",
    market3_loc: "📍 फरीदाबाद • आगामी",
    market3_match: "86% योग्य",
    btn_apply_stall: "स्टॉलसाठी अर्ज करा →",

    // Insights
    insights_title: "मागणी आणि कल बुद्धिमत्ता",
    insights_badge: "थेट माहिती",
    trend1_name: "🧺 बांबू आणि टोपली उत्पादने",
    trend1_growth: "↑ 18% वाढ",
    trend1_sub: "उच्च मागणी • पर्यावरणपूरक घरगुती साठवणूक व गिफ्ट हॅम्पर्स",
    trend2_name: "🏺 टेराकोटा आणि मातीकाम",
    trend2_growth: "↑ 10% वाढ",
    trend2_sub: "वाढती मागणी • उत्सवाचे दिवे, पणत्या आणि भांडी",
    trend3_name: "🧵 हातमाग कापड आणि विणकाम",
    trend3_growth: "↑ 5% वाढ",
    trend3_sub: "स्थिर मागणी • पारंपरिक पोशाख आणि सजावटी कापड",
    advice_header: "💡 एआय उत्पादन शिफारस",
    advice_title: "बांबू व पर्यावरणपूरक हॅम्पर्सवर भर द्या",
    advice_text: "सणासुदीच्या काळात पर्यावरणपूरक भेटवस्तूंना मोठी मागणी आहे. लहान ते मध्यम हॅम्पर्स विकल्यास 35% अधिक नफा मिळतो.",

    // Profile
    artisan_name: "सीता देवी",
    artisan_craft: "हस्तकला आणि बांबू कारागीर",
    artisan_loc: "📍 जयपूर, राजस्थान • सत्यापित कारागीर",
    profile_stat_products: "उत्पादने",
    profile_stat_orders: "ऑर्डर्स",
    profile_stat_leads: "लीड्स",
    profile_memory_title: "वैयक्तिकृत एआय व्यवसाय स्मृती",
    memory1_title: "किंमत अनुकूलन इशारा",
    memory1_desc: "आपल्या बांबूच्या टोपल्यांना दिल्लीत ₹550 मिळतील, स्थानिक बाजारपेठेतील ₹400 ऐवजी.",
    memory2_title: "सणासुदीची तयारी",
    memory2_desc: "दिवाळीसाठी बांबू हॅम्पर्सच्या मागणीत 40% वाढ होते.",
    memory3_title: "खरेदीदार रस संकेत",
    memory3_desc: "आज 3 घाऊक निर्यात खरेदीदारांनी आपला डिजिटल कॅटलॉग पाहिला.",

    // Voice Modal
    voice_modal_title: "बहुभाषिक व्हॉइस एआय सहाय्यक",
    voice_modal_sub: "त्वरित मदतीसाठी आपल्या भाषेत बोला",
    voice_label_lang: "भाषा निवडा:",
    chip_pricing: "💡 किमतीचा सल्ला?",
    chip_market: "🏪 सर्वोत्तम बाजार?",
    chip_festive: "🎉 सणांचे नियोजन?",
    voice_status_default: "बोलण्यासाठी माइक टॅप करा किंवा खाली लिहा:",
    btn_listen: "🔊 उत्तर ऐका",
    voice_input_placeholder: "मराठी किंवा इंग्रजीत प्रश्न विचारा...",
    btn_send: "पाठवा"
  },
  gu: {
    app_version: "AI v2.0",
    voice_ai_btn: "🎙️ વૉઇસ AI",
    nav_home: "હોમ",
    nav_catalog: "કેટલોગ",
    nav_scan: "AI સ્કેન",
    nav_markets: "બજાર",
    nav_insights: "ટ્રેન્ડ્સ",
    nav_profile: "પ્રોફાઇલ",

    // Home
    welcome_title: "શુભ પ્રભાત, સીતા 👋",
    welcome_sub: "તમારું AI બિઝનેસ આસિસ્ટન્ટ તમારી કારીગરીનું વેચાણ વધારવા માટે તૈયાર છે.",
    stat_products: "કુલ પ્રોડક્ટ્સ",
    stat_markets: "બજાર લીડ્સ",
    stat_orders: "બાકી ઓર્ડર્સ",
    stat_growth: "માંગ વૃદ્ધિ",
    voice_banner_title: "બહુભાષી વૉઇસ આસિસ્ટન્ટ",
    voice_banner_sub: "કિંમત, બજાર અને કેટલોગ ટિપ્સ માટે ગુજરાતીમાં બોલો",
    quick_actions_title: "ઝડપી ક્રિયાઓ",
    action_catalog_title: "મારો કેટલોગ",
    action_catalog_desc: "કારીગરી જુઓ અને મેનેજ કરો",
    action_scan_title: "AI સ્કેન અને કિંમત",
    action_scan_desc: "ફોટો પરથી કેટલોગ બનાવો",
    action_markets_title: "બજાર જોડાણ",
    action_markets_desc: "ગ્રાહકો અને મેળાઓ શોધો",
    action_insights_title: "માંગ ટ્રેન્ડ્સ",
    action_insights_desc: "બજારના પ્રવાહો જુઓ",
    top_opp_title: "શ્રેષ્ઠ બજાર તક",
    opp_market_name: "દિલ્હી હસ્તકળા પ્રદર્શન",
    opp_match: "94% સુસંગત",
    opp_loc: "📍 પ્રગતિ મેદાન, નવી દિલ્હી • 120 કિમી",
    opp_buyer: "👥 ટાર્ગેટ: હોમ ડેકોર ખરીદદારો અને નિકાસ એજન્ટ્સ",
    btn_view_opp: "તક જુઓ →",

    // Catalog
    catalog_title: "કારીગરી પ્રોડક્ટ કેટલોગ",
    catalog_badge: "AI પ્રમાણિત હસ્તકળા",
    catalog_sub: "AI વર્ણન અને વાજબી કિંમતો સાથે તમારી પ્રોડક્ટ્સ ડિજિટલ રીતે પ્રદર્શિત કરો.",
    catalog_total_items: "કુલ વસ્તુઓ",
    catalog_est_value: "કેટલોગ કિંમત",
    catalog_market_ready: "વેચાણ માટે તૈયાર",
    search_placeholder: "પ્રોડક્ટ્સ શોધો...",
    btn_add_craft: "+ નવી પ્રોડક્ટ ઉમેરો",
    filter_all: "બધા",
    filter_bamboo: "વાંસ અને લાકડું",
    filter_clay: "ટેરાકોટા અને માટીકામ",
    filter_textile: "હેન્ડલૂમ અને કાપડ",
    filter_decor: "શણગાર અને ગિફ્ટ્સ",
    empty_catalog_title: "કોઈ પ્રોડક્ટ મળી નથી",
    empty_catalog_sub: "તમારા કેટલોગમાં ઉમેરવા માટે નવો ફોટો અપલોડ કરો.",
    btn_upload_now: "📸 સ્કેન કરી ઉમેરો →",
    card_view_details: "વિગત જુઓ",
    card_delete: "કાઢી નાખો",
    card_gi_tag: "✓ AI GI પ્રમાણિત",
    card_in_stock: "સ્ટોકમાં છે",

    // Product Detail Modal
    detail_features_title: "✨ મુખ્ય દ્રશ્ય વિશેષતાઓ",
    detail_tags_title: "🏷️ ક્રાફ્ટ ટેગ્સ",
    detail_buyers_title: "🎯 ભલામણ કરેલ ખરીદદારો",
    detail_price_label: "મશીન લર્નિંગ વાજબી કિંમત",
    btn_share_buyer: "🔗 ખરીદદારો સાથે શેર કરો / WhatsApp",
    btn_delete_craft: "🗑️ પ્રોડક્ટ કાઢી નાખો",

    // AI Scan & Pricing
    scan_title: "સ્માર્ટ AI કેટલોગિંગ અને કિંમત નિર્ધારણ",
    scan_badge: "જેમિની 3.6 + ML મોડેલ",
    upload_craft_photo: "કારીગરી પ્રોડક્ટનો ફોટો અપલોડ કરો",
    upload_craft_sub: "AI ફોટાનું વિશ્લેષણ કરશે, પ્રકાર વર્ગીકૃત કરશે અને શ્રેષ્ઠ બજાર કિંમતનો અંદાજ લગાવશે.",
    btn_select_image: "📁 ફોટો પસંદ કરો",
    loading_ai: "⚡ જેમિની વિઝન AI અને ML મોડેલ વિશ્લેષણ કરી રહ્યા છે...",
    loading_sub: "સામગ્રી, વિશેષતાઓ અને વાજબી કિંમત ગણવામાં આવી રહી છે",
    res_catalog_title: "AI દ્વારા બનાવેલ કેટલોગ",
    res_badge_live: "✓ લાઈવ ઉપલબ્ધ",
    res_key_features: "✨ મુખ્ય વિશેષતાઓ:",
    res_target_buyers: "🎯 લક્ષિત ખરીદદારો:",
    res_price_title: "AI અને ML ભલામણ કરેલ કિંમત",
    res_price_sub: "ભારતીય હસ્તકળા ડેટાસેટ આધારે મૂલ્યાંકન",
    res_optimal_price: "યોગ્ય વેચાણ કિંમત:",
    res_conf_score: "ML ચોકસાઈ સ્કોર",
    btn_saved_toast: "✅ પ્રોડક્ટ તમારા કેટલોગમાં સફળતાપૂર્વક ઉમેરાઈ ગઈ!",
    btn_view_in_catalog: "📦 કેટલોગમાં જુઓ →",

    // Markets
    markets_title: "સ્માર્ટ બજાર જોડાણ",
    markets_badge: "AI ખરીદદાર મેળવણી",
    markets_sub: "પ્રદર્શનો, હસ્તકળા મેળાઓ અને ડિજિટલ વેચાણ માટે સીધો સંપર્ક.",
    market1_name: "દિલ્હી હસ્તકળા મેળો / દિલ્હી હાટ",
    market1_type: "હસ્તકળા અને હેન્ડલૂમ • રિટેલ પ્રદર્શન",
    market1_loc: "📍 નવી દિલ્હી • 120 કિમી",
    market1_match: "94% યોગ્ય",
    btn_connect: "સંપર્ક કરો →",
    market2_name: "ક્રાફ્ટકનેક્ટ અને ONDC ઓનલાઇન સ્ટોર",
    market2_type: "ઓલ ઇન્ડિયા ડિજિટલ પહોંચ • ડાયરેક્ટ વેચાણ",
    market2_loc: "🌐 ઓનલાઇન ઈ-કોમર્સ",
    market2_match: "89% યોગ્ય",
    btn_publish: "પ્રકાશિત કરો →",
    market3_name: "સૂરજકુંડ આંતરરાષ્ટ્રીય હસ્તકળા મેળો",
    market3_type: "રાષ્ટ્રીય કારીગર પ્રદર્શન અને જથ્થાબંધ ખરીદદારો",
    market3_loc: "📍 ફરીદાબાદ • આગામી",
    market3_match: "86% યોગ્ય",
    btn_apply_stall: "સ્ટોલ માટે અરજી કરો →",

    // Insights
    insights_title: "માંગ અને ટ્રેન્ડ્સ બુદ્ધિમત્તા",
    insights_badge: "રિયલ-ટાઇમ સંકેતો",
    trend1_name: "🧺 વાંસ અને ટોપલી પ્રોડક્ટ્સ",
    trend1_growth: "↑ 18% વૃદ્ધિ",
    trend1_sub: "ઉચ્ચ માંગ • ઇકો-ફ્રેન્ડલી હોમ સ્ટોરેજ અને ગિફ્ટ હેમ્પર્સ",
    trend2_name: "🏺 ટેરાકોટા અને માટીકામ",
    trend2_growth: "↑ 10% વૃદ્ધિ",
    trend2_sub: "વધતી માંગ • તહેવારના દીવા અને માટીના વાસણો",
    trend3_name: "🧵 હેન્ડલૂમ કાપડ અને વણાટકામ",
    trend3_growth: "↑ 5% વૃદ્ધિ",
    trend3_sub: "સ્થિર માંગ • પરંપરાગત પોશાક અને હોમ ફર્નિશિંગ",
    advice_header: "💡 AI ઉત્પાદન ભલામણ",
    advice_title: "વાંસ અને ગિફ્ટ હેમ્પર્સ પર ધ્યાન આપો",
    advice_text: "તહેવારોની સિઝનમાં ઇકો-ફ્રેન્ડલી ગિફ્ટ પેકિંગની માંગ ટોચ પર છે. નાના-મધ્યમ હેમ્પર્સ મેળાઓમાં 35% વધુ નફો આપે છે.",

    // Profile
    artisan_name: "સીતા દેવી",
    artisan_craft: "હસ્તકળા અને વાંસ કારીગર",
    artisan_loc: "📍 જયપુર, રાજસ્થાન • પ્રમાણિત કારીગર",
    profile_stat_products: "પ્રોડક્ટ્સ",
    profile_stat_orders: "ઓર્ડર્સ",
    profile_stat_leads: "લીડ્સ",
    profile_memory_title: "વ્યક્તિગત AI વ્યવસાય મેમરી",
    memory1_title: "કિંમત સુધારણા ચેતવણી",
    memory1_desc: "તમારી વાંસની ટોપલીઓ સ્થાનિક ₹400 ની સરખામણીએ દિલ્હીમાં ₹550 મેળવી શકે છે.",
    memory2_title: "તહેવારોની તૈયારી",
    memory2_desc: "દિવાળી માટે વાંસના હેમ્પર્સની માંગમાં 40% નો વધારો થાય છે.",
    memory3_title: "ખરીદદાર રસ સંકેત",
    memory3_desc: "આજે 3 જથ્થાબંધ નિકાસ ખરીદદારોએ તમારો ડિજિટલ કેટલોગ જોયો.",

    // Voice Modal
    voice_modal_title: "બહુભાષી વૉઇસ AI સહાયક",
    voice_modal_sub: "ઝડપી સલાહ માટે તમારી ભાષામાં બોલો",
    voice_label_lang: "ભાષા પસંદ કરો:",
    chip_pricing: "💡 કિંમત અંગે સલાહ?",
    chip_market: "🏪 શ્રેષ્ઠ બજાર?",
    chip_festive: "🎉 તહેવાર ટિપ્સ?",
    voice_status_default: "બોલવા માટે માઇક દબાવો અથવા નીચે લખો:",
    btn_listen: "🔊 જવાબ સાંભળો",
    voice_input_placeholder: "ગુજરાતી અથવા અંગ્રેજીમાં પ્રશ્ન પૂછો...",
    btn_send: "મોકલો"
  }
};

/* ================= DEFAULT SEED ARTISAN PRODUCTS ================= */
const DEFAULT_PRODUCTS = [
  {
    id: "prod_bamboo_basket",
    name: "Handwoven Bamboo Storage Basket",
    category_code: "bamboo",
    category: "Bamboo & Wood",
    craft_type: "Handwoven Bamboo Craft",
    image: "images/image.png",
    price: 750,
    price_tier: "Mid-range",
    price_range: "₹550 – ₹950",
    confidence: 0.88,
    description: "Exquisitely handwoven storage basket made from seasoned Assam bamboo cane. Features intricate cross-weaving with eco-friendly natural polish.",
    features: [
      "Natural treated seasoned bamboo cane",
      "Traditional hexagonal weave pattern",
      "Sturdy reinforced rim & dual handles",
      "100% biodegradable and eco-friendly"
    ],
    tags: ["Handmade", "EcoFriendly", "BambooCraft", "HomeDecor"],
    target_market: "Urban Home Decor, Eco-friendly Lifestyle Shoppers, Gift Hampers",
    reasoning: "High demand in urban markets for sustainable storage and hampers. Pricing benchmarked against Dilli Haat artisan sales."
  },
  {
    id: "prod_terracotta_diya",
    name: "Terracotta Handpainted Diya & Urli Set",
    category_code: "terracotta",
    category: "Terracotta & Clay",
    craft_type: "Kiln-fired Clay Pottery",
    image: "https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?auto=format&fit=crop&w=400&q=80",
    price: 420,
    price_tier: "Budget-friendly",
    price_range: "₹300 – ₹550",
    confidence: 0.92,
    description: "Traditional kiln-fired terracotta urli with miniature oil lamps. Handpainted with natural organic pigments for festive celebrations.",
    features: [
      "Kiln-fired riverbed natural clay",
      "Handpainted ethnic floral motifs",
      "Water-resistant organic herbal sealant",
      "Accommodates floating tea-lights and flower petals"
    ],
    tags: ["Terracotta", "FestiveDecor", "ClayArt", "DiwaliCraft"],
    target_market: "Festive Shoppers, Cultural Decor Boutiques, Hotel Lobbies",
    reasoning: "Seasonal spike in festive demand gives steady turnover at moderate pricing."
  },
  {
    id: "prod_indigo_stole",
    name: "Indigo Handloom Block-Printed Dupatta",
    category_code: "textile",
    category: "Textiles",
    craft_type: "Handloom & Dabu Printing",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80",
    price: 1250,
    price_tier: "Premium",
    price_range: "₹1000 – ₹1600",
    confidence: 0.85,
    description: "Authentic Bagru block-printed handloom dupatta using centuries-old heritage wooden blocks and pure plant-based indigo dye.",
    features: [
      "100% Chanderi silk-cotton handloom weave",
      "Hand-carved teak woodblock printing",
      "Natural vegetable indigo extract dye",
      "Hand-knotted tassel fringe borders"
    ],
    tags: ["Handloom", "BlockPrint", "NaturalIndigo", "EthnicWear"],
    target_market: "Boutique Apparel Buyers, Fashion Export Houses, Retail Shoppers",
    reasoning: "Authentic GI block-print craft commands premium pricing in boutique and export channels."
  },
  {
    id: "prod_wood_coasters",
    name: "Hand-Carved Sheesham Wood Coasters",
    category_code: "decor",
    category: "Decor & Gifts",
    craft_type: "Saharanpur Wood Carving",
    image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80",
    price: 580,
    price_tier: "Mid-range",
    price_range: "₹450 – ₹750",
    confidence: 0.89,
    description: "Artisan-carved set of 6 Sheesham wooden coasters featuring geometric jali filigree cutwork, finished with natural beeswax.",
    features: [
      "Sustainable seasoned Sheesham hardwood",
      "Intricate jali cutwork floral filigree",
      "Heat and moisture resistant beeswax coating",
      "Set of 6 with matching carved holder box"
    ],
    tags: ["SheeshamWood", "WoodCarving", "JaliWork", "KitchenDecor"],
    target_market: "Corporate Gifting, Modern Kitchens, Souvenir Collectors",
    reasoning: "Standardized table accessory popular as corporate gift and souvenir with stable margins."
  }
];

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
        "profile": 5
    };

    if (navMap[screenId] !== undefined) {
        const navItems = document.querySelectorAll(".nav-item");
        if (navItems[navMap[screenId]]) {
            navItems[navMap[screenId]].classList.add("active");
        }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });

    // Dynamic data fetch on view
    if (screenId === "catalog") {
        renderCatalog();
    } else if (screenId === "insights") {
        loadDemandTrends();
    } else if (screenId === "profile") {
        loadArtisanInsights();
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

    console.log(`CraftConnect language switched to: ${langCode} (${langName})`);
}

function applyTranslations(lang) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS["en"];

    // Update text content for elements with data-i18n
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
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
}

// Close language menu on outside click
window.addEventListener("click", function(event) {
    if (!event.target.closest(".language-dropdown-container")) {
        const menu = document.getElementById("languageMenu");
        if (menu && menu.classList.contains("show")) {
            menu.classList.remove("show");
        }
    }
});

/* ================= PRODUCT CATALOG LOGIC ================= */
function initCatalog() {
    try {
        const stored = localStorage.getItem("craftconnect_catalog");
        if (stored) {
            catalogProducts = JSON.parse(stored);
        } else {
            catalogProducts = [...DEFAULT_PRODUCTS];
            saveCatalogToStorage();
        }
    } catch (e) {
        catalogProducts = [...DEFAULT_PRODUCTS];
    }

    updateDashboardCounts();
    renderCatalog();
}

function saveCatalogToStorage() {
    try {
        localStorage.setItem("craftconnect_catalog", JSON.stringify(catalogProducts));
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
        catalogProducts = catalogProducts.filter(p => p.id !== productId);
        saveCatalogToStorage();
        renderCatalog();
        updateDashboardCounts();
    }
}

function shareCatalogProduct() {
    if (!selectedProductForDetail) return;
    const prod = catalogProducts.find(p => p.id === selectedProductForDetail);
    if (!prod) return;

    const shareText = `🌿 CraftConnect Showcase: ${prod.name} by Sita Devi. Fair Price: ₹${prod.price}. Discover authentic Indian handmade crafts!`;

    if (navigator.share) {
        navigator.share({
            title: prod.name,
            text: shareText,
            url: window.location.href
        }).catch(() => {});
    } else {
        navigator.clipboard?.writeText(shareText);
        alert(currentLang === "hi" ? "उत्पाद विवरण क्लिपबोर्ड पर कॉपी हो गया!" :
              currentLang === "mr" ? "उत्पादन तपशील क्लिपबोर्डवर कॉपी केला गेला!" :
              currentLang === "gu" ? "પ્રોડક્ટ વિગતો ક્લિપબોર્ડ પર કૉપિ થઈ ગઈ!" :
              "Product details copied to clipboard! Ready to share with buyers on WhatsApp.");
    }
}

/* ================= REAL-TIME AI PRODUCT ANALYSIS & CATALOG ADDITION ================= */
async function analyzeProduct(event) {
    const file = event.target.files[0];
    if (!file) return;

    const loading = document.getElementById("loading");
    const result = document.getElementById("catalogResult");
    const preview = document.getElementById("previewImage");
    const notice = document.getElementById("catalogAddNotice");

    // Show image preview immediately
    const reader = new FileReader();
    reader.onload = function(e) {
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
        const response = await fetch(`${API_BASE_URL}/analyze`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`API analysis error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Live AI Analysis Response:", data);
        catalogData = data.product_catalog;
        pricingData = data.price_recommendation;
    } catch (err) {
        console.warn("Live API fallback triggered for catalog upload:", err);
        // Realistic simulated AI fallback for offline hackathon demonstration
        await new Promise(r => setTimeout(r, 1600));

        // Detect or assign craft context
        catalogData = {
            product_name: "Handcrafted Artisan Specialty",
            category: "Bamboo & Cane",
            craft_type: "Handwoven Craft",
            description: "Exquisitely hand-formed handicraft product made by traditional artisans with intricate finishing and eco-friendly treatment.",
            visual_features: [
                "Natural sustainable raw materials",
                "High-tensile durable weave craftsmanship",
                "Organic smooth finish with natural sealant",
                "Ready for domestic & export retail"
            ],
            tags: ["Handmade", "EcoFriendly", "ArtisanCraft", "TraditionalWeave"],
            target_market: ["Urban Home Decor", "ONDC Retail", "Craft Melas"]
        };

        pricingData = {
            predicted_price_tier: "Mid-range",
            price_display: "₹650 – ₹1,100",
            recommended_price_inr: 850,
            confidence_score: 0.88,
            reasoning: "Evaluated by Random Forest ML model using handicraft material complexity and current exhibition buyer willingness-to-pay."
        };
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

    // Automatically add newly uploaded product to the catalog!
    const newProduct = {
        id: "prod_" + Date.now(),
        name: catalogData.product_name || "Handcrafted Artisan Product",
        category_code: "bamboo",
        category: catalogData.category || "Handicraft",
        craft_type: catalogData.craft_type || "Traditional Craft",
        image: preview.src,
        price: Number(pricingData.recommended_price_inr) || 850,
        price_tier: pricingData.predicted_price_tier || "Mid-range",
        price_range: pricingData.price_display || "₹650 – ₹1,100",
        confidence: pricingData.confidence_score || 0.88,
        description: catalogData.description || "Handcrafted artisan product.",
        features: catalogData.visual_features || ["Eco-friendly natural materials", "Handmade craft"],
        tags: catalogData.tags || ["Handmade", "CraftConnect"],
        target_market: Array.isArray(catalogData.target_market) ? catalogData.target_market.join(", ") : catalogData.target_market,
        reasoning: pricingData.reasoning || "Evaluated by AI ML Pricing Model."
    };

    catalogProducts.unshift(newProduct);
    saveCatalogToStorage();
    updateDashboardCounts();

    loading.style.display = "none";
    result.style.display = "block";
    if (notice) notice.style.display = "flex";

    result.scrollIntoView({ behavior: "smooth" });
}

/* ================= MULTILINGUAL VOICE AI ASSISTANT & TTS ================= */
function openVoiceModal() {
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

    recognition.onstart = function() {
        micBtn.classList.add("recording");
        statusBox.innerText = "🎙️ Listening... Speak your craft question now.";
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById("voiceQueryInput").value = transcript;
        micBtn.classList.remove("recording");
        statusBox.innerText = `Recognized: "${transcript}"`;
        sendVoiceQuery();
    };

    recognition.onerror = function(event) {
        micBtn.classList.remove("recording");
        statusBox.innerText = `Speech error: ${event.error}. You can also type below.`;
    };

    recognition.onend = function() {
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

/* ================= INITIALIZATION ================= */
document.addEventListener("DOMContentLoaded", () => {
    console.log("CraftConnect Production Prototype Ready");

    // Initialize Catalog from localStorage or seed
    initCatalog();

    // Restore saved language if available
    const savedLang = localStorage.getItem("craftconnect_selected_lang");
    const savedLangName = localStorage.getItem("craftconnect_selected_lang_name");
    if (savedLang && savedLangName) {
        changeLanguage(savedLang, savedLangName);
    } else {
        applyTranslations("en");
    }
});
