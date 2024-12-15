const express = require('express');
const router = express.Router();
const productController = require('../Controller/productController');

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
router.put('/comments/:productId/feedback/:commentId/approve', productController.updateCommentVisibility);

// Route to get feedback for a product
router.get('/:productId/feedback', productController.getFeedback);

// Route to post a comment for a product
router.post('/:productId/feedback', productController.postComment);

router.put('/:productId/increase-popularity', productController.increasePopularity);


// Route to fetch pending comments
router.get('/comments/pending', productController.getPendingComments);

// Route to reject a comment
router.delete('/comments/:productId/comments/:commentId/reject',productController.rejectComment);

module.exports = router;