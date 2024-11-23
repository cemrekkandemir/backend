// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../Controller/orderController');
const auth = require('../Middleware/auth');

router.post('/place', auth, orderController.placeOrder);
router.put('/:orderId/status', auth, orderController.updateOrderStatus);

module.exports = router;