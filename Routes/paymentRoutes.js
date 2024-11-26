const express = require('express');
const { mockPayment, generateInvoice } = require('../Controller/paymentController');
const router = express.Router();

router.post('/mock-payment', (req, res, next) => {
    mockPayment(req, res);
});

router.post('/generate-invoice', generateInvoice);

module.exports = router;