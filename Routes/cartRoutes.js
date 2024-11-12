// cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../Controller/cartController');
const optionalAuth = require('../Middleware/optionalAuth');


router.post('/add', optionalAuth, cartController.addItem);
router.put('/update', optionalAuth, cartController.updateItem);
router.delete('/remove', optionalAuth, cartController.removeItem);


router.get('/view', optionalAuth, cartController.viewCart);

module.exports = router;
