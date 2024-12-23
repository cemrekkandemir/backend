// Middleware/setUser.js

const jwt = require('jsonwebtoken');
const User = require('../Models/User');

const setUser = async (req, res, next) => {
  try {
    const authHeader = req.headers ? req.headers.authorization : null;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // Token'ı doğrula
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
        if (err) {
          console.log('Invalid token:', err);
          req.user = null;
        } else {
          req.user = await User.findById(decoded.id).select('-password');
        }
        proceed();
      });
    } else {
      req.user = null;
      proceed();
    }

    function proceed() {
      // Kullanıcı oturum açmamışsa guestId'yi ayarla
      if (!req.user) {
        if (!req.session.guestId) {
          req.session.guestId = req.sessionID;
        }
        req.guestId = req.session.guestId;
      }
      console.log('SetUser Middleware - req.user:', req.user);
      console.log('SetUser Middleware - req.guestId:', req.guestId);
      next();
    }
  } catch (error) {
    console.error('Error in setUser middleware:', error);
    next(error);
  }
};

module.exports = setUser;
