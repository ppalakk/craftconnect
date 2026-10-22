
/* ================= PENDING ORDERS MODAL ================= */

let ordersActiveFilter = "all";

// Order data — persisted in localStorage so dispatching survives refreshes
const DEFAULT_ORDERS = [
    {
        id: "ord_001",
        buyer: "Meena Sharma",
        location: "📍 Jaipur, Rajasthan",
        item: "Handwoven Bamboo Storage Basket (×2)",
        amount: 1500,
        qty: 2,
        productId: "prod_bamboo_basket",
        date: "2026-10-01",
        status: "pending"
    },
    {
        id: "ord_002",
        buyer: "Rajiv Exports Pvt. Ltd.",
        location: "📍 Mumbai, Maharashtra",
        item: "Indigo Block-Printed Dupatta (×5)",
        amount: 6250,
        qty: 5,
        productId: "prod_indigo_stole",
        date: "2026-09-30",
        status: "pending"
    },
    {
        id: "ord_003",
        buyer: "Ananya Mehta",
        location: "📍 Bengaluru, Karnataka",
        item: "Terracotta Diya & Urli Set (×3)",
        amount: 1260,
        qty: 3,
        productId: "prod_terracotta_diya",
        date: "2026-10-01",
        status: "dispatched"
    },
    {
        id: "ord_004",
        buyer: "Dilli Haat Curator",
        location: "📍 New Delhi",
        item: "Sheesham Wood Coasters — Set of 6 (×4)",
        amount: 2320,
        qty: 4,
        productId: "prod_wood_coasters",
        date: "2026-09-28",
        status: "dispatched"
    },
    {
        id: "ord_005",
        buyer: "Eco Home Decor Studio",
        location: "📍 Pune, Maharashtra",
        item: "Handwoven Bamboo Storage Basket (×1)",
        amount: 750,
        qty: 1,
        productId: "prod_bamboo_basket",
        date: "2026-09-26",
        status: "dispatched"
    },
    {
        id: "ord_006",
        buyer: "FabIndia Curator",
        location: "📍 New Delhi",
        item: "Sheesham Wood Coasters — Set of 6 (×2)",
        amount: 1160,
        qty: 2,
        productId: "prod_wood_coasters",
        date: "2026-09-22",
        status: "dispatched"
    },
    {
        id: "ord_007",
        buyer: "Heritage Handlooms Guild",
        location: "📍 Kolkata, West Bengal",
        item: "Indigo Block-Printed Dupatta (×2)",
        amount: 2500,
        qty: 2,
        productId: "prod_indigo_stole",
        date: "2026-09-18",
        status: "dispatched"
    },
    {
        id: "ord_008",
        buyer: "Kaveri Living Boutique",
        location: "📍 Chennai, Tamil Nadu",
        item: "Handwoven Bamboo Storage Basket (×3)",
        amount: 2250,
        qty: 3,
        productId: "prod_bamboo_basket",
        date: "2026-09-12",
        status: "dispatched"
    },
    {
        id: "ord_009",
        buyer: "Diwali Decor Emporium",
        location: "📍 Ahmedabad, Gujarat",
        item: "Terracotta Diya & Urli Set (×5)",
        amount: 2100,
        qty: 5,
        productId: "prod_terracotta_diya",
        date: "2026-08-25",
        status: "dispatched"
    },
    {
        id: "ord_010",
        buyer: "Artisan Co-op Central",
        location: "📍 Jaipur, Rajasthan",
        item: "Sheesham Wood Coasters — Set of 6 (×3)",
        amount: 1740,
        qty: 3,
        productId: "prod_wood_coasters",
        date: "2026-08-14",
        status: "dispatched"
    },
    {
        id: "ord_011",
        buyer: "Global Craft Exports",
        location: "📍 Mumbai, Maharashtra",
        item: "Indigo Block-Printed Dupatta (×4)",
        amount: 5000,
        qty: 4,
        productId: "prod_indigo_stole",
        date: "2026-05-20",
        status: "dispatched"
    },
    {
        id: "ord_012",
        buyer: "Sanskriti Handcrafts",
        location: "📍 Hyderabad, Telangana",
        item: "Handwoven Bamboo Storage Basket (×4)",
        amount: 3000,
        qty: 4,
        productId: "prod_bamboo_basket",
        date: "2025-10-15",
        status: "dispatched"
    }
];

// government scheme

