const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  totalAmount: { type: Number, required: true },
  orderStatus: {
    type: String,
    enum: ['processing', 'in-transit', 'delivered'],
    default: 'processing'
  },
  address: { type: String, required: true }, 
  statusUpdatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  returnableUntil: {
    type: Date,
    default: function () {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 day after 
    }
  }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
