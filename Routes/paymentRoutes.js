const express = require('express');
const { mockPayment } = require('../Controller/paymentController'); // Ensure this path is correct
const router = express.Router();

// Define the payment route
router.post('/mock-payment', mockPayment);

module.exports = router;
