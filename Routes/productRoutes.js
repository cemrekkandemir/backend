const express = require('express');
const router = express.Router();
const productController = require('../Controller/productController');

router.get('/:id', productController.getProductById);


module.exports = router;
