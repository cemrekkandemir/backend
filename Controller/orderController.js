const Order = require('../Models/Order');
const Cart = require('../Models/Cart');
const Product = require('../Models/Product');
const PDFDocument = require('pdfkit'); // Make sure pdfkit is installed: npm install pdfkit

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

// Get All Orders for the authenticated user
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

// Get All Orders (Admin View)
exports.getAllOrdersAdmin = async (req, res) => {
  try {
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .populate({
        path: "products.productId",
        select: "name price",
      });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: "No orders found." });
    }

    const formattedOrders = orders.map((order) => ({
      orderId: order._id,
      user: order.user,
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
    console.error("Error fetching all orders (admin):", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get invoices within a given date range
exports.getInvoicesByDateRange = async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      error: 'Please provide startDate and endDate query parameters (YYYY-MM-DD format)',
    });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      createdAt: {
        $gte: start,
        $lte: end,
      },
    })
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('products.productId', 'name price');

    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: 'No invoices found in the given date range.' });
    }

    const formattedInvoices = orders.map((order) => ({
      invoiceId: order._id,
      userName: order.user?.name || 'Unknown User',
      userEmail: order.user?.email || 'No Email',
      totalAmount: order.totalAmount,
      status: order.orderStatus,
      createdAt: order.createdAt,
      products: order.products.map((item) => ({
        name: item.productId?.name || 'Unknown Product',
        quantity: item.quantity,
        price: item.productId?.price || 0,
      })),
    }));

    res.status(200).json(formattedInvoices);
  } catch (error) {
    console.error('Error fetching invoices by date range:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get Invoices PDF within a given date range
exports.getInvoicesPDFByDateRange = async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      error: 'Please provide startDate and endDate query parameters (YYYY-MM-DD format)',
    });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
    })
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('products.productId', 'name price');

    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: 'No invoices found in the given date range.' });
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoices_${startDate}_to_${endDate}.pdf"`);

    doc.pipe(res);

    doc.fontSize(20).text(`Invoices from ${startDate} to ${endDate}`, { underline: true });
    doc.moveDown();

    orders.forEach((order, index) => {
      doc.fontSize(16).text(`Invoice #${index + 1}`, { underline: true });
      doc.text(`Invoice ID: ${order._id}`);
      doc.text(`User: ${order.user?.name || 'Unknown User'} (${order.user?.email || 'No Email'})`);
      doc.text(`Status: ${order.orderStatus}`);
      doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
      doc.text(`Total Amount: $${order.totalAmount}`);
      doc.moveDown().fontSize(14).text('Products:', { underline: true });

      order.products.forEach((item) => {
        const productName = item.productId?.name || 'Unknown Product';
        const productPrice = item.productId?.price || 0;
        doc.text(`- ${productName}: ${item.quantity} x $${productPrice}`);
      });

      doc.moveDown(2);
    });

    doc.end();
  } catch (error) {
    console.error('Error generating invoices PDF by date range:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get Revenue and Profit/Loss
exports.getRevenueAndProfitLoss = async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: "Start and end dates are required" });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    let totalRevenue = 0;
    let totalProfit = 0;
    let totalLoss = 0;

    // For simplicity, cost assumed at 70% of totalAmount
    orders.forEach((order) => {
      totalRevenue += order.totalAmount;
      const cost = order.totalAmount * 0.7;
      const profit = order.totalAmount - cost;
      if (profit > 0) {
        totalProfit += profit;
      } else {
        totalLoss += Math.abs(profit);
      }
    });

    const responseData = {
      labels: ["Revenue", "Profit", "Loss"],
      revenue: [totalRevenue],
      profit: [totalProfit],
      loss: [totalLoss],
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Failed to calculate revenue:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};
