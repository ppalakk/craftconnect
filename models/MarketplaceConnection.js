const mongoose = require('mongoose');

const marketplaceConnectionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  platformId: { type: String, required: true, index: true },
  platformName: { type: String, required: true },
  status: {
    type: String,
    enum: ['not_started', 'external_registration', 'awaiting_approval', 'connected', 'expired', 'error'],
    default: 'not_started'
  },
  merchantId: { type: String, default: null },
  sellerStoreName: { type: String, default: null },
  apiConfig: {
    isAuthorized: { type: Boolean, default: false },
    clientId: { type: String, default: null },
    lastSyncAt: { type: Date, default: null }
  },
  onboardingNotes: { type: String, default: "" },
  updatedAt: { type: Date, default: Date.now }
});

marketplaceConnectionSchema.index({ userId: 1, platformId: 1 }, { unique: true });

module.exports = mongoose.model('MarketplaceConnection', marketplaceConnectionSchema);
