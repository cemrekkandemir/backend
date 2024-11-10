const Cart = require('../Models/Cart');
const Product = require('../Models/Product');
const mongoose = require('mongoose');

// Add Product to Cart
exports.addItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    // Get userId if the user is logged in
    const userId = req.user ? req.user._id : null;

    // Get sessionId for guest users
    const sessionId = req.sessionID;

    // Data validation
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero' });
    }

    // Product stock control
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Find or create the cart specific to the user or guest
    let cart;
    if (userId) {
      // User is logged in, find cart by userId
      cart = await Cart.findOne({ userId });
      if (!cart) {
        cart = new Cart({ userId, items: [] });
      }
    } else {
      // Guest user, find cart by sessionId
      cart = await Cart.findOne({ sessionId });
      if (!cart) {
        cart = new Cart({ sessionId, items: [] });
      }
    }

    // Calculate the total quantity for the product
    const existingItemIndex = cart.items.findIndex(item => item.productId.equals(productId));
    let totalQuantity = quantity;
    if (existingItemIndex > -1) {
      totalQuantity += cart.items[existingItemIndex].quantity;
    }

    // Check if the total quantity exceeds the product stock
    if (product.stock < totalQuantity) {
      return res.status(400).json({ error: 'Insufficient stock for the total quantity' });
    }

    // Check if the product already exists in the cart
    if (existingItemIndex > -1) {
      // Increase the quantity of the existing product
      cart.items[existingItemIndex].quantity = totalQuantity;
    } else {
      // Add new product to the cart
      cart.items.push({ productId, quantity });
    }

    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ error: 'Error adding item to cart' });
  }
};

// Update the Product in the Cart
exports.updateItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    const userId = req.user ? req.user._id : null;
    const sessionId = req.sessionID;

    // Data validation
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero' });
    }

    // Product stock control
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Find the cart
    let cart;
    if (userId) {
      cart = await Cart.findOne({ userId });
    } else {
      cart = await Cart.findOne({ sessionId });
    }
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    // Check if the product exists in the cart
    const itemIndex = cart.items.findIndex(item => item.productId.equals(productId));
    if (itemIndex > -1) {
      // Update the quantity of the product
      cart.items[itemIndex].quantity = quantity;
      await cart.save();
      res.status(200).json(cart);
    } else {
      res.status(404).json({ error: 'Product not found in cart' });
    }
  } catch (error) {
    console.error('Error updating item in cart:', error);
    res.status(500).json({ error: 'Error updating item in cart' });
  }
};

// Remove Products from Cart
exports.removeItem = async (req, res) => {
  try {
    const { productId } = req.body;

    const userId = req.user ? req.user._id : null;
    const sessionId = req.sessionID;

    // Data validation
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    // Find the cart
    let cart;
    if (userId) {
      cart = await Cart.findOne({ userId });
    } else {
      cart = await Cart.findOne({ sessionId });
    }
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    // Remove the product from the cart
    const initialItemsLength = cart.items.length;
    cart.items = cart.items.filter(item => !item.productId.equals(productId));

    if (cart.items.length < initialItemsLength) {
      await cart.save();
      res.status(200).json(cart);
    } else {
      res.status(404).json({ error: 'Product not found in cart' });
    }
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ error: 'Error removing item from cart' });
  }
};

// Get Cart for the Logged-In User or Guest User
exports.viewCart = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    const sessionId = req.sessionID;

    // Find the cart based on userId or sessionId
    let cart;
    if (userId) {
      cart = await Cart.findOne({ userId }).populate('items.productId', 'name price');
    } else {
      cart = await Cart.findOne({ sessionId }).populate('items.productId', 'name price');
    }

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    res.status(200).json(cart);
  } catch (error) {
    console.error('Error viewing cart:', error);
    res.status(500).json({ error: 'Error viewing cart' });
  }
};