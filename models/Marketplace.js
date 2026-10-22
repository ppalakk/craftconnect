const mongoose = require('mongoose');

const marketplaceSchema = new mongoose.Schema({
  buyerName: { type: String, required: true },
  inquiryDetails: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Completed'], default: 'Pending' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Marketplace', marketplaceSchema);