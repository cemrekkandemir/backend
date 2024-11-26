const express = require('express');
const router = express.Router();
const productController = require('../Controller/productController');
router.get('/', productController.getAllProducts);

// Get a single product by ID
router.get('/:id', productController.getProductById);

// Create a new product
router.post('/', productController.createProduct);

// Route to update comment visibility
router.put('/:productId/feedback/:feedbackId/visibility', productController.updateCommentVisibility);

// Route to get feedback for a product
router.get('/:productId/feedback', productController.getFeedback);



module.exports = router;