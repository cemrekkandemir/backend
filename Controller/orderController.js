const Order = require('../Models/Order');
const Cart = require('../Models/Cart');
const Product = require('../Models/Product');

// Place Order
exports.placeOrder = async (req, res) => {
  try {
    console.log("User making the request:", req.user);

    // Find user cart
    const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
    console.log("Cart found:", cart);

    if (!cart || cart.items.length === 0) {
      console.log("Cart is empty or not found");
      return res.status(400).json({ error: 'Your cart is empty' });
    }

    // Order creation operations
    let totalAmount = 0;

    for (const item of cart.items) {
      const product = item.productId;
      console.log("Processing product:", product);

      if (!product || product.stock < item.quantity) {
        console.log("Insufficient stock for product:", product.name);
        return res.status(400).json({
          error: `Insufficient stock for product: ${product.name}`,
        });
      }

      // Stock update
      product.stock -= item.quantity;
      await product.save();
      totalAmount += product.price * item.quantity;
    }

    const order = new Order({
      user: req.user._id,
      products: cart.items.map(item => item.productId._id),
      totalAmount,
      address: req.user.address,
    });

    await order.save();

    cart.items = [];
    await cart.save();

    console.log("Order placed successfully:", order);
    res.status(201).json({ message: 'Order placed successfully', orderId: order._id });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update Order Status
exports.updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  if (!['processing', 'in-transit', 'delivered'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.orderStatus = status;
    order.statusUpdatedAt = Date.now();
    await order.save();

    res.status(200).json({ message: 'Order status updated successfully', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

