const Product = require('../models/Product');

exports.getDashboard = async (req, res) => {
  try {
    const artisanId = (req.user && req.user._id) || (req.session && req.session.user && req.session.user.id);
    const query = artisanId ? { artisanId } : {};
    const products = await Product.find(query);

    let grossRevenue = 0;
    let totalCost = 0;
    const channelDistribution = {
      'Online Storefront': 0,
      'Local Wholesale Market': 0,
      'Weekly Haat Co-op': 0,
      'Export Hub': 0
    };
    
    const productMetrics = products.map(p => {
      const revenue = p.sellingPrice * p.unitsSold;
      const cost = p.costPrice * p.unitsSold;
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      grossRevenue += revenue;
      totalCost += cost;
      
      if (p.unitsSold > 0 && channelDistribution[p.salesChannel] !== undefined) {
        channelDistribution[p.salesChannel] += p.unitsSold;
      }

      return {
        title: p.title,
        unitsSold: p.unitsSold,
        sellingPrice: p.sellingPrice,
        costPrice: p.costPrice,
        profit,
        margin: margin.toFixed(2)
      };
    });

    const netProfit = grossRevenue - totalCost;
    const overallMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    res.render('finance', {
      grossRevenue,
      totalCost,
      netProfit,
      overallMargin: overallMargin.toFixed(2),
      productMetrics,
      channelDistribution
    });

  } catch (error) {
    console.error('Error fetching finance data:', error);
    res.status(500).send('Server Error');
  }
};
