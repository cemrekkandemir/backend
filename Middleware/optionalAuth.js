// middleware/optionalAuth.js

const jwt = require('jsonwebtoken');
const User = require('../Models/User');
require('dotenv').config();

const optionalAuth = async (req, res, next) => {
  const { authorization } = req.headers;

  if (authorization) {
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decodedToken) => {
      if (!err) {
        try {
          const user = await User.findById(decodedToken.id);
          if (user) {
            req.user = user;
          }
        } catch (error) {
          console.error('Error finding user:', error);
        }
      }
      next();
    });
  } else {
    next();
  }
};




module.exports = optionalAuth;