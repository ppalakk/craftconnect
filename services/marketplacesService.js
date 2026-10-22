/**
 * Verified Catalog of Legitimate Online Selling Channels for Indian Artisans
 * Contains official URLs, realistic fee policies, document requirements, and API capabilities.
 */
const MARKETPLACE_CATALOG = [
  {
    id: "amazon-karigar",
    name: "Amazon India & Amazon Karigar",
    shortName: "Amazon Karigar",
    badgeLabel: "Artisan Storefront & National Marketplace",
    logoText: "Amazon",
    logoColor: "#FF9900",
    sellerUrl: "https://sell.amazon.in/sell-online/seller-registration-guide?ref_=scin_wp_footer_reg-guide&initialSessionID=262-9135886-4360913&ld=ASXXWPDirect",
    secondaryUrl: "https://sell.amazon.in/",
    supportedCategories: ["pottery", "textiles", "bamboo", "jewellery", "paintings", "decor", "all"],
    categoryFitNotes: {
      "pottery": "High customer interest in handmade terracotta cookware, planters, and studio ceramic dining ware.",
      "textiles": "Huge demand for authentic handloom sarees, block prints, stoles, and ethnic garments under Karigar storefront.",
      "bamboo": "Excellent traction for eco-friendly home storage, kitchenware, cane baskets, and sustainable decor.",
      "jewellery": "High visibility in fashion jewelry, oxidised silver craft, and regional handcrafted beadwork.",
      "paintings": "Dedicated collectors for traditional folk art (Madhubani, Gond, Tanjore, Warli) with framing options.",
      "decor": "Strong sales during festive seasons (Diwali, New Year) for handcrafted lamps, figurines, and brass items."
    },
    eligibilityRequirements: [
      "Active GSTIN (Goods and Services Tax Identification Number)",
      "Permanent Account Number (PAN)",
      "Active Current or Savings Bank Account with IFSC code",
      "Valid Mobile Number and Business Email Address",
      "For Amazon Karigar fee concessions: Pehchan ID Card issued by DC (Handicrafts) / DC (Handlooms) or State Handicraft Board certificate"
    ],
    feeStructure: {
      summary: "Category referral fees (typically 3% to 15%) + Closing fees + Fulfillment/Shipping fees.",
      waiverNotes: "Verified Karigar artisans receive subsidized referral fees and dedicated onboarding support. Verify current rates on Seller Central.",
      isZeroCommission: false
    },
    reachScope: "Pan-India delivery network covering 19,000+ pincodes via Amazon Easy Ship and Fulfillment by Amazon (FBA).",
    apiCapability: {
      hasPublicApi: true,
      apiName: "Amazon Selling Partner API (SP-API)",
      authType: "OAuth 2.0 with Login with Amazon (LWA) and AWS IAM Authorization",
      integrationStatus: "developer_access_required",
      docUrl: "https://developer-docs.amazon.com/sp-api/",
      requirements: "Registered developer account on Amazon Seller Central, AWS account with IAM role/user, and approved SP-API application roles."
    },
    actionLabel: "Visit Amazon Karigar Portal ↗"
  },
  {
    id: "meesho-supplier",
    name: "Meesho Supplier Panel",
    shortName: "Meesho",
    badgeLabel: "Tier 2/3 Wholesale & Value Retail",
    logoText: "Meesho",
    logoColor: "#9B27B0",
    sellerUrl: "https://supplier.meesho.com/",
    supportedCategories: ["textiles", "jewellery", "decor", "pottery", "all"],
    categoryFitNotes: {
      "textiles": "One of India's largest consumer bases for budget ethnic wear, cotton dress materials, daily wear sarees.",
      "jewellery": "Extremely high turnover for fashion jewelry, bridal sets, oxidised necklaces, and affordable accessories.",
      "decor": "Fast growth in low-cost handmade gift items, puja articles, and home accessories.",
      "pottery": "Growing demand for small planters, festive diyas, and decorative terracotta.",
      "bamboo": "Selective traction for lightweight bamboo baskets, cutlery, and kitchen utility items.",
      "paintings": "Niche demand primarily for printed or framed wall hanging craft."
    },
    eligibilityRequirements: [
      "Active GSTIN (or Enrolment ID for intra-state suppliers exempt under composition threshold)",
      "PAN Card and valid Bank Account",
      "Unique business phone number for order notifications"
    ],
    feeStructure: {
      summary: "0% marketplace commission on listed selling price.",
      waiverNotes: "While Meesho does not take catalog commissions, shipping fees and deductions for customer returns apply. Verify detailed returns policy on supplier portal.",
      isZeroCommission: true
    },
    reachScope: "Over 14 Crore active annual customers across Bharat (Tier 2, Tier 3, and Tier 4 towns).",
    apiCapability: {
      hasPublicApi: false,
      apiName: "Meesho Partner Supplier API (Restricted / Enterprise)",
      authType: "Restricted Enterprise Portal",
      integrationStatus: "external_registration_only",
      docUrl: "https://supplier.meesho.com/",
      requirements: "Direct listing and order dispatch is managed exclusively through the web and mobile Meesho Supplier Panel."
    },
    actionLabel: "Visit Meesho Supplier Portal ↗"
  },
  {
    id: "flipkart-samarth",
    name: "Flipkart Seller Hub & Flipkart Samarth",
    shortName: "Flipkart Samarth",
    badgeLabel: "National Artisan Inclusion Program",
    logoText: "Flipkart",
    logoColor: "#2874F0",
    sellerUrl: "https://seller.flipkart.com/grow-your-business/samarth",
    secondaryUrl: "https://seller.flipkart.com/",
    supportedCategories: ["textiles", "bamboo", "pottery", "decor", "jewellery", "all"],
    categoryFitNotes: {
      "textiles": "High volume for traditional handlooms, linen, silk weaves, and regional folk embroidery.",
      "bamboo": "Strong institutional and retail interest under the Flipkart Samarth sustainable lifestyle pavilion.",
      "pottery": "Seasonal surges during Diwali and summer for clay water bottles, cookware, and decorative pottery.",
      "decor": "Popular destination for festive lighting, brass wall hangings, and handcrafted figurines.",
      "jewellery": "Broad buyer demographic for tribal, terracotta, and semi-precious stone craft jewellery.",
      "paintings": "Emerging category with curated art galleries during Big Billion Days."
    },
    eligibilityRequirements: [
      "Valid GSTIN",
      "PAN Card and Business Bank Account",
      "At least 1 unique product to list",
      "For Flipkart Samarth: Artisan Card / Pehchan Card or registration with Ministry of Textiles / KVIC / State Handloom Board"
    ],
    feeStructure: {
      summary: "Commission (category-based, 4% to 18%) + Collection fee + Fixed fee + Shipping fee.",
      waiverNotes: "Flipkart Samarth provides time-limited commission waivers, dedicated account managers, and cataloging incubation for verified craftspeople.",
      isZeroCommission: false
    },
    reachScope: "Over 50 Crore registered customers across India with extensive Ekart supply chain reach.",
    apiCapability: {
      hasPublicApi: true,
      apiName: "Flipkart Marketplace Seller API",
      authType: "OAuth 2.0 Client Credentials",
      integrationStatus: "developer_access_required",
      docUrl: "https://seller.flipkart.com/api-docs/",
      requirements: "Registered developer account on Flipkart Seller Hub, approved Seller App ID and App Secret."
    },
    actionLabel: "Visit Flipkart Samarth Portal ↗"
  },
  {
    id: "myntra-partners",
    name: "Myntra Partner Portal",
    shortName: "Myntra",
    badgeLabel: "Premium Fashion & Designer Lifestyle",
    logoText: "Myntra",
    logoColor: "#FF3F6C",
    sellerUrl: "https://partners.myntra.com/",
    supportedCategories: ["textiles", "jewellery", "decor"],
    categoryFitNotes: {
      "textiles": "Premier Indian marketplace for high-value handloom sarees, designer kurtas, sustainable textiles, and artisanal apparel.",
      "jewellery": "High-ticket sales for boutique handcrafted jewelry, silver filigree, kundan, and contemporary artisan adornments.",
      "decor": "Curated modern craft home decor, artisanal cushion covers, runners, and studio ceramics."
    },
    eligibilityRequirements: [
      "Registered Business Entity (Private Limited, LLP, Registered Sole Proprietorship)",
      "Registered Brand Name or Trademark certificate",
      "GSTIN, PAN, and Bank Account",
      "Strict quality benchmark and catalog curation review before onboarding approval"
    ],
    feeStructure: {
      summary: "Marketplace commission (typically 18% to 32% depending on sub-category) + logistics fees.",
      waiverNotes: "Requires brand assessment and commercial agreement with Myntra category manager.",
      isZeroCommission: false
    },
    reachScope: "Over 4 Crore urban, trend-conscious fashion buyers seeking premium design and quality craftsmanship.",
    apiCapability: {
      hasPublicApi: false,
      apiName: "Myntra Enterprise Partner Integration (EDI / ONDC SNP)",
      authType: "Enterprise B2B Protocol",
      integrationStatus: "brand_approval_required",
      docUrl: "https://partners.myntra.com/",
      requirements: "Requires approved brand onboarding contract with Myntra vendor management team."
    },
    actionLabel: "Visit Myntra Partner Portal ↗"
  },
  {
    id: "etsy-india",
    name: "Etsy India",
    shortName: "Etsy",
    badgeLabel: "Global Cross-Border Handmade Marketplace",
    logoText: "Etsy",
    logoColor: "#F1641E",
    sellerUrl: "https://www.etsy.com/sell",
    supportedCategories: ["pottery", "jewellery", "paintings", "textiles", "bamboo", "decor", "all"],
    categoryFitNotes: {
      "jewellery": "Massive global demand for handmade silver, brass, macrame, and gemstone jewelry with international shipping.",
      "textiles": "High appreciation for vintage Kantha quilts, block print robes, and hand-spun organic fabrics.",
      "paintings": "International collectors looking for original Indian folk paintings (Madhubani, Pattachitra, Miniature).",
      "pottery": "Global market for unique studio ceramics and artisan decorative vessels.",
      "bamboo": "Strong market in North America and Europe for handcrafted sustainable wood items and weaving.",
      "decor": "Niche international buyers seeking bespoke wedding gifts, bohemian wall decor, and brass idols."
    },
    eligibilityRequirements: [
      "Valid PAN Card and Bank Account",
      "International Debit/Credit card or PayPal for seller account verification",
      "For cross-border export sales: Import Export Code (IEC) from DGFT and India Post / DHL courier KYC",
      "Adherence to Etsy's strict Handmade Policy (items must be made or designed by you)"
    ],
    feeStructure: {
      summary: "Listing fee ($0.20 USD per item for 4 months) + 6.5% transaction fee + payment processing fee.",
      waiverNotes: "International currency conversion and regulatory fees may apply for Indian export transactions. Check Etsy's fee policy.",
      isZeroCommission: false
    },
    reachScope: "Over 9 Crore active buyers worldwide across the USA, UK, Europe, Australia, and urban India.",
    apiCapability: {
      hasPublicApi: true,
      apiName: "Etsy Open API v3",
      authType: "OAuth 2.0 with PKCE",
      integrationStatus: "developer_access_required",
      docUrl: "https://developers.etsy.com/",
      requirements: "Registered developer account on Etsy Developers portal and approved API Key."
    },
    actionLabel: "Visit Etsy Seller Portal ↗"
  },
  {
    id: "ondc-network",
    name: "ONDC (Open Network for Digital Commerce)",
    shortName: "ONDC",
    badgeLabel: "Government-Backed Open Protocol Network",
    logoText: "ONDC",
    logoColor: "#0F5147",
    sellerUrl: "https://ondc.org/",
    secondaryUrl: "https://ondc.org/participants/",
    supportedCategories: ["all", "pottery", "textiles", "bamboo", "jewellery", "paintings", "decor"],
    categoryFitNotes: {
      "all": "Lists your catalog across multiple buyer apps (Paytm, Mystore, CraftConnect, Magicpin, Pincode) from a single onboarding."
    },
    eligibilityRequirements: [
      "Active GSTIN",
      "Bank Account details with IFSC",
      "Onboarding via a certified Seller Network Participant (SNP) such as Mystore, eSamudaay, Shiprocket, or GrowthFalcons"
    ],
    feeStructure: {
      summary: "Decentralized network fees (typically 1.5% to 3.5%) + Buyer app finder fee + logistics fee.",
      waiverNotes: "No platform monopoly lock-in. Lower aggregate commissions than traditional commercial e-commerce giants.",
      isZeroCommission: false
    },
    reachScope: "Multi-platform buyer access reaching millions of Indian digital shoppers across participating buyer apps.",
    apiCapability: {
      hasPublicApi: true,
      apiName: "Beckn Protocol / ONDC Seller Network Participant API",
      authType: "Beckn Open Protocol Key Pair & Signing",
      integrationStatus: "snp_integration_available",
      docUrl: "https://ondc.org/developer-guide/",
      requirements: "Integration requires connecting through an active ONDC certified Seller App gateway or SNP."
    },
    actionLabel: "Explore ONDC Participant Network ↗"
  }
];

