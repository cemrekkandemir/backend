// controllers/orderController.js

const Order = require('../Models/Order');
const Cart = require('../Models/Cart');
const User = require('../Models/User');

exports.placeOrder = async (req, res) => {
  try {
    // Ensure the user is logged in
    const userId = req.user._id;
    console.log('User making the request:', req.user);

    // Find the user's cart
    const cart = await Cart.findOne({ userId }).populate('items.productId');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty' });
    }

    // Prepare order products and calculate total amount
    let totalAmount = 0;
    const orderedProductIds = [];

    for (const item of cart.items) {
      const product = item.productId;

      // Check if product exists
      if (!product) {
        return res.status(404).json({ error: `Product not found in cart` });
      }

      // Check stock availability
      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for product ${product.name}`,
        });
      }

      // Decrease product stock
      product.stock -= item.quantity;
      await product.save();

      // Calculate total amount
      totalAmount += product.price * item.quantity;

      // Collect product IDs
      orderedProductIds.push(product._id);
    }

    // Get user's address
    const user = await User.findById(userId);

    // Create new order
    const newOrder = new Order({
      user: userId,
      products: orderedProductIds,
      totalAmount,
      address: user.address, // Assuming address is stored as a string in User model
      // orderStatus will default to 'processing'
      // statusUpdatedAt and createdAt are set by default
    });

    await newOrder.save();

    // Clear user's cart
    cart.items = [];
    await cart.save();

    res.status(201).json({
      message: 'Order placed successfully',
      orderId: newOrder._id,
    });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
