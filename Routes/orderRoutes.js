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
router.get('/invoices/date-range', requireAuth, requireSalesManager, orderController.getInvoicesByDateRange);
router.get('/revenue', requireAuth, requireSalesManager, orderController.getRevenueAndProfitLoss);
router.post('/:orderId/refund', requireAuth, orderController.requestRefund);
router.get('/delivery-list', orderController.getDeliveryList);
router.post('/invoices/selected', requireAuth, requireSalesManager, orderController.getSelectedInvoices);
router.post('/invoices/pdf/selected', requireAuth, requireSalesManager, orderController.generateSelectedInvoicesPDF);
router.put("/refunds/:refundId/approve", requireAuth, requireSalesManager,  orderController.approveRefundRequest);
router.put("/refunds/:refundId/reject", requireAuth, requireSalesManager,  orderController.rejectRefundRequest);
router.post('/:orderId/cancel', requireAuth, orderController.cancelOrder);
module.exports = router;
