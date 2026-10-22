const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  bulkPrice: { type: Number, required: true }, 
  unit: { type: String, required: true }, 
  availableQuantity: { type: Number, required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coOpLocation: { type: String }, 
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);
