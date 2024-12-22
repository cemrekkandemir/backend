module.exports = function (req, res, next) {
    if (req.user && req.user.role === 'product_manager') {
      return next();
    }
    return res.status(403).json({ error: 'You must be a product manager to perform this action.' });
};