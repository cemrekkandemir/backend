const express = require('express');
const { mockPayment, generateInvoice } = require('../Controller/paymentController'); // Correct destructured import
const router = express.Router();

// Define the payment routes
router.post('/mock-payment', mockPayment); // Use the destructured function directly
router.post('/generate-invoice', generateInvoice); // Use the destructured function directly

module.exports = router;