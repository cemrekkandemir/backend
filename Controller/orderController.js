const Order = require('../Models/Order');
const Cart = require('../Models/Cart');
const Product = require('../Models/Product');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');


// Place Order
exports.placeOrder = async (req, res) => {
  try {
    const { shippingInfo } = req.body;

    // Validate shipping info
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

    // Initialize total amount and prepare products for order
    let totalAmount = 0;
    const productsForOrder = [];

    for (const item of cart.items) {
      const product = item.productId;

      // Validate product details
      if (!product || item.quantity <= 0 || product.stock < item.quantity) {
        return res.status(400).json({ error: `Invalid item: ${product?.name || "Unknown product"}` });
      }

      // Determine price at the time of purchase
      const priceAtPurchase = product.price; // Ensure we always use the current price, whether discounted or not

      // Add to total amount
      totalAmount += priceAtPurchase * item.quantity;

      // Deduct stock
      product.stock -= item.quantity;
      await product.save();

      // Add product details to the order
      productsForOrder.push({
        productId: product._id,
        quantity: item.quantity,
        priceAtPurchase, // Store the price at purchase
        isDiscounted: product.discountPercentage > 0,
      });
    }

    // Create the order with product and user details
    const order = await Order.create({
      user: req.user._id,
      products: productsForOrder,
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

    // Respond to the user
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

  if (!['processing', 'in-transit', 'delivered', 'refunded', 'canceled'].includes(status)) {
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
        : latestOrder.orderStatus === "refunded"
        ? "Refunded"
        : "Delivered";

    res.status(200).json({
      orderId: latestOrder._id,
      status: latestOrder.orderStatus,
      estimatedDelivery,
      totalAmount: latestOrder.totalAmount,
      products: latestOrder.products.map((item) => ({
        name: item.productId.name,
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
        isDiscounted: item.isDiscounted,
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

    // Fetch orders for the user, sorted by creation date
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "products.productId",
        select: "name price originalPrice discountPercentage",
      });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: "No orders found for this user." });
    }

    // Format the orders to include the properly structured address
    const formattedOrders = orders.map((order) => ({
      orderId: order._id,
      status: order.orderStatus,
      createdAt: order.createdAt,
      estimatedDelivery:
        order.orderStatus === "processing"
          ? "Within 5-7 business days"
          : order.orderStatus === "in-transit"
          ? "In transit, expected in 2-3 days"
          : order.orderStatus === "refunded"
          ? "Refunded"
          : "Delivered",
      totalAmount: order.totalAmount,
      address: {
        name: order.address?.name || "N/A",
        street: order.address?.address || "N/A", // Map the `address` field correctly
        city: order.address?.city || "N/A",
        postalCode: order.address?.postalCode || "N/A",
        country: order.address?.country || "N/A",
      },
      products: order.products.map((product) => {
        // Find any refund associated with this product
        const refund = order.refunds?.find(
          (refund) =>
            refund.productId?.toString() === product.productId._id.toString()
        );

        // Determine if the product is returnable (30 days after delivery date)
        const isReturnable =
          order.orderStatus === "delivered" &&
          new Date() <=
            new Date(new Date(order.statusUpdatedAt).getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from delivery

        return {
          productId: product.productId._id,
          name: product.productId.name || "Unknown Product",
          quantity: product.quantity,
          priceAtPurchase: product.priceAtPurchase || product.productId.price, // Use priceAtPurchase
          isDiscounted: product.isDiscounted,
          refundStatus: refund ? refund.status : null,
          isReturnable, // Add isReturnable field
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
          : order.orderStatus === "refunded"
          ? "Refunded"
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
      .populate('products.productId', 'name priceAtPurchase');

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
        priceAtPurchase: item.priceAtPurchase || 0, // Use price at the time of purchase
        isDiscounted: item.isDiscounted, // Show if the product was discounted
      })),
    }));

    res.status(200).json(formattedInvoices);
  } catch (error) {
    console.error('Error fetching invoices by date range:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

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
      .populate('products.productId', 'name priceAtPurchase');

    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: 'No invoices found in the given date range.' });
    }

    // Use default font (no custom font registration)
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoices_${startDate}_to_${endDate}.pdf"`
    );

    doc.pipe(res);

    // Main heading
    doc
      .fontSize(20)
      .text(`Invoices from ${startDate} to ${endDate}`, {
        underline: true,
        align: 'center',
      })
      .moveDown(1);

    // Draw a horizontal line across the page
    doc
      .moveTo(doc.x, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();

    doc.moveDown(2);

    // Loop through the orders and produce stylized output
    orders.forEach((order, index) => {
      // Subheading for each invoice
      doc
        .fontSize(16)
        .text(`Invoice #${index + 1}`, { underline: true });

      // Display basic order info
      doc.fontSize(12);
      doc.text(`Invoice ID: ${order._id}`);
      doc.text(`User: ${order.user?.name || 'Unknown User'} <${order.user?.email || 'No Email'}>`);
      doc.text(`Status: ${order.orderStatus}`);
      doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
      doc.text(`Total Amount: $${order.totalAmount}`);

      doc.moveDown(1);

      // Section heading for products
      doc.fontSize(13).text('Products:', { underline: true });
      doc.fontSize(12);

      // Indent each product line
      order.products.forEach((item) => {
        const productName = item.productId?.name || 'Unknown Product';
        const priceAtPurchase = item.priceAtPurchase || 0;
        doc.text(`- ${productName} : ${item.quantity} x $${priceAtPurchase}`, { indent: 20 });
      });

      doc.moveDown(1);

      // Draw a dashed line for separation
      doc
        .moveTo(doc.x, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .dash(2, { space: 2 })
        .stroke()
        .undash();

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
        name: item.productId?.name || "Unknown Product",
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase || 0, // Use price at the time of purchase
        isDiscounted: item.isDiscounted, // Show if the product was discounted
        originalPrice: item.productId?.originalPrice || item.priceAtPurchase, // Include original price
        discountPercentage: item.productId?.discountPercentage || 0, // Include discount percentage
      })),
    }));

    res.status(200).json(formattedInvoices);
  } catch (error) {
    console.error('Error fetching selected invoices:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

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
      .populate('products.productId', 'name priceAtPurchase');

    if (!invoices || invoices.length === 0) {
      return res.status(404).json({ error: 'No invoices found for the provided IDs.' });
    }

    // Create the PDF doc with some margin
    const doc = new PDFDocument({ margin: 50 });

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="selected_invoices.pdf"');

    doc.pipe(res);

    // Big Title (optional) on the *first* page
    doc
      .fontSize(20)
      .text('Vegan Eats - Invoices', { underline: true, align: 'center' })
      .moveDown(1);

    // Horizontal line (just once at the top)
    doc
      .lineWidth(2)
      .moveTo(doc.x, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();

    doc.moveDown(2);

    // For centering the table/boxes
    const tableWidth = 500;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const startX = doc.x + (pageWidth - tableWidth) / 2;

    // Add this small left padding:
    const leftPadding = 15;

    invoices.forEach((invoice, idx) => {
      // ——————————— PAGE PER INVOICE ———————————
      if (idx > 0) {
        doc.addPage();
      }

      // 1) Capture the topY
      const invoiceTopY = doc.y;

      // === [ Heading Box ] ===
      doc
        .rect(startX, doc.y, tableWidth, 40)
        .fill('#F0F0F0'); // light-gray background

      const boxY = doc.y;

      // Make sure text is offset inside the box:
      doc
        .fillColor('#000')
        .fontSize(14)
        .text(`Invoice #${idx + 1}`, startX + leftPadding, boxY + 10);

      doc
        .fontSize(10)
        .fillColor('#333')
        .text(`Invoice ID: ${invoice._id}`, startX + tableWidth - 140, boxY + 10, {
          width: 130,
          align: 'right',
        });

      // Thin line under heading text
      doc
        .moveTo(startX, boxY + 35)
        .lineTo(startX + tableWidth, boxY + 35)
        .lineWidth(0.5)
        .strokeColor('#AAA')
        .stroke();

      // Move below box
      doc.y = boxY + 45;
      doc.moveDown(1);

      // Basic info
      const userName = invoice.user?.name || 'Unknown User';
      const userEmail = invoice.user?.email || 'No Email';
      const invoiceDate = new Date(invoice.createdAt).toLocaleDateString();
      const total = invoice.totalAmount?.toFixed(2) || '0.00';

      // Use `startX + leftPadding` everywhere we place text in this rectangle
      doc.fontSize(12).fillColor('#000');
      doc.text(`User: ${userName}  <${userEmail}>`, startX + leftPadding, doc.y, { width: tableWidth });
      doc.text(`Date: ${invoiceDate}`, startX + leftPadding, doc.y + 15, { width: tableWidth });
      doc.text(`Status: ${invoice.orderStatus}`, startX + leftPadding, doc.y + 30, { width: tableWidth });
      doc.text(`Total Amount: $${total}`, startX + leftPadding, doc.y + 45, { width: tableWidth });
      doc.moveDown(4);

      // Separator line
      doc
        .moveTo(startX, doc.y)
        .lineTo(startX + tableWidth, doc.y)
        .lineWidth(1)
        .strokeColor('#DDD')
        .stroke();

      doc.moveDown(1);

      // Products heading
      doc.fontSize(13).text('Products', startX + leftPadding, doc.y, { width: tableWidth });
      doc.moveDown(0.5);

      // Adjust columns to include leftPadding
      doc.fontSize(10);
      const col1 = startX + leftPadding;
      const col2 = col1 + 220;
      const col3 = col2 + 80;
      const col4 = col3 + 60;

      const headingY = doc.y;
      doc.text('Product Name', col1, headingY, { width: 200 });
      doc.text('Quantity', col2, headingY, { width: 40, align: 'center' });
      doc.text('Price', col3, headingY, { width: 60, align: 'center' });
      doc.text('Subtotal', col4, headingY, { width: 60, align: 'center' });

      doc
        .moveTo(col1, headingY + 12)
        .lineTo(startX + tableWidth, headingY + 12)
        .strokeColor('#BBB')
        .stroke();

      // Each product line
      invoice.products.forEach((item) => {
        doc.moveDown(0.3);
        const rowY = doc.y;
        const productName = item.productId?.name || 'Unknown Product';
        const quantity = item.quantity || 0;
        const price = item.priceAtPurchase || 0;
        const subtotal = (price * quantity).toFixed(2);

        doc.text(productName, col1, rowY, { width: 200 });
        doc.text(quantity, col2, rowY, { width: 40, align: 'center' });
        doc.text(`$${price.toFixed(2)}`, col3, rowY, { width: 60, align: 'center' });
        doc.text(`$${subtotal}`, col4, rowY, { width: 60, align: 'center' });
      });

      doc.moveDown(2);

      // Dashed line to separate or finalize invoice content
      doc
        .moveTo(startX, doc.y)
        .lineTo(startX + tableWidth, doc.y)
        .dash(3, { space: 3 })
        .strokeColor('#999')
        .stroke()
        .undash();

      doc.moveDown(2);

      // 2) Bounding rectangle from invoiceTopY to doc.y
      const invoiceHeight = doc.y - invoiceTopY;
      doc
        .lineWidth(1)
        .strokeColor('#AAA')
        .rect(startX, invoiceTopY, tableWidth, invoiceHeight)
        .stroke();
    });

    doc.end();
  } catch (error) {
    console.error('Error generating styled invoices (separate pages + bounding box):', error.message);
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
    })
      .populate("refunds.productId", "name")
      .populate("products.productId", "name priceAtPurchase originalPrice")
      .populate("user", "name email");

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let totalLoss = 0;
    const productDistribution = {};

    console.log(`Calculating revenue and cost for orders from ${start} to ${end}`);

    orders.forEach((order) => {
      let orderRevenue = 0;
      let orderCost = 0;

      console.log(`Processing Order ID: ${order._id}, Status: ${order.orderStatus}`);

      if (order.orderStatus === "refunded") {
        console.log(`Order ID: ${order._id} is fully refunded. Only delivery cost is retained.`);
        const deliveryCost = 30;
        orderCost += deliveryCost; 
        orderRevenue += deliveryCost; 
        totalRevenue += orderRevenue;
        totalCost += orderCost;
        return; 
      }

      
      if (order.orderStatus === "canceled") {
        console.log(`Order ID: ${order._id} is canceled. Skipping.`);
        return;
      }

      order.products.forEach((product) => {
        if (!product.productId) {
          console.warn("Product data is missing for a product in order:", order._id);
          return; 
        }

        const { originalPrice, priceAtPurchase, name } = product.productId;
        const effectivePrice = priceAtPurchase || originalPrice || 0;

        const revenue = effectivePrice * product.quantity;
        const cost = (originalPrice ? originalPrice * 0.5 : effectivePrice * 0.5) * product.quantity;

        const isRefunded = order.refunds?.some(
          (refund) => refund.productId.toString() === product.productId._id.toString() && refund.status === "approved"
        );

        if (isRefunded) {
          console.log(`  Product: ${name || "Unknown"} is refunded. Adjusting totals.`);
          orderRevenue -= revenue;
          orderCost -= cost;
        } else {
          orderRevenue += revenue;
          orderCost += cost;
        }

        const productName = name || "Unknown Product";
        productDistribution[productName] = (productDistribution[productName] || 0) + product.quantity;

        console.log(`  Product: ${name || "Unknown"} - Quantity: ${product.quantity}`);
        console.log(`    Original Price: ${originalPrice || "N/A"}`);
        console.log(`    Price at Purchase: ${priceAtPurchase || "N/A"}`);
        console.log(`    Calculated Revenue: ${revenue}`);
        console.log(`    Calculated Cost: ${cost}`);
      });

      const deliveryCost = 30;
      orderCost += deliveryCost;
      orderRevenue += deliveryCost;
      console.log(`Order ID: ${order._id} - Revenue: ${orderRevenue}, Cost: ${orderCost}`);

      totalRevenue += orderRevenue;
      totalCost += orderCost;
    });
    const netProfitLoss = totalRevenue - totalCost;
    if (netProfitLoss > 0) {
      totalProfit = netProfitLoss;
    } else {
      totalLoss = Math.abs(netProfitLoss);
    }

    console.log(`Overall Totals: Revenue: ${totalRevenue}, Cost: ${totalCost}, Profit: ${totalProfit}, Loss: ${totalLoss}`);

    const responseData = {
      labels: ["Revenue", "Profit", "Loss"],
      revenue: [totalRevenue],
      profit: [totalProfit],
      loss: [totalLoss],
      productDistribution,
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error calculating revenue and profit/loss:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
exports.getProductDistribution = async (req, res) => {
  try {
    const { category } = req.query;

    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }

    // Fetch all orders with products belonging to the specified category
    const orders = await Order.find()
      .populate({
        path: "products.productId",
        select: "name category",
      })
      .lean();

    const distribution = {};

    orders.forEach((order) => {
      order.products.forEach((product) => {
        const productData = product.productId;

        if (productData && productData.category === category) {
          const productName = productData.name || "Unknown Product";
          distribution[productName] = (distribution[productName] || 0) + product.quantity;
        }
      });
    });

    return res.status(200).json(distribution);
  } catch (error) {
    console.error("Error fetching product distribution:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


exports.getDeliveryList = async (req, res) => {
  try {

    const orders = await Order.find({ orderStatus: { $in: ['processing', 'in-transit', 'delivered', 'refunded'] } })
      .select("user products totalAmount address orderStatus refunds createdAt")
      .populate("user", "_id name email") 
      .populate("products.productId", "name price"); 
    
    const deliveryList = orders.map((order) => ({
      deliveryId: order._id,
      customerId: order.user?._id || "Unknown ID", 
      customerName: order.user?.name || "Unknown Customer",
      products: order.products.map((product) => {

        const refundItem = order.refunds.find(refund => 
          refund.productId.equals(product.productId?._id)
        );
        const refundStatus = refundItem ? refundItem.status : "No";
        
        return {
          productId: product.productId?._id || "Unknown ID",
          productName: product.productId?.name || "Unknown Product",
          quantity: product.quantity || 0,
          refundStatus: refundStatus,  
        };
      }),
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
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, 
  auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
  },
});
exports.approveRefundRequest = async (req, res) => {
  try {
    const { refundId } = req.params;
    const { managerNote } = req.body;

    // Find the order containing the refund request and populate details
    const order = await Order.findOne({ "refunds._id": refundId })
      .populate("refunds.productId", "name")
      .populate("products.productId", "name priceAtPurchase")
      .populate("user", "name email");

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

    // Find the corresponding product in the order
    const productInOrder = order.products.find(
      (product) => product.productId._id.toString() === refund.productId._id.toString()
    );

    if (!productInOrder) {
      return res.status(400).json({ error: "Product not found in the order." });
    }

    const refundQuantity = productInOrder.quantity;
    const refundAmount = refundQuantity * productInOrder.priceAtPurchase; 


    const product = await Product.findById(refund.productId._id);
    if (product) {
      product.stock += refundQuantity; 
      await product.save();
    }

    refund.status = "approved";
    refund.resolvedAt = new Date();
    refund.managerNote = managerNote || "No additional details provided.";
    order.totalAmount -= refundAmount;


      // Check if all products in the order have approved refunds
        const allProductsRefunded = order.products.every(product => {
          const refundForProduct = order.refunds.find(
            r => r.productId.toString() === product.productId._id.toString()
          );
          return refundForProduct && refundForProduct.status === 'approved';
        });
    
        // Update order status if all products are refunded
        if (allProductsRefunded) {
          order.orderStatus = 'refunded';
          order.statusUpdatedAt = new Date();
        }

    
    await order.save();

    if (order.user && order.user.email) {
      const mailOptions = {
        from: `"Vegan Eats Shop" <${process.env.EMAIL_USER}>`,
        to: order.user.email,
        subject: "Refund Approved",
        text: `Dear ${order.user.name},\n\nYour refund request for the product "${productInOrder.productId.name}" has been approved.\n\nRefund Details:\nProduct: ${productInOrder.productId.name}\nQuantity: ${refundQuantity}\nRefund Amount: $${refundAmount.toFixed(
          2
        )}\n\nManager's Note: ${
          managerNote || "No additional details provided."
        }\n\nThank you for shopping with us.\n\nVegan Eats Team`,
        html: `
          <p>Dear <strong>${order.user.name}</strong>,</p>
          <p>Your refund request for the product <strong>${productInOrder.productId.name}</strong> has been <strong>approved</strong>.</p>
          <p><strong>Refund Details:</strong></p>
          <ul>
            <li><strong>Product:</strong> ${productInOrder.productId.name}</li>
            <li><strong>Quantity:</strong> ${refundQuantity}</li>
            <li><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)}</li>
          </ul>
          <p><strong>Manager's Note:</strong> ${
            managerNote || "No additional details provided."
          }</p>
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
        updatedTotalAmount: order.totalAmount,
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
      .populate("refunds.productId", "name")
      .populate("products.productId", "name priceAtPurchase") 
      .populate("user", "name email");

    if (!ordersWithRefunds || ordersWithRefunds.length === 0) {
      return res.status(404).json({ message: "No refund requests found." });
    }

    const formattedRefundRequests = ordersWithRefunds.flatMap((order) =>
      order.refunds.map((refund) => {
        const productInOrder = order.products.find(
          (product) => product.productId?._id.toString() === refund.productId?._id.toString()
        );

        return {
          refundId: refund._id,
          orderId: order._id,
          product: refund.productId
            ? {
                name: refund.productId.name,
                priceAtPurchase: productInOrder?.priceAtPurchase || 0, 
              }
            : null,
          user: {
            name: order.user?.name || "Unknown User",
            email: order.user?.email || "No Email",
          },
          status: refund.status,
          requestedAt: refund.requestedAt,
          resolvedAt: refund.resolvedAt,
          managerNote: refund.managerNote || null,
        };
      })
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

 