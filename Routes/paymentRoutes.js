const express = require('express');
const { mockPayment, generateInvoice } = require('../Controller/paymentController');
const router = express.Router();

router.post('/mock-payment', mockPayment);
router.post('/generate-invoice', generateInvoice);

module.exports = router;
