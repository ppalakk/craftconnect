const Product = require('../models/Product');

exports.analyzeImage = async (req, res) => {
  try {
    const materials = ['Terracotta', 'Bamboo', 'Jute', 'Ceramic', 'Wood'];
    const complexityLevels = [1.2, 1.5, 1.8, 2.0];
    
    const randomMaterial = materials[Math.floor(Math.random() * materials.length)];
    const complexityMultiplier = complexityLevels[Math.floor(Math.random() * complexityLevels.length)];
    const baseMaterialCost = Math.floor(Math.random() * 200) + 50; 
    
    const costPrice = baseMaterialCost * complexityMultiplier;
    const recommendedSellingPrice = costPrice * 1.6; 
    const recommendedPriceRange = {
      min: (recommendedSellingPrice * 0.9).toFixed(2),
      max: (recommendedSellingPrice * 1.2).toFixed(2)
    };

    const analysisResult = {
      title: `Handcrafted ${randomMaterial} Artisan Piece`,
      category: `${randomMaterial} Crafts`,
      description: `A unique, sustainable piece crafted with locally sourced ${randomMaterial.toLowerCase()}. Features intricate detailing and eco-friendly materials, perfect for modern bohemian aesthetics.`,
      features: ['Eco-friendly', 'Handcrafted', 'Durable', 'Cultural Heritage'],
      materialComplexity: complexityMultiplier,
      estimatedCostPrice: costPrice.toFixed(2),
      recommendedPriceRange,
      optimalSellingPrice: recommendedSellingPrice.toFixed(2)
    };

    res.json(analysisResult);
  } catch (error) {
    console.error('Error in AI scan:', error);
    res.status(500).json({ error: 'Failed to analyze image' });
  }
};
