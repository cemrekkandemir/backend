const express = require('express');
const router = express.Router();
const productController = require('../Controller/productController');

// Route to get a single product by ID
router.get('/:id', productController.getProductById);


// Route to create a new product
router.post('/', productController.createProduct);

// Search, Filter, and Sort products
router.get('/', productController.getProducts);

// Route to update comment visibility
router.put('/:productId/feedback/:feedbackId/visibility', productController.updateCommentVisibility);

// Route to get feedback for a product
router.get('/:productId/feedback', productController.getFeedback);


module.exports = router;