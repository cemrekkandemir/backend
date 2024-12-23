// Controller/cartController.js

const Cart = require('../Models/Cart');
const Product = require('../Models/Product');

// Helper function: Find or create a cart
const findOrCreateCart = async (userId, guestId) => {
  let cart;

  if (userId) {
    cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
      await cart.save();
    }
  } else if (guestId) {
    cart = await Cart.findOne({ guestId });
    if (!cart) {
      cart = new Cart({ guestId, items: [] });
      await cart.save();
    }
  }

  return cart;
};

// addItem
exports.addItem = async (req, res) => {
  console.log('req.user in addItem:', req.user);
  try {
    const { productId, quantity } = req.body;
    const userId = req.user?._id || null; // authenticated user
    const guestId = !userId ? req.guestId : null; // guest user

    console.log("User ID:", userId);
    console.log("Guest ID:", guestId);

    const cart = await findOrCreateCart(userId, guestId);
    console.log("Cart found or created:", cart);

    const product = await Product.findById(productId);

    if (!product) {
      console.log("Product not found:", productId);
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.stock < quantity) {
      console.log("Insufficient stock for product:", productId);
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Find existing item
    const existingItem = cart.items.find(item => item.productId.equals(productId));
    console.log("Existing item:", existingItem);

    if (existingItem) {
      existingItem.quantity += quantity;
      console.log("Updated quantity for item:", existingItem);
    } else {
      cart.items.push({ productId, quantity });
      console.log("Added new item to cart:", { productId, quantity });
    }

    console.log("Cart items before saving:", cart.items);

    await cart.save();
    console.log("Cart saved successfully:", cart);

    // Sepeti populate edin
    await cart.populate({
      path: 'items.productId',
      select: 'name price stock imageURL'
    });

    res.status(200).json(cart);
  } catch (error) {
    console.log('Error adding item to cart:', error);
    res.status(500).json({ error: 'Error adding item to cart' });
  }
};

// updateItem
exports.updateItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user?._id || null; // user
    const guestId = !userId ? req.guestId : null; // guest

    console.log("=== Incoming Update Request ===");
    console.log("Incoming productId:", productId);
    console.log("Incoming quantity:", quantity);
    console.log("User ID:", userId);
    console.log("Guest ID:", guestId);

    const cart = await findOrCreateCart(userId, guestId);

    console.log("Cart found:", cart);
    console.log("Cart items before update:", cart.items);

    const itemIndex = cart.items.findIndex(item =>
      item.productId.toHexString() === productId
    );

    console.log("Item index in cart:", itemIndex);

    if (itemIndex > -1) {
      if (quantity === 0) {
        console.log("Removing item from cart:", productId);
        cart.items.splice(itemIndex, 1);
      } else {
        // check stock
        const product = await Product.findById(productId);
        if (!product || product.stock < quantity) {
          console.log("Insufficient stock or product not found for:", product);
          return res.status(400).json({ error: 'Insufficient stock or product not found' });
        }
        cart.items[itemIndex].quantity = quantity;
        console.log("Updated item quantity:", cart.items[itemIndex]);
      }

      // save
      await cart.save();
      console.log("Cart updated successfully:", cart);

      // Sepeti populate edin
      await cart.populate({
        path: 'items.productId',
        select: 'name price stock imageURL'
      });

      res.status(200).json(cart);
    } else {
      console.log("Product not found in cart:", productId);
      res.status(404).json({ error: 'Product not found in the cart' });
    }
  } catch (error) {
    console.log('Error updating product in the cart:', error);
    res.status(500).json({ error: 'Error updating product in the cart' });
  }
};

// removeItem
exports.removeItem = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user?._id || null;
    const guestId = !userId ? req.guestId : null;

    const cart = await findOrCreateCart(userId, guestId);
    const initialLength = cart.items.length;

    cart.items = cart.items.filter(item => !item.productId.equals(productId));

    if (cart.items.length < initialLength) {
      await cart.save();

      // Sepeti populate edin
      await cart.populate({
        path: 'items.productId',
        select: 'name price stock imageURL'
      });

      res.status(200).json(cart);
    } else {
      res.status(404).json({ error: 'Product not found in the cart' });
    }
  } catch (error) {
    console.log('Error removing product from the cart:', error);
    res.status(500).json({ error: 'Error removing product from the cart' });
  }
};

// view cart
exports.viewCart = async (req, res) => {
  try {
    const userId = req.user?._id || null;
    const guestId = !userId ? req.guestId : null;

    console.log("Viewing cart for userId:", userId, "and guestId:", guestId);

    const cart = await findOrCreateCart(userId, guestId);

    await cart.populate({
      path: 'items.productId',
      select: 'name price stock imageURL'
    });

    console.log("Cart after populate:", cart);

    res.status(200).json(cart);
  } catch (error) {
    console.log('Error viewing cart:', error);
    res.status(500).json({ error: 'Error viewing cart' });
  }
};
// clearCart

exports.clearCart = async (req, res) => {
  try {
    console.log('clearCart function called');
    const userId = req.user?._id || null;
    const guestId = !userId ? req.guestId : null;

    console.log('User ID:', userId);
    console.log('Guest ID:', guestId);

    const cart = await findOrCreateCart(userId, guestId);

    cart.items = [];
    await cart.save();

    console.log('Cart cleared successfully:', cart);
    res.status(200).json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.log('Error clearing the cart:', error);
    res.status(500).json({ error: 'Error clearing the cart' });
  }
};
