const express = require('express');
const router = express.Router();
const productController = require('../Controller/productController');
const { requireAuth, requireSalesManager, requireProductManager } = require('../Middleware/auth');

router.get('/categories', productController.getCategories);

router.post('/add-category', requireAuth, requireProductManager, productController.addNewCategory);

router.delete('/delete-category', requireAuth, requireProductManager, productController.deleteCategory);

router.put('/stock/:productId', requireAuth, requireProductManager, productController.updateProductStock);


router.get('/', productController.getAllProducts);

// Get a single product by ID
router.get('/:id', productController.getProductById);

// Create a new product
router.post('/', productController.createProduct);

// Update a product by ID
router.put('/:id', productController.updateProduct);

// Delete a product by ID
router.delete('/:id', productController.deleteProduct);

router.post('/create-multiple', productController.createProducts);

// Route to update comment visibility
router.put('/comments/:productId/:commentId/approve', requireAuth, requireProductManager, productController.updateCommentVisibility);

// Route to get feedback for a product
router.get('/:productId/feedback', productController.getFeedback);

// Route to post a comment for a product
router.post('/:productId/feedback', productController.postComment);

router.put('/:productId/increase-popularity', productController.increasePopularity);

// Route to fetch pending comments
router.get('/comments/pending', requireAuth, requireProductManager, productController.getPendingComments);

// Route to reject a comment
router.delete('/comments/:productId/:commentId/reject', requireAuth, requireProductManager, productController.rejectComment);

router.put('/:id/price', requireAuth, requireSalesManager, productController.setPrice);

router.put('/:id/discount', requireAuth, requireSalesManager, productController.applyDiscount);

router.get('/distinct-categories', requireAuth, requireProductManager, productController.getDistinctCategories);

module.exports = router;