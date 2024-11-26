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
        res.status(200).json(products); // Send the list of products
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};