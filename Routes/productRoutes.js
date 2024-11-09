const express = require('express');
const router = express.Router();
const productController = require('../Controllers/productController');

router.get('/:id', productController.getProductById);


module.exports = router;