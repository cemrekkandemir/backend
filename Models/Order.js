const mongoose = require('mongoose');
const refundSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
  managerNote: { type: String },
});
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      priceAtPurchase: { type: Number}, // The price at the time of purchase
      isDiscounted: { type: Boolean, default: false },
    },
  ],
  refunds: [refundSchema],
  totalAmount: { type: Number, required: true },
  orderStatus: {
    type: String,
    enum: ['processing', 'in-transit', 'delivered', 'refunded', 'canceled'],
    default: 'processing',
  },
  address: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  statusUpdatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  returnableUntil: {
    type: Date,
    default: function () {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days after
    },
  },
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;