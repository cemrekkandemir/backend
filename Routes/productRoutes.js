const express = require('express');
const router = express.Router();
const productController = require('../Controller/productController');
router.get('/', productController.getAllProducts);

// Get a single product by ID
router.get('/:id', productController.getProductById);

// Create a new product
router.post('/', productController.createProduct);


module.exports = router;