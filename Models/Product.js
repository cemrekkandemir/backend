const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  text: { type: String, required: true },
  isVisible: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const ratingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now },
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number},
  discountPercentage: { type: Number, default: 0 },
  category: { type: String, default: "Uncategorized" },
  brand: { type: String, required: true },
  stock: { type: Number, required: true },
  imageURL: { type: String, required: true},
  comments: [commentSchema],
  ratings: [ratingSchema],
  averageRating: { type: Number, default: 0 },
  popularity: { type: Number, default: 0 }, 
  expirationDate: { type: Date, default: null },
  distributor: { type: String, default: null },
  serialNumber: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;