class MarketplacesService {
  /**
   * Recommend and match marketplaces dynamically based on artisan's craft category.
   * Uses clear explainable matching logic without fabricating fixed percentages.
   */
  getRecommendations(category = "all", userPreferences = {}) {
    const cleanCat = String(category || "all").toLowerCase().trim();

    return MARKETPLACE_CATALOG.map(platform => {
      const isDirectCategoryMatch = platform.supportedCategories.includes("all") || platform.supportedCategories.includes(cleanCat);
      const categoryNote = platform.categoryFitNotes[cleanCat] || platform.categoryFitNotes["all"] || "Suitable for verified handicraft sellers.";

      let matchTier = "Recommended";
      let matchReason = `High demand for ${cleanCat !== 'all' ? cleanCat : 'handicraft'} products. ${categoryNote}`;

      if (!isDirectCategoryMatch) {
        matchTier = "Eligibility to Verify";
        matchReason = `Platform primarily caters to ${platform.supportedCategories.filter(c => c !== 'all').join(', ')}. Category suitability should be verified before application.`;
      } else if (platform.id === "myntra-partners") {
        matchTier = "Eligibility to Verify";
        matchReason = "Premium curation and brand trademark required. Recommended for established weaver societies and designer labels.";
      } else if (platform.id === "etsy-india") {
        matchTier = "Recommended for Export";
        matchReason = "Strongest global dollar-earning channel for original handcrafted items and GI products.";
      }

      return {
        ...platform,
        matchTier,
        matchReason,
        categoryFitNote: categoryNote,
        selectedCategory: cleanCat,
        recommendedStatus: isDirectCategoryMatch ? "Recommended" : "Eligibility to Verify",
        connectionState: "not_started" // Updated dynamically per user
      };
    });
  }

  getPlatformById(id) {
    return MARKETPLACE_CATALOG.find(p => p.id === id) || null;
  }
}

module.exports = new MarketplacesService();
