const jwt = require('jsonwebtoken');
const User = require('../Models/User');

const requireAuth = async (req, res, next) => {
  const { authorization } = req.headers;

  console.log("Authorization header:", authorization);

  if (!authorization) {
    console.log("No authorization header found");
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authorization.split(' ')[1];
  console.log("Token:", token);

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log("Decoded token:", decodedToken);

    const user = await User.findById(decodedToken.id);
    if (!user) {
      console.log("User not found");
      return res.status(404).json({ error: 'User not found' });
    }

    console.log("User found and attached to req.user:", user);
    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({ error: 'Request not authorized' });
  }
};
const requireSalesManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  if (req.user.role !== 'sales_manager') {
    console.log(`Access denied for role: ${req.user.role}`);
    return res.status(403).json({ error: 'Access denied: Sales Manager only' });
  }

  console.log("Access granted for Sales Manager");
  next();
};
const requireProductManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  if (req.user.role !== 'product_manager') {
    console.log(`Access denied for role: ${req.user.role}`);
    return res.status(403).json({ error: 'Access denied: Product Manager only' });
  }

  console.log("Access granted for Product Manager");
  next();
};

module.exports = { requireAuth, requireSalesManager, requireProductManager };