// CraftConnect Demand & Trend Intelligence Controller

const INSIGHTS_DATA = {
  overviewCards: [
    {
      id: "trending_categories",
      title: "Trending Categories",
      value: "8 Active",
      change: "+18% vs prev period",
      isPositive: true,
      icon: "🧺",
      sparkline: [40, 55, 60, 72, 85, 92]
    },
    {
      id: "rising_demand",
      title: "Rising Demand Index",
      value: "86.4 / 100",
      change: "+12.5% YoY Growth",
      isPositive: true,
      icon: "📈",
      sparkline: [50, 62, 68, 74, 80, 86]
    },
    {
      id: "emerging_opps",
      title: "Emerging Opportunities",
      value: "14 Active Melas",
      change: "4 new this week",
      isPositive: true,
      icon: "🎯",
      sparkline: [3, 5, 8, 10, 12, 14]
    },
    {
      id: "markets_covered",
      title: "Markets Covered",
      value: "12 Regional Hubs",
      change: "Pan-India Reach",
      isPositive: true,
      icon: "🏛️",
      sparkline: [8, 9, 10, 10, 11, 12]
    }
  ],

  trendingRightNow: [
    {
      id: "trend_bamboo",
      name: "Bamboo & Eco-Friendly Home Decor",
      category: "Bamboo & Wood",
      badge: "🔥 Top Surge",
      image: "images/image.png",
      growth: "+18.4%",
      demandIndex: 92,
      targetSegment: "Urban Home Decor, Corporate Hampers",
      description: "High demand for eco-friendly storage baskets, natural weave lamps, and planter stands in metropolitan markets.",
      samplePrice: "₹550 – ₹950"
    },
    {
      id: "trend_terracotta",
      name: "Terracotta Diyas, Planters & Pottery",
      category: "Terracotta & Clay",
      badge: "⚡ Festive Peak",
      image: "https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?auto=format&fit=crop&w=400&q=80",
      growth: "+22.1%",
      demandIndex: 95,
      targetSegment: "Festive Shoppers, Cultural Decor Outlets",
      description: "Seasonal spike for handpainted terracotta urlis, floating candles, and traditional clay cookware.",
      samplePrice: "₹300 – ₹650"
    },
    {
      id: "trend_textiles",
      name: "Handloom Textiles & Block-Printed Fabrics",
      category: "Textiles",
      badge: "⭐ High Value",
      image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80",
      growth: "+14.8%",
      demandIndex: 88,
      targetSegment: "Ethnic Fashion Boutiques, Export Buyers",
      description: "Bagru block prints, Chanderi silk dupattas, and plant-based indigo weaves command premium prices.",
      samplePrice: "₹1,100 – ₹2,400"
    },
    {
      id: "trend_jute",
      name: "Jute Bags & Sustainable Accessories",
      category: "Jute & Fibre",
      badge: "🌱 Eco-Growth",
      image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80",
      growth: "+16.2%",
      demandIndex: 89,
      targetSegment: "Eco-conscious Retailers, Conference Gifting",
      description: "Biodegradable tote bags, embroidered jute pouches, and woven table runners.",
      samplePrice: "₹250 – ₹550"
    },
    {
      id: "trend_jewelry",
      name: "Handmade & Tribal Jewelry",
      category: "Accessories",
      badge: "✨ Popular",
      image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=400&q=80",
      growth: "+12.0%",
      demandIndex: 82,
      targetSegment: "Youth & College Demographic, Gift Outlets",
      description: "Terracotta beads, brass oxidized earrings, and lac bangles showing steady online inquiry spikes.",
      samplePrice: "₹180 – ₹450"
    },
    {
      id: "trend_woodcraft",
      name: "Wooden Handicrafts & Lacquerware",
      category: "Bamboo & Wood",
      badge: "🎨 Heritage",
      image: "images/image.png",
      growth: "+9.5%",
      demandIndex: 78,
      targetSegment: "Toy Stores, Heritage Decor Collectors",
      description: "Channapatna wooden toys, carved wooden bowls, and lacquer-finished spice boxes.",
      samplePrice: "₹400 – ₹1,200"
    },
    {
      id: "trend_hampers",
      name: "Festive Gift Hampers & Packaging",
      category: "Decor & Hampers",
      badge: "📦 High Demand",
      image: "images/image.png",
      growth: "+25.4%",
      demandIndex: 96,
      targetSegment: "Corporate Buyers, Event Planners",
      description: "Custom bamboo hampers packed with artisanal diyas, dry fruits, and handloom scarves.",
      samplePrice: "₹850 – ₹2,200"
    },
    {
      id: "trend_packaging",
      name: "Sustainable Handmade Packaging",
      category: "Eco Packaging",
      badge: "🌿 Emerging",
      image: "images/image.png",
      growth: "+15.0%",
      demandIndex: 86,
      targetSegment: "Organic Food Brands, Craft Bakeries",
      description: "Handmade paper boxes, banana fibre wraps, and recycled cloth pouches.",
      samplePrice: "₹45 – ₹150"
    }
  ],

  timeSeriesData: {
    "7": {
      labels: ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"],
      datasets: {
        all: [65, 68, 72, 75, 82, 85, 90],
        bamboo: [70, 74, 78, 82, 88, 92, 96],
        terracotta: [60, 65, 70, 76, 84, 89, 94],
        textiles: [68, 70, 71, 74, 78, 80, 85],
        decor: [72, 76, 80, 85, 90, 93, 98]
      }
    },
    "30": {
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      datasets: {
        all: [58, 67, 78, 86],
        bamboo: [62, 72, 84, 92],
        terracotta: [55, 64, 76, 95],
        textiles: [64, 70, 79, 88],
        decor: [60, 73, 85, 96]
      }
    },
    "90": {
      labels: ["Month 1", "Month 2", "Month 3"],
      datasets: {
        all: [48, 65, 86],
        bamboo: [52, 70, 92],
        terracotta: [45, 68, 95],
        textiles: [58, 72, 88],
        decor: [50, 75, 96]
      }
    }
  },

  emergingOpportunities: [
    {
      id: "opp_festive_urlis",
      title: "Festive Terracotta Urli & Diya Combos",
      category: "Terracotta & Clay",
      targetCustomers: "Urban Apartment Buyers & Festive Decor Boutiques",
      evidence: "Online search queries for handcrafted festive urlis increased by +42% ahead of upcoming celebrations.",
      suggestedPrice: "₹450 – ₹850",
      actionText: "Explore Opportunity"
    },
    {
      id: "opp_bamboo_hampers",
      title: "Eco-Friendly Bamboo Corporate Hampers",
      category: "Bamboo & Wood",
      targetCustomers: "Corporate HRs, Event Managers, Wedding Planners",
      evidence: "Corporate procurement policies prioritizing zero-plastic gifting have generated 1,200+ bulk lead inquiries.",
      suggestedPrice: "₹650 – ₹1,500",
      actionText: "Explore Opportunity"
    },
    {
      id: "opp_blockprint_dupattas",
      title: "Natural Dye Block-Printed Apparel",
      category: "Textiles",
      targetCustomers: "Boutique Retailers & International Craft Collectors",
      evidence: "Handloom Bagru & Dabu prints fetch 35% higher profit margins in metro exhibitions like Dilli Haat.",
      suggestedPrice: "₹1,200 – ₹2,500",
      actionText: "Explore Opportunity"
    },
    {
      id: "opp_jute_totes",
      title: "Custom Printed Jute Conference Totes",
      category: "Jute & Accessories",
      targetCustomers: "Institutions, Universities & Eco Outlets",
      evidence: "High repeat order rate (68%) for customized jute conference bags across Tier 1 cities.",
      suggestedPrice: "₹180 – ₹380",
      actionText: "Explore Opportunity"
    }
  ],

  aiRecommendations: [
    {
      id: "rec_1",
      title: "Focus Production on Bamboo Hampers",
      category: "Bamboo & Wood",
      reason: "Festive eco-friendly hampers yield 35% higher profit margin during upcoming artisan melas.",
      targetAudience: "Urban Home Decor & Festival Shoppers",
      suggestedAction: "Increase inventory of medium-sized woven hamper baskets.",
      btnText: "View Products",
      screen: "catalog"
    },
    {
      id: "rec_2",
      title: "Participate in Regional Haats",
      category: "Multi-Category",
      reason: "Direct physical stalls in Bhopal Haat or Dilli Haat increase artisan brand trust by 4x.",
      targetAudience: "Retail Tourists & Wholesale Agents",
      suggestedAction: "Apply for stall space in upcoming state exhibitions.",
      btnText: "Find Markets",
      screen: "markets"
    },
    {
      id: "rec_3",
      title: "Onboard Amazon Karigar & ONDC",
      category: "Digital Channels",
      reason: "Zero-rated listing support gives nationwide exposure with 0% upfront commission.",
      targetAudience: "Pan-India Online Consumers",
      suggestedAction: "Auto-sync your 3 active catalog items to ONDC network.",
      btnText: "Connect Portal",
      screen: "markets"
    }
  ],

  regionalDemand: [
    {
      region: "North India (Delhi NCR, UP, Punjab)",
      demandIndex: 94,
      trend: "High Surge",
      topCategories: ["Terracotta & Clay", "Handloom Textiles", "Zardozi Craft"],
      activeMelas: "Dilli Haat, Surajkund Crafts Mela, Urban Haat Varanasi"
    },
    {
      region: "West India (Rajasthan, Gujarat, Maharashtra)",
      demandIndex: 91,
      trend: "Steady Demand",
      topCategories: ["Block Print Textiles", "Blue Pottery", "Warli Art"],
      activeMelas: "Jawahar Kala Kendra, Kala Ghoda Mumbai, Shilpgram Jaipur"
    },
    {
      region: "South India (Karnataka, Telangana, Tamil Nadu)",
      demandIndex: 88,
      trend: "Growing Fast",
      topCategories: ["Channapatna Wooden Toys", "Bidriware", "Pochampally Ikat"],
      activeMelas: "Shilparamam Hyderabad, Chitrakala Parishath Bengaluru"
    },
    {
      region: "East & Northeast (Bengal, Odisha, Assam)",
      demandIndex: 89,
      trend: "High Demand",
      topCategories: ["Bamboo & Cane Crafts", "Kantha Stitch", "Terracotta Pottery"],
      activeMelas: "Dakshinapan Kolkata, Biswa Bangla Haat, NEDFi Guwahati"
    },
    {
      region: "Central India (Madhya Pradesh, Chhattisgarh)",
      demandIndex: 86,
      trend: "Local Peak",
      topCategories: ["Gond Tribal Painting", "Chanderi Weaving", "Jute Craft"],
      activeMelas: "Bhopal Haat, Gauhar Mahal, Mrignaynee Pavilion"
    }
  ]
};

exports.getDemandInsights = (req, res) => {
  const period = req.query.period || "30";
  const category = req.query.category || "all";

  // Filter time series data if available
  const periodData = INSIGHTS_DATA.timeSeriesData[period] || INSIGHTS_DATA.timeSeriesData["30"];

  res.json({
    ok: true,
    lastUpdated: new Date().toISOString(),
    isSimulated: true,
    period,
    category,
    data: {
      ...INSIGHTS_DATA,
      timeSeries: periodData
    }
  });
};
