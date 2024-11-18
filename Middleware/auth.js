// middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../Models/User');

const requireAuth = (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authorization.split(' ')[1];

  jwt.verify(token, 'your_jwt_secret_key', async (err, decodedToken) => {
    if (err) {
      return res.status(401).json({ error: 'Request not authorized' });
    }
    
    try {
      const user = await User.findById(decodedToken.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Request not authorized' });
    }
  });
};

module.exports = requireAuth;