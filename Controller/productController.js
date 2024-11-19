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
}; // Ensure the correct path to the Product model

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