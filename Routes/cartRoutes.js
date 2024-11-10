const express = require('express');
const router = express.Router();
const cartController = require('../Controller/cartController');
const optionalAuth = require('../Middleware/optionalAuth');

// Add
router.post('/add', optionalAuth, cartController.addItem);

// Update
router.put('/update', optionalAuth, cartController.updateItem);

// Remove
router.delete('/remove', optionalAuth, cartController.removeItem);
// view
router.get('/view', cartController.getCart);

module.exports = router;