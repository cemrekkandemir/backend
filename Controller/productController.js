const User = require("../Models/User"); 
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const Product = require('../Models/Product');
const Category = require('../Models/Category'); 

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

exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      brand,
      stock,
      imageURL,
      serialNumber,  
      distributor,
      expirationDate,
    } = req.body;

    const existingCategory = await Category.findOne({ name: category });

    if (category && category !== "Uncategorized" && !existingCategory) {
      return res.status(400).json({
        error: `Category "${category}" does not exist. Please create it first or choose an existing category.`,
      });
    }

    const newProduct = new Product({
      name,
      description,
      price,
      category: category || "Uncategorized",
      brand: brand || "No brand",
      stock: stock || 0,
      imageURL: imageURL || "",
      serialNumber: serialNumber || null, 
      distributor: distributor || null,
      expirationDate: expirationDate || null,
    });

    const savedProduct = await newProduct.save();
    return res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Error creating product:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    // If the update payload has a category, we need to validate it
    const { category } = req.body;
    if (category) {
      const existingCategories = await Product.distinct("category");
      if (
        category !== "Uncategorized" &&
        !existingCategories.includes(category)
      ) {
        return res.status(400).json({
          error: `Category "${category}" does not exist. Please create it first or choose an existing category.`,
        });
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body, 
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
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
  exports.setPrice = async (req, res) => {
    const { id } = req.params;
    const { price } = req.body;
  
    if (!price || price <= 0) {
      return res.status(400).json({ message: "Invalid price value." });
    }
  
    try {
      const product = await Product.findById(id);
  
      if (!product) {
        return res.status(404).json({ message: "Product not found." });
      }
  
      // Update original price only if the new price is different
      if (product.price !== price) {
        product.originalPrice = price; // Set original price
        product.price = price; // Update current price
        product.discountPercentage = 0; // Reset discount
        await product.save();
      }
  
      res.status(200).json({
        message: "Price updated successfully.",
        updatedProduct: {
          _id: product._id,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          discountPercentage: product.discountPercentage,
        },
      });
    } catch (error) {
      console.error("Error updating price:", error.message);
      res.status(500).json({ message: "Error updating price", error: error.message });
    }
  };
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

exports.applyDiscount = async (req, res) => {
    const { id } = req.params;
    const { discountPercentage } = req.body;
  
    if (!discountPercentage || discountPercentage <= 0 || discountPercentage > 100) {
      return res.status(400).json({ message: "Invalid discount percentage." });
    }
  
    try {
      const product = await Product.findById(id);
  
      if (!product) {
        return res.status(404).json({ message: "Product not found." });
      }
  
      // Set the original price if not already set
      if (!product.originalPrice) {
        product.originalPrice = product.price;
      }
  
      // Calculate the discounted price
      const discountedPrice = product.originalPrice - (product.originalPrice * discountPercentage) / 100;
  
      product.price = discountedPrice;
      product.discountPercentage = discountPercentage; // Update discount percentage
      await product.save();
  
      // Notify users with this product in their wishlist
      const usersWithProduct = await User.find({ wishlist: id });
      const emailPromises = usersWithProduct.map((user) => {
        const mailOptions = {
          from: `"Vegan Eats Shop" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: "Great news! A product in your wishlist is on discount 🎉",
          text: `Dear ${user.name},\n\nThe product "${product.name}" in your wishlist is now available at a discounted price: $${discountedPrice.toFixed(
            2
          )}.\n\nHurry up and grab it while the offer lasts!\n\nBest regards,\nVegan Eats Team`,
          html: `
            <p>Dear <strong>${user.name}</strong>,</p>
            <p>The product <strong>"${product.name}"</strong> in your wishlist is now available at a discounted price: <strong>$${discountedPrice.toFixed(
              2
            )}</strong>.</p>
            <p>Hurry up and grab it while the offer lasts!</p>
            <p>Best regards,<br><strong>Vegan Eats Team</strong></p>
          `,
        };
  
        return transporter.sendMail(mailOptions);
      });
  
      await Promise.all(emailPromises);
  
      res.status(200).json({
        message: "Discount applied successfully. Notification emails sent.",
        updatedProduct: {
          _id: product._id,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          discountPercentage: product.discountPercentage,
        },
      });
    } catch (error) {
      console.error("Error applying discount:", error.message);
      res.status(500).json({ message: "Error applying discount", error: error.message });
    }
  };

exports.getDistinctCategories = async (req, res) => {
    try {
      const categories = await Product.distinct("category");
      res.status(200).json(categories);
    } catch (error) {
      console.error("Error fetching distinct categories:", error.message);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
};

exports.addNewCategory = async (req, res) => {
  try {
    const { categoryName } = req.body;
    if (!categoryName) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const existingCategory = await Category.findOne({ name: categoryName });
    if (existingCategory) {
      return res.status(400).json({ error: "This category already exists." });
    }

    const newCategory = new Category({ name: categoryName });
    await newCategory.save();

    return res.status(201).json({
      message: `New category "${categoryName}" added successfully.`,
      category: categoryName,
    });
  } catch (error) {
    console.error("Error adding new category:", error.message);
    return res.status(500).json({ error: "Failed to add new category" });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { category } = req.body;
    if (!category) {
      return res.status(400).json({ error: "Category is required." });
    }

    console.log("Deleting category:", category);

    const deletedCategory = await Category.findOneAndDelete({ name: category });
    if (!deletedCategory) {
      return res.status(404).json({ error: "Category not found." });
    }
    await Product.deleteMany({ category: category });

    return res.status(200).json({
      message: `Category "${category}" and all its products are removed successfully.`,
    });
  } catch (error) {
    console.error("Error deleting category:", error.message);
    return res.status(500).json({ error: "Failed to delete category." });
  }
};


exports.updateProductStock = async (req, res) => {
    try {
        const { productId } = req.params;
        const { newStock } = req.body;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ error: "Invalid productId" });
        }
        if (typeof newStock !== 'number' || newStock < 0) {
            return res.status(400).json({ error: "Invalid stock value" });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { stock: newStock },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.status(200).json({
            message: "Stock updated successfully",
            product: updatedProduct,
        });
    } catch (error) {
        console.error("Error updating product stock:", error.message);
        res.status(500).json({ error: "Failed to update product stock" });
    }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().select('name -_id');
    const categoryNames = categories.map(cat => cat.name);

    res.status(200).json(categoryNames);
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
};

  