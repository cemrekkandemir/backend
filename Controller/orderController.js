const Order = require('../Models/Order');
const Cart = require('../Models/Cart');
const Product = require('../Models/Product');

// Place Order
exports.placeOrder = async (req, res) => {
  try {
    const { shippingInfo } = req.body;

    // Validate shippingInfo
    if (
      !shippingInfo ||
      !shippingInfo.name ||
      !shippingInfo.address ||
      !shippingInfo.city ||
      !shippingInfo.postalCode ||
      !shippingInfo.country
    ) {
      return res.status(400).json({ error: "Incomplete shipping information." });
    }

    // Find the cart for the logged-in user
    const cart = await Cart.findOne({ userId: req.user._id }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Calculate total amount and validate cart items
    let totalAmount = 0;
    for (const item of cart.items) {
      if (!item.productId || item.quantity <= 0 || item.productId.stock < item.quantity) {
        return res.status(400).json({ error: `Invalid item: ${item.productId?.name || "Unknown product"}` });
      }
      totalAmount += item.productId.price * item.quantity;

      // Reduce stock for ordered items
      item.productId.stock -= item.quantity;
      await item.productId.save();
    }

    // Create a new order
    const order = await Order.create({
      user: req.user._id,
      products: cart.items.map((item) => ({
        productId: item.productId._id,
        quantity: item.quantity,
      })),
      totalAmount,
      address: {
        name: shippingInfo.name,
        address: shippingInfo.address,
        city: shippingInfo.city,
        postalCode: shippingInfo.postalCode,
        country: shippingInfo.country,
      },
    });

    // Clear the cart after placing the order
    cart.items = [];
    await cart.save();

    res.status(201).json({ message: "Order placed successfully", orderId: order._id });
  } catch (error) {
    console.error("Order placement error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// Update Order Status
exports.updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  // Validate status
  if (!["processing", "in-transit", "delivered"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    // Find the order by ID
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Update the order status and timestamp
    order.orderStatus = status;
    order.statusUpdatedAt = Date.now();
    await order.save();

    res.status(200).json({ message: "Order status updated successfully", order });
  } catch (error) {
    console.error("Failed to update order status:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// Get Latest Order Status
exports.getLatestOrderStatus = async (req, res) => {
  try {
    const latestOrder = await Order.findOne({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("products.productId", "name price"); // Populate product details

    if (!latestOrder) {
      return res.status(404).json({ error: "No orders found for this user." });
    }

    const estimatedDelivery =
      latestOrder.orderStatus === "processing"
        ? "Within 5-7 business days"
        : latestOrder.orderStatus === "in-transit"
        ? "In transit, expected in 2-3 days"
        : "Delivered";

    res.status(200).json({
      orderId: latestOrder._id,
      status: latestOrder.orderStatus,
      estimatedDelivery,
      totalAmount: latestOrder.totalAmount,
      products: latestOrder.products.map((item) => ({
        name: item.productId.name,
        quantity: item.quantity,
        price: item.productId.price,
      })),
    });
  } catch (error) {
    console.error("Error fetching latest order status:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
exports.getAllOrders = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is missing." });
    }

    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "products.productId",
        select: "name price",
      });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: "No orders found for this user." });
    }

    const formattedOrders = orders.map((order) => ({
      orderId: order._id,
      status: order.orderStatus,
      createdAt: order.createdAt,
      estimatedDelivery:
        order.orderStatus === "processing"
          ? "Within 5-7 business days"
          : order.orderStatus === "in-transit"
          ? "In transit, expected in 2-3 days"
          : "Delivered",
      totalAmount: order.totalAmount,
      products: order.products.map((product) => ({
        name: product.productId?.name || "Unknown Product",
        quantity: product.quantity,
        price: product.productId?.price || 0,
      })),
    }));

    res.status(200).json(formattedOrders);
  } catch (error) {
    console.error("Error fetching all orders:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};