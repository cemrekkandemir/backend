// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../Controller/authController');

// Signup
router.post('/signup', authController.signup);

// Login
router.post('/login', authController.login);

// Logout
router.post('/logout', authController.logout);

module.exports = router;