const Product = require('../Models/Product');


// Get a product's details by ID (GET)
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.status(200).json(product); // Send the product in the response
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Create multiple products (POST)
exports.createProducts = async (req, res) => {
    const products = req.body; // Expecting an array of product objects
    try {
        // Validate if the body is an array
        if (!Array.isArray(products)) {
            return res.status(400).json({ message: 'Input should be an array of products.' });
        }

        // Use insertMany for batch creation
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

// Update comment visibility
exports.updateCommentVisibility = async (req, res) => {
    const { productId, feedbackId } = req.params;
  
    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(feedbackId)) {
      return res.status(400).json({ error: 'Invalid product or feedback ID' });
    }
  
    try {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
  
      const feedback = product.feedback.id(feedbackId);
      if (!feedback) {
        return res.status(404).json({ error: 'Feedback not found' });
      }
  
      if (!feedback.text) {
        return res.status(400).json({ error: 'This feedback does not include a comment.' });
      }
  
      feedback.isVisible = true;
      await product.save();
  
      res.status(200).json({ message: 'Comment visibility updated.', feedback });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update comment visibility.' });
    }
  };
  
  // Get feedback for a product
  exports.getFeedback = async (req, res) => {
    const { productId } = req.params;
  
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
  
    try {
      const product = await Product.findById(productId).populate('feedback.user', 'name');
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
  
      const visibleComments = product.feedback.filter(f => f.text && f.isVisible);
      const ratingsOnly = product.feedback.filter(f => !f.text);
  
      res.status(200).json({
        averageRating: product.averageRating,
        visibleComments,
        ratingsOnly,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get feedback.' });
    }
  };
  