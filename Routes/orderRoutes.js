// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../Controller/orderController');
const { requireAuth, requireSalesManager } = require('../Middleware/auth');

router.post('/place', requireAuth, orderController.placeOrder);
router.put('/:orderId/status', orderController.updateOrderStatus);
router.get('/status', orderController.getLatestOrderStatus);
router.get('/all', orderController.getAllOrders);
router.get('/admin/all', orderController.getAllOrdersAdmin);
router.get('/revenue', requireAuth, requireSalesManager, orderController.getRevenueAndProfitLoss);
module.exports = router;