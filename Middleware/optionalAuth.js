// middleware/optionalAuth.js

const jwt = require('jsonwebtoken');
const User = require('../Models/User');

const optionalAuth = async (req, res, next) => {
  const { authorization } = req.headers;
  console.log('Authorization header:', authorization);

  if (authorization) {
    const token = authorization.split(' ')[1];
    console.log('Token:', token);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decodedToken) => {
      if (err) {
        console.error('JWT verification failed:', err);
        next(); // Proceed without attaching the user
      } else {
        console.log('Decoded token:', decodedToken);
        try {
          const user = await User.findById(decodedToken.id);
          if (user) {
            req.user = user; // Attach the user to the request
            console.log('User found and attached to req.user:', req.user);
          } else {
            console.log('User not found with id:', decodedToken.id);
          }
        } catch (error) {
          console.error('Error finding user:', error);
        }
        next();
      }
    });
  } else {
    console.log('No authorization header found');
    next();
  }
};

module.exports = optionalAuth;
