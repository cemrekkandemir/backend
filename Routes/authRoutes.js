// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../Controller/authController');
const mergeCarts = require('../Middleware/cartMerger');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout); 

module.exports = router;