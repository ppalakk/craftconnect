const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  features: [{ type: String }],
  sellingPrice: { type: Number, required: true },
  costPrice: { type: Number, required: true },
  unitsSold: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  salesChannel: {
    type: String,
    enum: ['Online Storefront', 'Local Wholesale Market', 'Weekly Haat Co-op', 'Export Hub'],
    default: 'Online Storefront'
  },
  image: {
    url: String,
    filename: String
  },
  imageUrl: { type: String },
  arModelUrl: { type: String },
  artisanId: { type: mongoose.Schema.Types.Mixed, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

module.exports = Product;