const mongoose = require('mongoose');
const Product = require('../Models/Product');

// Get a product's details by ID (GET)
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create multiple products (POST)
exports.createProducts = async (req, res) => {
    const products = req.body;
    try {
        if (!Array.isArray(products)) {
            return res.status(400).json({ message: 'Input should be an array of products.' });
        }
        const savedProducts = await Product.insertMany(products);
        res.status(201).json({ message: 'Products created successfully.', data: savedProducts });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a new product (POST)
exports.createProduct = async (req, res) => {
    const { name, description, price, category, brand, stock, imageURL } = req.body;
    const newProduct = new Product({ name, description, price, category, brand, stock, imageURL });
    try {
        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a product by ID (PUT)
exports.updateProduct = async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedProduct) return res.status(404).json({ error: 'Product not found' });
        res.status(200).json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete a product (DELETE)
exports.deleteProduct = async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) return res.status(404).json({ error: 'Product not found' });
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all products (GET)
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update comment visibility (PUT)
exports.updateCommentVisibility = async (req, res) => {
    const { productId, commentId } = req.params;
    console.log(`Received productId: ${productId}, commentId: ${commentId}`);
    
    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(400).json({ error: 'Invalid product or comment ID' });
    }
    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const comment = product.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        comment.isVisible = true;
        await product.save();
        res.status(200).json({ message: 'Comment visibility updated.', comment });
    } catch (error) {
        console.error(`Error updating comment visibility: ${error.message}`);
        res.status(500).json({ error: 'Failed to update comment visibility.' });
    }
};

// Get feedback for a product (GET)
exports.getFeedback = async (req, res) => {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ error: 'Invalid product ID' });
    }
    try {
        const product = await Product.findById(productId).populate('comments.user', 'name').populate('ratings.user', 'name');
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const visibleComments = product.comments.filter(c => c.isVisible);
        res.status(200).json({
            averageRating: product.averageRating,
            visibleComments,
            ratings: product.ratings,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get feedback.' });
    }
};

// Post a comment or rating for a product (POST)
exports.postComment = async (req, res) => {
    const { productId } = req.params;
    const { userId, username, text, rating } = req.body;
    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Invalid product or user ID' });
    }
    if (rating && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
        return res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
    }
    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if the user has already commented
        const hasCommented = product.comments.some(comment => comment.user.toString() === userId);
        if (text && hasCommented) {
            return res.status(400).json({ error: 'User has already commented on this product' });
        }

        // Check if the user has already rated
        const hasRated = product.ratings.some(ratingEntry => ratingEntry.user.toString() === userId);
        if (rating && hasRated) {
            return res.status(400).json({ error: 'User has already rated this product' });
        }

        if (text) {
            const comment = {
                user: userId,
                username,
                text,
                isVisible: false
            };
            product.comments.push(comment);
        }

        if (rating) {
            const ratingEntry = {
                user: userId,
                rating
            };
            product.ratings.push(ratingEntry);

            // Update average rating
            const totalRatings = product.ratings.reduce((acc, r) => acc + r.rating, 0);
            product.averageRating = totalRatings / product.ratings.length;
        }

        await product.save();
        res.status(201).json({ message: 'Feedback added successfully.', product });
    } catch (error) {
        res.status(500).json({ error: 'Failed to post feedback.' });
    }
};

// Increase product popularity (PUT)
exports.increasePopularity = async (req, res) => {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ error: 'Invalid product ID' });
    }
    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        product.popularity += 1;
        await product.save();
        res.status(200).json({ message: 'Product popularity increased.', product });
    } catch (error) {
        res.status(500).json({ error: 'Failed to increase product popularity.' });
    }
};

exports.getPendingComments = async (req, res) => {
    try {
      const pendingComments = await Product.aggregate([
        { $unwind: '$comments' },
        { $match: { 'comments.isVisible': false } },
        {
          $project: {
            _id: 0,
            productId: '$_id',
            commentId: '$comments._id',
            text: '$comments.text',
            username: '$comments.username',
            createdAt: '$comments.createdAt',
          },
        },
      ]);
  
      res.status(200).json(pendingComments);
    } catch (error) {
      console.error('Error fetching pending comments:', error);
      res.status(500).json({ error: 'Failed to fetch pending comments' });
    }
  };

exports.rejectComment = async (req, res) => {
    try {
      const { productId, commentId } = req.params;
  
      // Removes the comment with the specified ID from the comments array
      await Product.updateOne(
        { _id: productId },
        { $pull: { comments: { _id: commentId } } }
      );
  
      res.status(200).json({ message: 'Comment rejected and removed successfully' });
    } catch (error) {
      console.error('Error rejecting comment:', error);
      res.status(500).json({ error: 'Failed to reject and remove comment' });
    }
  };