const mongoose = require('mongoose');

const businessProfileSchema = new mongoose.Schema({
  artisan: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  businessName: { type: String, required: true },
  craftType: { type: String, required: true }, // e.g., 'Handicraft & Bamboo Artisan'
  location: {
    city: { type: String, required: true },
    state: { type: String, required: true },
    address: { type: String }
  },
  verificationStatus: { 
    type: String, 
    enum: ['Verified Artisan', 'Pending Verification', 'Unverified'], 
    default: 'Pending Verification' 
  },
  cooperativeOrGroupId: { type: String }, // For government scheme registrations
  storefrontQRUrl: { type: String }, // Links to digital identity/catalog QR
  stats: {
    productsCount: { type: Number, default: 0 },
    ordersCount: { type: Number, default: 0 },
    leadsCount: { type: Number, default: 0 }
  },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BusinessProfile', businessProfileSchema);