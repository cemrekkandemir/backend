const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const Joi = require('joi');
const crypto = require('crypto');
const creditCardType = require('credit-card-type');
const User = require('../Models/User'); 

// Mock Payment
exports.mockPayment = async (req, res) => {
    const paymentSchema = Joi.object({
        nameOnCard: Joi.string().required(),
        cardNumber: Joi.string().required(),
        expiry: Joi.string().required(),
        cvv: Joi.string().length(3).required(),
        amount: Joi.number().positive().required(),
    });

    const { error } = paymentSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const { nameOnCard, cardNumber, expiry, cvv, amount } = req.body;

    try {
        // Validate and detect card type
        const cardDetails = creditCardType(cardNumber);
        if (cardDetails.length === 0) {
            return res.status(400).json({ message: 'Invalid card number' });
        }

        const cardType = cardDetails[0].type;
        const validCardTypes = ['visa', 'mastercard', 'amex'];
        if (!validCardTypes.includes(cardType)) {
            return res.status(400).json({ message: `Unsupported card type: ${cardType}` });
        }

        // Validate expiry date
        const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
        if (!expiryRegex.test(expiry)) {
            return res.status(400).json({ message: 'Invalid expiry date format. Use MM/YY.' });
        }

        const [month, year] = expiry.split('/');
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear() % 100;

        if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
            return res.status(400).json({ message: 'Card is expired' });
        }

        // Simulate payment processing
        const transactionId = `TXN-${Date.now()}`;
        const paymentStatus = true; // Simulated payment status

        if (paymentStatus) {
            res.status(200).json({
                message: 'Payment successful',
                transactionId,
                orderDetails: {
                    id: `ORDER-${Date.now()}`,
                    amount
                },
            });
        } else {
            res.status(400).json({ message: 'Payment failed. Please try again.' });
        }
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

// Generate Invoice
exports.generateInvoice = async (req, res) => {
    const invoiceSchema = Joi.object({
        user: Joi.object({
            name: Joi.string().required(),
            email: Joi.string().email().required(),
            address: Joi.string().required(),
        }).required(),
        orderDetails: Joi.object({
            id: Joi.string().required(),
            amount: Joi.number().positive().required(),
        }).required(),
        transactionId: Joi.string().required(),
    });

    const { error } = invoiceSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { user, orderDetails, transactionId } = req.body;

    try {
        const doc = new PDFDocument();
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);

            const transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                secure: false,
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
                    text: 'Thank you for your purchase! Please find your invoice attached.',
                    attachments: [
                        {
                            filename: `invoice-${orderDetails.id}.pdf`,
                            content: pdfData,
                        },
                    ],
                });

                res.json({ message: 'Invoice sent successfully' });
            } catch (error) {
                console.error('Error sending email:', error);
                res.status(500).json({ message: 'Error sending email', error });
            }
        });

        // Generate PDF content
        doc.fontSize(16).text(`Invoice for Order ID: ${orderDetails.id}`, { underline: true });
        doc.text(`Transaction ID: ${transactionId}`);
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        doc.text(`Name: ${user.name}`);
        doc.text(`Email: ${user.email}`);
        doc.text(`Address: ${user.address}`);
        doc.text(`Total Amount: $${orderDetails.amount}`);
        doc.end();
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};
