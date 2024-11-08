// kategori ,image , id , isim , stok, price , ürün bilgileri , fetchlemek için API 
//kategoriye göre çeken api , filterlayan , sorting api

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    brand: { type: String, required: true },
    stock: { type: Number, required: true },
    imageURL: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });
  
  const Product = mongoose.model('Product', productSchema);
  
  module.exports = Product;
  