const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const Joi = require('joi');

// Mock payment endpoint
exports.mockPayment = (req, res) => {
    const paymentSchema = Joi.object({
        cardNumber: Joi.string().creditCard().required(),
        expiry: Joi.string().required(),
        cvv: Joi.string().length(3).required(),
        amount: Joi.number().positive().required(),
    });

    const { error } = paymentSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { cardNumber, expiry, cvv, amount } = req.body;

    // Simulate payment failure (10% chance)
    if (Math.random() < 0.1) {
        return res.status(400).json({ message: 'Payment failed. Please try again.' });
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

// Generate invoice endpoint
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

    const doc = new PDFDocument();
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
        const pdfData = Buffer.concat(buffers);

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST, // Gmail SMTP
            port: process.env.EMAIL_PORT,
            secure: false, // Use true for port 465
            auth: {
                user: process.env.EMAIL_USER, // Gmail address
                pass: process.env.EMAIL_PASS, // Gmail App Password
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
    doc.text(`User: ${user.name}`);
    doc.text(`Email: ${user.email}`);
    doc.text(`Address: ${user.address}`);
    doc.text(`Total Amount: $${orderDetails.amount}`);
    doc.end();
};