const express = require("express");
const router = express.Router();
const wishlistController = require("../Controller/wishlistController");
const { requireAuth } = require("../Middleware/auth");

// Add a product to the wishlist
router.post("/add", requireAuth, wishlistController.addToWishlist);

// Remove a product from the wishlist
router.delete("/remove", requireAuth, wishlistController.removeFromWishlist);

// Get user's wishlist
router.get("/", requireAuth, wishlistController.getWishlist);

module.exports = router;
