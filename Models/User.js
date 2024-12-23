const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['customer', 'product_manager', 'sales_manager', 'admin'],
    default: 'customer',
  },
  address: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  wishlist: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }
  ],
});

const User = mongoose.model('User', userSchema);
module.exports = User;
