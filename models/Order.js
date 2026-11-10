const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    artisanId: { type: mongoose.Schema.Types.Mixed, ref: "User", default: null },
    artisanEmail: { type: String, lowercase: true, trim: true, default: "sita@artisan.com" },
    buyer: {
      name: { type: String, required: true },
      location: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
    },
    item: { type: String, required: true },
    productId: { type: String, default: "" },
    productImage: { type: String, default: "" },
    qty: { type: Number, default: 1 },
    amount: { type: Number, required: true },
    date: {
      type: String,
      default: () => new Date().toISOString().slice(0, 10),
    },
    status: {
      type: String,
      enum: ["pending", "dispatched", "delivered", "cancelled"],
      default: "pending",
    },
    shippingAddress: { type: String, default: "" },
    paymentStatus: { type: String, default: "paid" },
    dispatchedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

module.exports = Order;

