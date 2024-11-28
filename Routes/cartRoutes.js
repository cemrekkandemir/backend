// cartRoutes.js

const express = require('express');
const router = express.Router();
const cartController = require('../Controller/cartController');


router.post('/add', cartController.addItem);
router.put('/update', cartController.updateItem);
router.delete('/remove', cartController.removeItem);
router.get('/view', cartController.viewCart);

module.exports = router;


