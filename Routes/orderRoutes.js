// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../Controller/orderController');
const { requireAuth, requireSalesManager, requireProductManager } = require('../Middleware/auth');

router.post('/place', requireAuth, orderController.placeOrder);
router.put('/:orderId/status', requireAuth ,requireProductManager, orderController.updateOrderStatus);
router.get('/status', orderController.getLatestOrderStatus);
router.get('/all', orderController.getAllOrders);
router.get('/admin/all', requireAuth ,requireProductManager, orderController.getAllOrdersAdmin);
router.get('/invoices/date-range', requireAuth, requireSalesManager, orderController.getInvoicesByDateRange);
router.get('/revenue', requireAuth, requireSalesManager, orderController.getRevenueAndProfitLoss);
router.post('/:orderId/refund', requireAuth, orderController.requestRefund);
router.get('/delivery-list', requireAuth ,requireProductManager, orderController.getDeliveryList);
router.post('/invoices/selected', requireAuth, requireSalesManager, orderController.getSelectedInvoices);
router.post('/invoices/pdf/selected', requireAuth, requireSalesManager, orderController.generateSelectedInvoicesPDF);
router.get("/refunds", requireAuth, requireSalesManager,  orderController.getAllRefundRequests);
router.put("/refunds/:refundId/approve", requireAuth, requireSalesManager,  orderController.approveRefundRequest);
router.put("/refunds/:refundId/reject", requireAuth, requireSalesManager,  orderController.rejectRefundRequest);
router.post('/:orderId/cancel', requireAuth, orderController.cancelOrder);
router.get('/invoices/productmanager/date-range', requireAuth, requireProductManager, orderController.getInvoicesByDateRange);
router.get('/distribution', requireAuth, requireSalesManager, orderController.getProductDistribution);
module.exports = router;
