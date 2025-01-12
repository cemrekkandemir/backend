// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../Controller/authController');
const { requireAuth } = require("../Middleware/auth");

// Signup
router.post('/signup', authController.signup);

// Login
router.post('/login', authController.login);

// Logout
router.post('/logout', authController.logout);

router.get('/tax-id', requireAuth, authController.getUserTaxId);

module.exports = router;
