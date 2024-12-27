const Order = require('../Models/Order');
const Cart = require('../Models/Cart');
const Product = require('../Models/Product');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');


// Place Order
exports.placeOrder = async (req, res) => {
  try {
    const { shippingInfo } = req.body;
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
      .populate("products.productId", "name price");

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
      products: order.products.map((product) => {
        const refund = order.refunds.find(
          (refund) =>
            refund.productId?.toString() === product.productId._id.toString()
        );

        return {
          productId: product.productId._id,
          name: product.productId.name || "Unknown Product",
          quantity: product.quantity,
          price: product.productId.price || 0,
          refundStatus: refund ? refund.status : null,
          refundDetails: refund
            ? {
                refundId: refund._id,
                status: refund.status,
                requestedAt: refund.requestedAt,
                resolvedAt: refund.resolvedAt,
                managerNote: refund.managerNote || null,
              }
            : null,
        };
      }),
    }));

    res.status(200).json(formattedOrders);
  } catch (error) {
    console.error("Error fetching all orders:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// Get All Orders (Admin View)
// getAllOrdersAdmin
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

      address: order.address ?? null,
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

// Get the Invoices as PDF 
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

// Fetch selected invoices by IDs
exports.getSelectedInvoices = async (req, res) => {
  const { invoiceIds } = req.body;

  if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
    return res.status(400).json({ error: 'Please provide a valid list of invoice IDs.' });
  }

  try {
    const invoices = await Order.find({ _id: { $in: invoiceIds } })
      .populate('user', 'name email')
      .populate('products.productId', 'name price');

    if (!invoices || invoices.length === 0) {
      return res.status(404).json({ error: 'No invoices found for the provided IDs.' });
    }

    const formattedInvoices = invoices.map((invoice) => ({
      invoiceId: invoice._id,
      userName: invoice.user?.name || 'Unknown User',
      userEmail: invoice.user?.email || 'No Email',
      totalAmount: invoice.totalAmount,
      status: invoice.orderStatus,
      createdAt: invoice.createdAt,
      products: invoice.products.map((item) => ({
        name: item.productId?.name || 'Unknown Product',
        quantity: item.quantity,
        price: item.productId?.price || 0,
      })),
    }));

    res.status(200).json(formattedInvoices);
  } catch (error) {
    console.error('Error fetching selected invoices:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Generate a PDF for selected invoices
exports.generateSelectedInvoicesPDF = async (req, res) => {
  const { invoiceIds } = req.body;

  if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
    return res.status(400).json({
      error: 'Please provide an array of invoice IDs.',
    });
  }

  try {
    const invoices = await Order.find({ _id: { $in: invoiceIds } })
      .populate('user', 'name email')
      .populate('products.productId', 'name price');

    if (!invoices || invoices.length === 0) {
      return res.status(404).json({ error: 'No invoices found for the provided IDs.' });
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="selected_invoices.pdf"');

    doc.pipe(res);

    doc.fontSize(20).text('Selected Invoices', { underline: true });
    doc.moveDown();

    invoices.forEach((invoice, index) => {
      doc.fontSize(16).text(`Invoice #${index + 1}`, { underline: true });
      doc.text(`Invoice ID: ${invoice._id}`);
      doc.text(`User: ${invoice.user?.name || 'Unknown User'} (${invoice.user?.email || 'No Email'})`);
      doc.text(`Status: ${invoice.orderStatus}`);
      doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`);
      doc.text(`Total Amount: $${invoice.totalAmount}`);
      doc.moveDown().fontSize(14).text('Products:', { underline: true });

      invoice.products.forEach((item) => {
        const productName = item.productId?.name || 'Unknown Product';
        const productPrice = item.productId?.price || 0;
        doc.text(`- ${productName}: ${item.quantity} x $${productPrice}`);
      });

      doc.moveDown(2);
    });

    doc.end();
  } catch (error) {
    console.error('Error generating selected invoices PDF:', error.message);
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

exports.getDeliveryList = async (req, res) => {
  try {
    const orders = await Order.find({ orderStatus: { $in: ['in-transit', 'delivered', 'refunded'] } })
      .select("user products totalAmount address orderStatus createdAt")
      .populate("user", "_id name email") 
      .populate("products.productId", "name price"); 
    const deliveryList = orders.map((order) => ({
      deliveryId: order._id,
      customerId: order.user?._id || "Unknown ID", 
      customerName: order.user?.name || "Unknown Customer",
      products: order.products.map((product) => ({
        productId: product.productId?._id || "Unknown ID",
        productName: product.productId?.name || "Unknown Product",
        quantity: product.quantity || 0,
      })),
      totalPrice: order.totalAmount,
      deliveryAddress: `${order.address.name}, ${order.address.address}, ${order.address.city}, ${order.address.postalCode}, ${order.address.country}`,
      status: order.orderStatus, 
    }));

    res.status(200).json(deliveryList);
  } catch (error) {
    console.error("Error fetching delivery list:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.requestRefund = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { orderId } = req.params;
    const { productId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is missing." });
    }
    if (!productId) {
      return res.status(400).json({ error: "Product ID is required." });
    }

    const order = await Order.findOne({ _id: orderId, user: userId }).populate({
      path: "products.productId",
      select: "name price ",
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (order.orderStatus !== "delivered") {
      return res.status(400).json({ error: "Refunds can only be requested for delivered orders." });
    }

    const productInOrder = order.products.find(
      (item) => item.productId && item.productId._id.toString() === productId
    );

    if (!productInOrder) {
      return res.status(400).json({ error: "Product not found in order." });
    }

    const purchaseDate = new Date(order.createdAt);
    const currentDate = new Date();
    const daysDifference = Math.ceil((currentDate - purchaseDate) / (1000 * 60 * 60 * 24));
    if (daysDifference > 30) {
      return res.status(400).json({ error: "Refund request exceeds 30-day return policy." });
    }

    const isAlreadyRequested = order.refunds.some(
      (refund) => refund.productId.toString() === productId && refund.status === "pending"
    );
    if (isAlreadyRequested) {
      return res.status(400).json({ error: "Refund already requested for this product." });
    }

    // Add refund request
    const refundRequest = {
      productId: productId,
      status: "pending",
      requestedAt: new Date(),
    };

    order.refunds.push(refundRequest);

    // Save the order with the new refund
    await order.save();

    res.status(200).json({
      message: "Refund request submitted successfully.",
      refundDetails: {
        orderId: order._id,
        productId: productId,
        productName: productInOrder.productId.name,
        quantity: productInOrder.quantity,
      },
    });
  } catch (error) {
    console.error("Refund request error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
exports.approveRefundRequest = async (req, res) => {
  try {
    const { refundId } = req.params;
    const { managerNote } = req.body;

    // Find the order containing the refund request and populate user details
    const order = await Order.findOne({ "refunds._id": refundId })
      .populate("refunds.productId", "name price") // Populate refund product details
      .populate("products.productId", "name price") // Populate order product details
      .populate("user", "name email"); // Populate user details

    if (!order) {
      return res.status(404).json({ error: "Refund request not found." });
    }

    // Find the specific refund in the order
    const refund = order.refunds.id(refundId);
    if (!refund) {
      return res.status(404).json({ error: "Refund request not found." });
    }

    // Check if the refund is already processed
    if (refund.status !== "pending") {
      return res.status(400).json({ error: "Refund is already processed." });
    }

    // Find the corresponding product in the order's products array
    const productInOrder = order.products.find(
      (product) => product.productId._id.toString() === refund.productId._id.toString()
    );

    if (!productInOrder) {
      return res.status(400).json({ error: "Product not found in the order." });
    }

    const refundQuantity = productInOrder.quantity;
    const refundAmount = refundQuantity * productInOrder.productId.price; // Use populated price from the order summary

    // Update product stock
    const product = await Product.findById(refund.productId._id);
    if (product) {
      product.stock += refundQuantity;
      await product.save();
    }

    // Update refund status
    refund.status = "approved";
    refund.resolvedAt = new Date();
    refund.managerNote = managerNote || "No note provided.";

    // Save the order with updated refund status
    await order.save();

    // Send email notification to the customer
    if (order.user && order.user.email) {
      const mailOptions = {
        from: `"Vegan Eats Shop" <${process.env.EMAIL_USER}>`,
        to: order.user.email,
        subject: "Refund Approved",
        text: `Dear ${order.user.name},\n\nYour refund request for the product "${productInOrder.productId.name}" has been approved.\n\nRefund Details:\nProduct: ${productInOrder.productId.name}\nQuantity: ${refundQuantity}\nRefund Amount: $${refundAmount.toFixed(2)}\n\nManager's Note: ${managerNote || "No additional details provided."}\n\nThank you for shopping with us.\n\nVegan Eats Team`,
        html: `
          <p>Dear <strong>${order.user.name}</strong>,</p>
          <p>Your refund request for the product <strong>${productInOrder.productId.name}</strong> has been <strong>approved</strong>.</p>
          <p><strong>Refund Details:</strong></p>
          <ul>
            <li><strong>Product:</strong> ${productInOrder.productId.name}</li>
            <li><strong>Quantity:</strong> ${refundQuantity}</li>
            <li><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)}</li>
          </ul>
          <p><strong>Manager's Note:</strong> ${managerNote || "No additional details provided."}</p>
          <p>Thank you for shopping with us.</p>
          <p><strong>Vegan Eats Team</strong></p>
        `,
      };

      await transporter.sendMail(mailOptions);
    }

    res.status(200).json({
      message: "Refund approved successfully.",
      refundDetails: {
        refundId: refund._id,
        productName: productInOrder.productId.name,
        quantity: refundQuantity,
        refundAmount,
        status: refund.status,
        resolvedAt: refund.resolvedAt,
        managerNote: refund.managerNote,
      },
    });
  } catch (error) {
    console.error("Error approving refund request:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
exports.rejectRefundRequest = async (req, res) => {
  try {
      const { refundId } = req.params;
      const { managerNote } = req.body;

     
      const order = await Order.findOne({ "refunds._id": refundId })
          .populate("refunds.productId", "name price")
          .populate("user", "name email"); 

      if (!order) {
          return res.status(404).json({ error: "Refund request not found." });
      }


      const refund = order.refunds.id(refundId);

      if (!refund) {
          return res.status(404).json({ error: "Refund request not found." });
      }


      if (refund.status !== "pending") {
          return res.status(400).json({ error: "Refund is already processed." });
      }

      
      refund.status = "rejected";
      refund.resolvedAt = new Date();
      refund.managerNote = managerNote || "No note provided.";
      await order.save();

    
      if (!order.user || !order.user.email) {
          console.error("User email not found. Cannot send notification.");
          return res.status(500).json({ error: "User email not found. Cannot send notification." });
      }

      const mailOptions = {
          from: `"Vegan Eats Shop" <${process.env.EMAIL_USER}>`,
          to: order.user.email,
          subject: "Refund Request Rejected",
          text: `Dear ${order.user.name},\n\nYour refund request for the product "${refund.productId.name}" has been rejected.\n\nManager's Note: ${managerNote || "No additional details provided."}\n\nThank you for shopping with us.`,
          html: `
              <p>Dear <strong>${order.user.name}</strong>,</p>
              <p>Your refund request for the product <strong>"${refund.productId.name}"</strong> has been <strong>rejected</strong>.</p>
              <p><strong>Manager's Note:</strong> ${managerNote || "No additional details provided."}</p>
              <p>Thank you for shopping with us.</p>
              <p>Best regards,<br><strong>Vegan Eats Team</strong></p>
          `,
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({
          message: "Refund request rejected successfully.",
          refundDetails: {
              refundId: refund._id,
              productName: refund.productId.name,
              status: refund.status,
              resolvedAt: refund.resolvedAt,
              managerNote: refund.managerNote,
          },
      });
  } catch (error) {
      console.error("Error rejecting refund request:", error.message);
      res.status(500).json({ error: "Internal Server Error" });
  }
};
exports.getAllRefundRequests = async (req, res) => {
  try {
    const ordersWithRefunds = await Order.find({ "refunds.0": { $exists: true } })
      .populate("refunds.productId", "name price")
      .populate("user", "name email");

    if (!ordersWithRefunds || ordersWithRefunds.length === 0) {
      return res.status(404).json({ message: "No refund requests found." });
    }

    const formattedRefundRequests = ordersWithRefunds.flatMap((order) =>
      order.refunds.map((refund) => ({
        refundId: refund._id,
        orderId: order._id,
        product: refund.productId ? { name: refund.productId.name, price: refund.productId.price } : null,
        user: { name: order.user.name, email: order.user.email },
        status: refund.status,
        requestedAt: refund.requestedAt,
        resolvedAt: refund.resolvedAt,
        managerNote: refund.managerNote || null,
      }))
    );

    res.status(200).json(formattedRefundRequests);
  } catch (error) {
    console.error("Error fetching all refund requests:", error.message);
    res.status(500).json({ error: "Failed to fetch refund requests." });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({ _id: orderId, user: userId, orderStatus: "processing" });

    if (!order) {
      return res.status(404).json({ error: "Order not found or not cancellable." });
    }

    for (const product of order.products) {
      const productDoc = await Product.findById(product.productId);
      if (productDoc) {
        productDoc.stock += product.quantity;
        await productDoc.save();
      }
    }

    order.orderStatus = "canceled";
    await order.save();

    res.status(200).json({ message: "Order canceled successfully." });
  } catch (error) {
    console.error("Error canceling order:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

 