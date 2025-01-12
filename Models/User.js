const mongoose = require('mongoose');


// Helper function to generate random tax ID
function generateTaxId() {
  // Generate a 10-digit random number
  const randomNum = Math.floor(Math.random() * 9000000000) + 1000000000;
  return `T${randomNum}`;
}

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  taxid: {
    type: String,
    default: generateTaxId,
    unique: true,
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
