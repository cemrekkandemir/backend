const jwt = require('jsonwebtoken');
const User = require('../Models/User');
require('dotenv').config();

const optionalAuth = async (req, res, next) => {
  const { authorization } = req.headers;

  if (authorization) {
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decodedToken) => {
      if (err && err.name === 'TokenExpiredError') {
        // Try to refresh the token
        const cookies = req.cookies;
        if (cookies?.jwt) {
          const refreshToken = cookies.jwt;
          const user = await User.findOne({ refreshToken });
          if (!user) return res.status(403).json({ error: 'Refresh token invalid' });

          // Generate a new access token
          const newAccessToken = jwt.sign(
            { email: user.email, id: user._id, role: user.role },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
          );
          req.user = user;
          res.setHeader('Authorization', `Bearer ${newAccessToken}`);
        }
      } else if (!err) {
        try {
          const user = await User.findById(decodedToken.id);
          if (user) req.user = user;
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