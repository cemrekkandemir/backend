const User = require("../Models/User");
const Product = require("../Models/Product");

exports.addToWishlist = async (req, res) => {
    const userId = req.user.id; 
    const { productId } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ error: "Product not found" });

     
        if (!user.wishlist.includes(productId)) {
            user.wishlist.push(productId);
            await user.save();
        }

        res.status(200).json({ message: "Product added to wishlist", wishlist: user.wishlist });
    } catch (error) {
        res.status(500).json({ error: "Error adding product to wishlist", details: error.message });
    }
};

exports.removeFromWishlist = async (req, res) => {
    const userId = req.user.id; 
    const { productId } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

    
        user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
        await user.save();

        res.status(200).json({ message: "Product removed from wishlist", wishlist: user.wishlist });
    } catch (error) {
        res.status(500).json({ error: "Error removing product from wishlist", details: error.message });
    }
};

exports.getWishlist = async (req, res) => {
    const userId = req.user.id;

    try {
        const user = await User.findById(userId).populate("wishlist");
        if (!user) return res.status(404).json({ error: "User not found" });

        res.status(200).json({ wishlist: user.wishlist });
    } catch (error) {
        res.status(500).json({ error: "Error fetching wishlist", details: error.message });
    }
};
