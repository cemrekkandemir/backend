const express = require('express');
const router = express.Router();
const productController = require('../Controller/productController');
const auth = require('../Middleware/auth');
const requireProductManager = require('../Middleware/requireProductManager');

router.get('/', productController.getAllProducts);

router.get('/:id', productController.getProductById);

router.post('/', auth, requireProductManager, productController.createProduct);

router.put('/:id', auth, requireProductManager, productController.updateProduct);

router.delete('/:id', auth, requireProductManager, productController.deleteProduct);

router.post('/create-multiple', auth, requireProductManager, productController.createProducts);

router.put('/:productId/feedback/:commentId/visibility', auth, requireProductManager, productController.updateCommentVisibility);

router.get('/:productId/feedback', productController.getFeedback);

router.post('/:productId/feedback', auth, productController.postComment);

router.put('/:productId/increase-popularity', productController.increasePopularity);

router.put('/:id/stock', auth, requireProductManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;
    const Product = require('../Models/Product'); 
    
    const updatedProduct = await Product.findByIdAndUpdate(
      id, 
      { stock }, 
      { new: true }
    );

    if (!updatedProduct) return res.status(404).json({ error: 'Product not found' });

    res.status(200).json({ message: 'Stock updated successfully', product: updatedProduct });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ error: 'Error updating stock' });
  }
});

module.exports = router;
