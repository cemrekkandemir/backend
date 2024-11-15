const express = require('express');
const router = express.Router();
const { updateOrderStatus } = require('../controllers/orderStatusController');

// Route to update order status
router.put('/:orderId', updateOrderStatus);

module.exports = router;
