const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

// Mock Payment Controller
exports.mockPayment = (req, res) => {
    const { cardNumber, expiry, cvv, amount } = req.body;

    if (!cardNumber || !expiry || !cvv || !amount) {
        return res.status(400).json({ message: 'Invalid payment details' });
    }

    // Luhn's Algorithm to validate card number
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
    res.json({ message: 'Payment successful', transactionId });
};

// Invoice Generation Controller
exports.generateInvoice = async (req, res) => {
    const { user, orderDetails, transactionId } = req.body;

    if (!user || !orderDetails || !transactionId) {
        return res.status(400).json({ message: 'Invalid invoice details' });
    }

    // Create PDF
    const doc = new PDFDocument();
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
        const pdfData = Buffer.concat(buffers);

        // Send email with Nodemailer
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
          },
      });

        try {
            await transporter.sendMail({
                from: 'your-email@gmail.com',
                to: user.email,
                subject: 'Your Invoice',
                text: 'Find your invoice attached.',
                attachments: [
                    {
                        filename: 'invoice.pdf',
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