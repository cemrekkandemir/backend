const mongoose = require('mongoose');


const feedbackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String },
  rating: { type: Number, required: true, min: 1, max: 5 }, // Rating is required
  isVisible: { type: Boolean, default: false }, // Visibility flag for comments only
  createdAt: { type: Date, default: Date.now },
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  brand: { type: String, required: true },
  stock: { type: Number, required: true },
  imageURL: { type: String, required: true },
  feedback: [feedbackSchema], // Renamed for ratings + comments
  averageRating: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