const SCHEMES = [
  {
    id: "vishwakarma",
    name: "PM Vishwakarma Scheme",
    ministry: "Ministry of Micro, Small & Medium Enterprises (MSME)",
    badge: "Craft & Trade",
    type: "craft",
    types: ["craft", "toolkit", "all"],
    icon: "toolkit",
    categoryTone: "amber",
    highlight: "Up to ₹3,00,000",
    period: "2023 — 2028",
    yearTag: "term",
    audience: "Artisans & Traditional Craftsmen",
    blurb: "Comprehensive central scheme providing ₹15,000 modern toolkit incentives, skill training with daily stipend, and 5% collateral-free credit for traditional craftspeople.",
    keyBenefits: [
      "₹15,000 e-voucher toolkit incentive upon basic skill training completion",
      "Collateral-free credit: ₹1 Lakh (1st tranche) & ₹2 Lakh (2nd tranche) @ 5% concessional interest",
      "₹500/day training stipend + ₹100/month digital transaction incentive"
    ],
    apply: "https://pmvishwakarma.gov.in/",
    fits: ["handicraft", "pottery", "woodwork", "metalwork", "leather", "jewellery", "stone", "painting", "embroidery", "paper", "other"],
    maxTurnover: "small",
    minTurnover: "micro_low",
    overview: "PM Vishwakarma is designed to give end-to-end holistic support to artisans and craftspeople who work with their hands and traditional tools. The scheme provides recognition, capacity building, modern toolkits, collateral-free concessional credit, and marketing linkages to integrate artisans into domestic and global supply chains.",
    financialAid: [
      { label: "Toolkit Incentive", val: "₹15,000 Grant", desc: "Digital e-voucher for certified modern artisan toolkit" },
      { label: "Loan Tranche 1", val: "Up to ₹1,00,000", desc: "18-month tenure at 5% concessional interest (Govt subvention 8%)" },
      { label: "Loan Tranche 2", val: "Up to ₹2,00,000", desc: "30-month tenure for artisans who successfully repaid Tranche 1" },
      { label: "Training Stipend", val: "₹500 / day", desc: "5-7 days basic and 15+ days advanced skill training" }
    ],
    eligibilityCriteria: [
      "Must be a practicing artisan or craftsperson working with hands and traditional tools in one of 18 recognized family trades.",
      "Minimum age of 18 years on the date of application registration.",
      "Should not have availed loans under similar credit schemes (like PMEGP, MUDRA) with outstanding unpaid defaults.",
      "Benefit is restricted to only one member per family (husband, wife, and unmarried children)."
    ],
    requiredDocs: [
      "Aadhaar Card (linked with active mobile number for OTP)",
      "Active Bank Account Passbook / Statement (showing IFSC)",
      "Ration Card / Family Composition Document",
      "Skill Verification & Recommendation by Gram Panchayat or Urban Local Body (ULB)"
    ],
    howToApply: [
      "Artisans can register for free at any local Common Service Centre (CSC) or online at pmvishwakarma.gov.in.",
      "Stage 1: Verification is completed by the Gram Panchayat Head / ULB Executive.",
      "Stage 2: Screening by District Implementation Committee followed by National Screening Committee approval.",
      "Receive official PM Vishwakarma Certificate & ID Card, followed by skill training, toolkit grant, and collateral-free loan disbursal."
    ]
  },
  {
    id: "mudra",
    name: "Pradhan Mantri MUDRA Yojana (PMMY)",
    ministry: "Department of Financial Services, Ministry of Finance",
    badge: "Loan & Credit",
    type: "credit",
    types: ["credit", "all"],
    icon: "bank",
    categoryTone: "teal",
    highlight: "Up to ₹10,00,000",
    period: "Ongoing",
    yearTag: "ongoing",
    audience: "MSMEs & Artisans",
    blurb: "Institutional micro-loans up to ₹10 Lakh without collateral for artisan enterprises to purchase raw materials, upgrade workshop machinery, and fulfill wholesale orders.",
    keyBenefits: [
      "Shishu (up to ₹50k), Kishore (₹50k – ₹5L) and Tarun (₹5L – ₹10L) collateral-free loan slabs",
      "Zero collateral or third-party guarantee required for qualified artisan units",
      "MUDRA RuPay Card provided for hassle-free working capital withdrawals"
    ],
    apply: "https://www.mudra.org.in/",
    fits: ["all", "handicraft", "textile", "pottery", "jewellery", "metalwork", "woodwork", "leather", "stone", "painting", "embroidery", "paper", "other"],
    maxTurnover: "grow",
    minTurnover: "micro_low",
    overview: "MUDRA aims to fund the unfunded by extending formal institutional finance to micro-enterprises and artisan manufacturing units. It operates through commercial banks, Regional Rural Banks (RRBs), Small Finance Banks, and MFIs to provide working capital and asset creation support without demanding collateral.",
    financialAid: [
      { label: "Shishu Category", val: "Up to ₹50,000", desc: "Initial micro-capital for tool purchase and supplies" },
      { label: "Kishore Category", val: "₹50,000 – ₹5 Lakh", desc: "For scaling production and bulk raw material buying" },
      { label: "Tarun Category", val: "₹5 Lakh – ₹10 Lakh", desc: "For establishing workshops, showrooms, and export orders" },
      { label: "Processing Fees", val: "0% for Shishu", desc: "Nominal or waived processing charges across nationalized banks" }
    ],
    eligibilityCriteria: [
      "Any Indian artisan, craftsperson, or micro-enterprise engaged in non-farm manufacturing or craft services.",
      "Clean credit track record with no prior willful loan defaults in any commercial bank.",
      "Clear business proposal demonstrating viable craft sales and cash flow to service loan EMIs.",
      "Applicable for both individual artisans and proprietary/partnership artisan workshops."
    ],
    requiredDocs: [
      "Proof of Identity (Aadhaar, Voter ID, PAN card)",
      "Proof of Residence (Electricity bill, Ration card, Aadhaar)",
      "Bank Account Statement for past 6 months",
      "Artisan Certificate / Udyam Registration (recommended for fast-track processing)",
      "Quotation of machinery/tools or raw material procurement estimate (for Kishore & Tarun)"
    ],
    howToApply: [
      "Apply directly through the Udyamimitra portal (www.udyamimitra.in) or visit any nationalized bank branch.",
      "Submit the standardized MUDRA loan application along with required KYC and business details.",
      "Bank evaluates credit feasibility and sanctions the loan with zero collateral.",
      "Loan amount is credited directly and MUDRA debit card is issued for continuous cash credit."
    ]
  },
  {
    id: "pehchan",
    name: "Pehchan Artisan Identity Card",
    ministry: "Office of DC (Handicrafts), Ministry of Textiles",
    badge: "Identity Card",
    type: "identity",
    types: ["identity", "all"],
    icon: "idcard",
    categoryTone: "violet",
    highlight: "Free",
    period: "Ongoing",
    yearTag: "ongoing",
    audience: "Registered Artisans",
    blurb: "Official government-verified national identity card for genuine handicraft artisans, unlocking direct access to national exhibitions, Shilp Guru awards, and subsidized stalls.",
    keyBenefits: [
      "Direct stall allocation & TA/DA reimbursement at Gandhi Shilp Bazaars & Craft Melas",
      "Eligibility for National Awards, Shilp Guru honors & Master Craftsperson monthly pensions",
      "Free access to DC (Handicrafts) testing labs, design workshops, and welfare programs"
    ],
    apply: "https://handmadeinindia.gov.in/",
    fits: ["all", "handicraft", "textile", "pottery", "jewellery", "metalwork", "woodwork", "leather", "stone", "painting", "embroidery", "paper", "other"],
    maxTurnover: "grow",
    minTurnover: "micro_low",
    overview: "The Pehchan initiative is a nationwide digitization campaign by the Ministry of Textiles to issue unique biometric-linked identity cards to all handicraft artisans. The Pehchan card is the primary proof of identity recognized across all state handicraft corporations, exhibition venues, and central subsidy desks.",
    financialAid: [
      { label: "Mela Stall Grant", val: "100% Subsidized", desc: "Free stalls + daily travel and dearness allowances" },
      { label: "Welfare Insurance", val: "Full Premium Paid", desc: "Group accidental insurance coverage for registered artisans" },
      { label: "Master Pension", val: "₹8,000 / month", desc: "Financial assistance for indigent master craftspersons over 60" },
      { label: "National Awards", val: "Up to ₹2,00,000", desc: "Cash prize, tamrapatra, and certificate for master crafts" }
    ],
    eligibilityCriteria: [
      "Practicing artisan or craftsperson residing in India with demonstrated skills in any handicraft craft discipline.",
      "Minimum age of 14 years (with parental consent for training) or 18+ for independent card issuance.",
      "Must not already possess a duplicate Pehchan ID for the same craft stream."
    ],
    requiredDocs: [
      "Aadhaar Card copy",
      "2 Passport size colour photographs",
      "Copy of active Bank Passbook (showing IFSC and Account number)",
      "Craft sample photographs or artisan certificate issued by local field officer / cooperative society"
    ],
    howToApply: [
      "Visit the official Service Portal at handmadeinindia.gov.in or contact the nearest Field Facilitation Centre (HSC).",
      "Submit artisan registration form with personal details, craft discipline, and photos.",
      "Field officer from DC (Handicrafts) verifies craft skill and credentials.",
      "Digital Pehchan card is generated with unique Artisan Registration Number and dispatched to the artisan."
    ]
  },
  {
    id: "nhdp",
    name: "National Handicrafts Development Programme",
    ministry: "Office of DC (Handicrafts), Ministry of Textiles",
    badge: "Skill Development",
    type: "skill",
    types: ["skill", "cluster", "all"],
    icon: "handloom",
    categoryTone: "green",
    highlight: "Varies by program",
    period: "Ongoing",
    yearTag: "ongoing",
    audience: "Craft Clusters & Artisans",
    blurb: "Training programs, design support and capacity building for artisan communities to improve quality and market access.",
    keyBenefits: [
      "Margin money financial grant up to ₹20,000 per weaver for working capital",
      "7% interest subvention for 3 years on Weavers MUDRA credit lines",
      "Up to 90% financial subsidy for upgraded frame looms, jacquards & electronic dobby"
    ],
    apply: "https://handlooms.nic.in/",
    fits: ["all", "textile", "embroidery", "handicraft", "leather", "pottery", "woodwork", "metalwork", "other"],
    maxTurnover: "grow",
    minTurnover: "micro_low",
    overview: "NHDP aims to support the holistic development of handloom weavers across rural and urban handloom clusters. It combines concessional credit, technological modernization of looms, brand promotion through India Handloom Brand (IHB), and subsidized bulk yarn supply via NHDC.",
    financialAid: [
      { label: "Margin Money Grant", val: "Up to ₹20,000", desc: "Direct capital infusion credited into weaver loan account" },
      { label: "Interest Subvention", val: "7% per annum", desc: "Government bears 7% of bank loan interest for up to 3 years" },
      { label: "Loom Modernization", val: "90% Subsidy", desc: "Grant support for advanced accessories and frame looms" },
      { label: "Work-shed Grant", val: "Up to ₹1,20,000", desc: "Construction assistance for individual weaver work-sheds" }
    ],
    eligibilityCriteria: [
      "Individual handloom weavers, master weavers, handloom SHGs, and primary handloom cooperative societies.",
      "Must hold a valid Handloom Weaver ID Card or certification from the local Weavers' Service Centre (WSC).",
      "Applicant should have no bad debt or default history with lending institutions."
    ],
    requiredDocs: [
      "Handloom Weaver Pehchan Card or WSC Verification",
      "Aadhaar Card and PAN Card",
      "Bank Passbook copy showing active savings/current account",
      "Yarn Passbook (if registered with NHDC) or SHG membership proof"
    ],
    howToApply: [
      "Submit application through your nearest Weavers' Service Centre (WSC) or State Directorate of Handlooms.",
      "Applications for Weavers MUDRA can also be submitted directly at scheduled commercial banks.",
      "Joint verification by WSC and bank branch manager.",
      "Sanctioned margin money is transferred directly via DBT and subsidized credit limit is enabled."
    ]
  },
  {
    id: "ahvy",
    name: "National Handloom & Handicrafts Board (NHHB)",
    ministry: "Ministry of Textiles, Govt. of India",
    badge: "Market Support",
    type: "market",
    types: ["market", "cluster", "all"],
    icon: "cluster",
    categoryTone: "mint",
    highlight: "Varies by scheme",
    period: "Ongoing",
    yearTag: "ongoing",
    audience: "Registered Artisans",
    blurb: "Support for exhibitions, trade fairs, marketing, and e-commerce linkages to connect artisans with national and global markets.",
    keyBenefits: [
      "Up to ₹10 Lakh grant for setting up Common Facility Centres (CFC) and shared machinery",
      "Product development and design innovation workshops with empanelled NID/NIFT experts",
      "Financial assistance for collective bulk raw material purchase and buyer-seller meets"
    ],
    apply: "https://handicrafts.nic.in/",
    fits: ["all", "handicraft", "pottery", "metalwork", "woodwork", "leather", "stone", "paper", "jewellery", "textile", "painting", "embroidery", "other"],
    maxTurnover: "grow",
    minTurnover: "micro_low",
    overview: "AHVY is a cluster-based artisan mobilization model designed to empower handicraft artisans through collectivization. By organizing artisans into Self Help Groups (SHGs) and producer organizations, the scheme unlocks economies of scale for raw material purchase, shared high-tech tooling, design diversification, and direct institutional marketing.",
    financialAid: [
      { label: "CFC Infrastructure", val: "Up to ₹10 Lakh", desc: "Grant for common workshop sheds, kilns, and machinery" },
      { label: "Design Workshops", val: "100% Funded", desc: "Expert designer mentoring for modern market orientation" },
      { label: "Tool Bank Grant", val: "Up to ₹5 Lakh", desc: "Shared high-value precision tools for cluster artisans" },
      { label: "Exhibition Support", val: "Full Sponsorship", desc: "Cluster stalls at domestic fairs and international trade meets" }
    ],
    eligibilityCriteria: [
      "Artisan Self Help Groups (SHGs), Primary Handicraft Cooperatives, Producer Companies, and NGOs working with artisan clusters.",
      "Cluster must have a minimum concentration of practicing artisans in a defined geographical hub.",
      "Participating artisans must hold Pehchan identity cards or verifiable craft records."
    ],
    requiredDocs: [
      "Society / SHG / Producer Company Registration Certificate",
      "List of cluster artisan members with their Pehchan ID numbers",
      "Bank Account Details and Resolution of Cluster Executive Committee",
      "Diagnostic Study Report (DSR) or Cluster Action Plan"
    ],
    howToApply: [
      "Cluster leadership or sponsoring NGO submits Diagnostic Study Report to Office of DC (Handicrafts).",
      "State-level and Central Sanctioning Committees review and approve cluster action plan.",
      "Funds are disbursed in phases directly to the cluster implementing agency bank account.",
      "Common facility construction and design interventions are tracked through regular monitoring visits."
    ]
  },
  {
    id: "clcss",
    name: "Credit Linked Capital Subsidy Scheme (CLCSS)",
    ministry: "Ministry of Micro, Small & Medium Enterprises (MSME)",
    badge: "Subsidy",
    type: "subsidy",
    types: ["subsidy", "toolkit", "credit", "all"],
    icon: "enterprise",
    categoryTone: "rose",
    highlight: "Up to 15% subsidy",
    period: "Ongoing",
    yearTag: "ongoing",
    audience: "MSMEs & Artisans",
    blurb: "Provides capital subsidy to MSMEs for technology upgradation, modernization and capacity expansion.",
    keyBenefits: [
      "Bank credit from ₹10 Lakh up to ₹1 Crore covering up to 85% of total project cost",
      "Composite loan structure (term loan for machinery + working capital limit)",
      "Credit guarantee cover under Credit Guarantee Fund for Stand Up India (CGFSI)"
    ],
    apply: "https://www.dcmsme.gov.in/schemes/credit_link_scheme.htm",
    fits: ["all", "handicraft", "textile", "pottery", "jewellery", "metalwork", "woodwork", "leather", "stone", "painting", "embroidery", "paper", "other"],
    maxTurnover: "grow",
    minTurnover: "small",
    overview: "CLCSS helps well-established and new micro and small enterprises, including artisan workshops, upgrade plant and machinery through a capital subsidy of up to 15% on eligible institutional credit. The subsidy reduces the effective cost of modern tools, kilns, looms, and processing equipment.",
    financialAid: [
      { label: "Capital Subsidy", val: "Up to 15%", desc: "On the institutional credit availed for eligible machinery" },
      { label: "Ceiling", val: "₹15 Lakh subsidy", desc: "On term loans up to ₹1 Crore for technology upgradation" },
      { label: "Eligible Assets", val: "Plant & machinery", desc: "New indigenous or imported equipment for craft production" },
      { label: "Disbursal", val: "Through PLI banks", desc: "Subsidy is adjusted against the term loan account" }
    ],
    eligibilityCriteria: [
      "Artisan entrepreneur must be a Woman or belong to SC/ST category.",
      "The enterprise must be a 'greenfield' venture (first-time venture in artisan manufacturing/services).",
      "In case of non-individual enterprises (partnerships/companies), 51% shareholding must be held by SC/ST or woman entrepreneur.",
      "Borrower should not be in default to any bank or financial institution."
    ],
    requiredDocs: [
      "Proof of Identity & Category Certificate (SC/ST certificate if applicable)",
      "Proof of Residence and PAN Card",
      "Detailed Project Report (DPR) with cash flow projections and machinery invoices",
      "Udyam Registration Certificate & Lease deed/ownership proof for factory premises",
      "Last 2 years Income Tax Returns (ITR) of promoters if available"
    ],
    howToApply: [
      "Apply through a Primary Lending Institution (scheduled commercial bank, SIDBI, or NABARD) with a term-loan proposal.",
      "Submit Udyam registration, quotations for new machinery, and KYC documents with the loan application.",
      "Once the term loan is sanctioned, the bank claims capital subsidy from the nodal agency.",
      "Approved subsidy is credited to the loan account, reducing the outstanding principal."
    ]
  }
];

window.SCHEMES = SCHEMES;