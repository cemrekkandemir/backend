// cartRoutes.js

const express = require('express');
const router = express.Router();
const cartController = require('../Controller/cartController');
const { requireAuth } = require('../Middleware/auth'); // Adjust the path as needed
const Cart = require('../Models/Cart'); // Adjust the path as needed
const Product = require('../Models/Product'); // Adjust the path as needed, if you add product existence checks

router.post('/add', cartController.addItem);
router.put('/update', cartController.updateItem);
router.delete('/remove', cartController.removeItem);
router.get('/view', cartController.viewCart);
router.delete('/clear', cartController.clearCart);

// Merge guest cart with authenticated user's cart
router.post('/merge', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const guestCartItems = req.body.guestCart;

    if (!guestCartItems || !Array.isArray(guestCartItems)) {
      return res.status(400).json({ error: 'Invalid guest cart data' });
    }

    // Find or create user's cart
    let userCart = await Cart.findOne({ userId });
    if (!userCart) {
      userCart = new Cart({ userId, items: [] });
    }

    // Merge guest cart items into user's cart
    for (const guestItem of guestCartItems) {
      // Validate guestItem
      if (!guestItem.id || !guestItem.quantity || guestItem.quantity <= 0) {
        return res.status(400).json({ error: 'Invalid item in guest cart' });
      }

      // Optionally check if product exists
      // const productExists = await Product.exists({ _id: guestItem.id });
      // if (!productExists) {
      //   return res.status(400).json({ error: `Product with ID ${guestItem.id} does not exist` });
      // }

      const existingItemIndex = userCart.items.findIndex((item) =>
        item.productId.toString() === guestItem.id.toString()
      );

      if (existingItemIndex > -1) {
        // Update quantity
        userCart.items[existingItemIndex].quantity += guestItem.quantity;
      } else {
        // Add new item
        userCart.items.push({
          productId: guestItem.id,
          quantity: guestItem.quantity,
        });
      }
    }

    await userCart.save();

    res.status(200).json({ message: 'Carts merged successfully' });
  } catch (error) {
    console.error('Error merging carts:', error);
    res.status(500).json({ error: 'Error merging carts' });
  }
});

module.exports = router;
