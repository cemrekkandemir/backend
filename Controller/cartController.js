const Cart = require('../Models/Cart');
const Product = require('../Models/Product');
const mongoose = require('mongoose');

// Helper function: Find or create a cart
const findOrCreateCart = async (userId, guestId) => {
  let cart;

  if (userId) {
    cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
      await cart.save();
    }
  } else if (guestId) {
    cart = await Cart.findOne({ guestId });
    if (!cart) {
      cart = new Cart({ guestId, items: [] });
      await cart.save();
    }
  }

  return cart;
};

// **1. Ürün ekleme**
exports.addItem = async (req, res) => {
  console.log('req.user in addItem:', req.user);
  try {
    const { productId, quantity } = req.body;
    const userId = req.user?._id || null; // Giriş yapan kullanıcı
    const guestId = req.sessionID; // Misafir kullanıcı

    const cart = await findOrCreateCart(userId, guestId);
    const product = await Product.findById(productId);

    if (!product || product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock or product not found' });
    }

    // Sepette ürün varsa miktarı artır
    const existingItem = cart.items.find(item => item.productId.equals(productId));
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ productId, quantity });
    }

    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ error: 'Error adding item to cart' });
  }
};

// **2. Ürün güncelleme**
// **2. Ürün güncelleme**
exports.updateItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user?._id || null; // Giriş yapan kullanıcı
    const guestId = req.sessionID; // Misafir kullanıcı

    console.log("=== Incoming Update Request ===");
    console.log("Incoming productId:", productId);
    console.log("Incoming quantity:", quantity);
    console.log("Session ID (guestId):", guestId);
    console.log("User ID:", userId);

    // Sepeti bulun veya oluşturun
    const cart = await findOrCreateCart(userId, guestId);

    console.log("Cart found:", cart);
    console.log("Cart items before update:", cart.items);

    // Sepette ürünü bulun
    const itemIndex = cart.items.findIndex(item =>
      item.productId.toHexString() === productId
    );

    console.log("Item index in cart:", itemIndex);

    if (itemIndex > -1) {
      // Eğer miktar 0 ise ürünü kaldır
      if (quantity === 0) {
        console.log("Removing item from cart:", productId);
        cart.items.splice(itemIndex, 1);
      } else {
        // Stoğu kontrol et
        const product = await Product.findById(productId);
        if (!product || product.stock < quantity) {
          console.log("Insufficient stock or product not found for:", product);
          return res.status(400).json({ error: 'Insufficient stock or product not found' });
        }

        // Ürünün miktarını güncelle
        cart.items[itemIndex].quantity = quantity;
        console.log("Updated item quantity:", cart.items[itemIndex]);
      }

      // Sepeti kaydet
      await cart.save();
      console.log("Cart updated successfully:", cart);
      res.status(200).json(cart);
    } else {
      console.log("Product not found in cart:", productId);
      res.status(404).json({ error: 'Product not found in the cart' });
    }
  } catch (error) {
    console.error('Error updating product in the cart:', error);
    res.status(500).json({ error: 'Error updating product in the cart' });
  }
};


// **3. Ürün çıkarma**
exports.removeItem = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user?._id || null;
    const guestId = req.sessionID;

    const cart = await findOrCreateCart(userId, guestId);
    const initialLength = cart.items.length;

    cart.items = cart.items.filter(item => !item.productId.equals(productId));

    if (cart.items.length < initialLength) {
      await cart.save();
      res.status(200).json(cart);
    } else {
      res.status(404).json({ error: 'Product not found in the cart' });
    }
  } catch (error) {
    console.error('Error removing product from the cart:', error);
    res.status(500).json({ error: 'Error removing product from the cart' });
  }
};

// **4. Sepeti görüntüleme**
exports.viewCart = async (req, res) => {
  try {
    const userId = req.user?._id || null;
    const guestId = req.sessionID;

    const cart = await findOrCreateCart(userId, guestId);
    await cart.populate('items.productId', 'name price stock'); // Ürün bilgilerini doldur
    res.status(200).json(cart);
  } catch (error) {
    console.error('Error viewing cart:', error);
    res.status(500).json({ error: 'Error viewing cart' });
  }
};