const Product = require('../Models/Product');


// Get a product's details by ID (GET)
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
    }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

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

// Get Products with Search, Filter, and Sort
exports.getProducts = async (req, res) => {
    try {
        const { search, category, brand, minPrice, maxPrice, sortBy, order, inStock } = req.query;

        // Base query
        let query = {};

        // Search by name or description
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } }, // Case-insensitive search
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        // Filter by category
        if (category) {
            query.category = category;
        }

        // Filter by brand
        if (brand) {
            query.brand = brand;
        }

        // Filter by price range
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        // Filter by stock availability
        if (inStock) {
            query.stock = { $gt: 0 }; // Products with stock greater than 0
        }

        // Sorting
        let sort = {};
        if (sortBy) {
            sort[sortBy] = order === 'desc' ? -1 : 1; // Default to ascending order
        }

        // Fetch products
        const products = await Product.find(query).sort(sort);

        res.status(200).json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error });
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
  
