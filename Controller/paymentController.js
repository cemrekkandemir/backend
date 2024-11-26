// Update for better validation and error handling
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
require('dotenv').config(); // Load environment variables

exports.mockPayment = (req, res) => {
    const { cardNumber, expiry, cvv, amount } = req.body;

    if (!cardNumber || !expiry || !cvv || !amount) {
        return res.status(400).json({ message: 'Invalid payment details' });
    }

    // Simple credit card validation using Luhn's Algorithm
    const isValidCard = cardNumber.split('').reverse().reduce((sum, digit, idx) => {
        digit = parseInt(digit);
        if (idx % 2) digit *= 2;
        return sum + (digit > 9 ? digit - 9 : digit);
    }, 0) % 10 === 0;

    if (!isValidCard) {
        return res.status(400).json({ message: 'Invalid card number' });
    }

    // Simulate a successful payment
    const transactionId = `TXN-${Date.now()}`;
    res.status(200).json({
        message: 'Payment successful',
        transactionId,
        orderDetails: {
            id: `ORDER-${Date.now()}`,
            amount,
        },
    });
};

exports.generateInvoice = async (req, res) => {
    const { user, orderDetails, transactionId } = req.body;

    if (!user || !orderDetails || !transactionId) {
        return res.status(400).json({ message: 'Invalid invoice details' });
    }

    const doc = new PDFDocument();
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
        const pdfData = Buffer.concat(buffers);

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: 'Your Invoice',
                text: 'Find your invoice attached.',
                attachments: [
                    {
                        filename: `invoice-${orderDetails.id}.pdf`,
                        content: pdfData,
                    },
                ],
            });

            res.json({ message: 'Invoice sent successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Error sending email', error });
        }
    });

    doc.text(`Invoice for Order ID: ${orderDetails.id}`);
    doc.text(`Transaction ID: ${transactionId}`);
    doc.text(`User: ${user.name}`);
    doc.text(`Total Amount: ${orderDetails.amount}`);
    doc.end();
};