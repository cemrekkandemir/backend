const express = require('express');
const router = express.Router();
const productController = require('../Controller/productController');

// Route to get a single product by ID
router.get('/:id', productController.getProductById);


// Route to create a new product
router.post('/', productController.createProduct);


module.exports = router;
