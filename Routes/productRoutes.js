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


module.exports = router;