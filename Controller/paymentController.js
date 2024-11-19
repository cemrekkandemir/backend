const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const axios = require('axios');
const User = require('../Models/User');

// Mock Payment, Generate PDF Invoice, and Email Invoice
exports.mockPayment = async (req, res) => {
  try {
    // Extract payment details and user details from the request body
    const { userId, cartItems, paymentDetails } = req.body;

    // Step 1: Verify User
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found or not logged in' });
    }

    // Step 2: Mock Payment Processing (80% Success Rate)
    const isPaymentSuccessful = Math.random() > 0.2; // 80% chance of success
    if (!isPaymentSuccessful) {
      return res.status(400).json({ error: 'Payment failed. Please try again.' });
    }

    // Step 3: Generate PDF Invoice
    const invoiceBuffer = await generateInvoicePDF(user, cartItems);

    // Step 4: Email the Invoice to the User
    await sendInvoiceByEmail(user.email, invoiceBuffer);

    // Step 5: Send Response Back to Client
    res.status(200).json({ message: 'Payment processed successfully, invoice sent via email.' });
  } catch (error) {
    console.error('Error during mock payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Function to Generate Invoice PDF
// Function to Generate Invoice PDF with Error Handling
const generateInvoicePDF = (user, cartItems) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      let buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        let pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Add details to the PDF
      doc.fontSize(20).text(`Invoice for ${user.name}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`User Email: ${user.email}`);
      doc.text(`Date: ${new Date().toLocaleString()}`);
      doc.moveDown();
      doc.text(`Items Purchased:`);

      cartItems.forEach((item, index) => {
        doc.text(`${index + 1}. Product ID: ${item.productId}, Quantity: ${item.quantity}`);
      });

      doc.end();
    } catch (error) {
      console.error("Error generating PDF:", error);
      reject(error);
    }
  });
};

// Function to Email Invoice to User with Error Handling
const sendInvoiceByEmail = async (userEmail, pdfBuffer) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: '"Online Store" <yourstore@example.com>',
      to: userEmail,
      subject: 'Your Invoice from Online Store',
      text: 'Thank you for your purchase. Please find your invoice attached.',
      attachments: [
        {
          filename: 'invoice.pdf',
          content: pdfBuffer,
        },
      ],
    });
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send invoice email");
  }
};
