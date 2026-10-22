// Expense.js example
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  artisan: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String }, // e.g., 'Raw Materials', 'Packaging'
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Expense', expenseSchema);