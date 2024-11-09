const Product = require('../Models/Product');


// Get a product's details by ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
    }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
