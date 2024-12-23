const mongoose = require('mongoose');
const Product = require('../Models/Product');
const productController = require('../Controller/productController');

jest.mock('../Models/Product');

describe('Product Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getProductById', () => {
    it('should return a product by ID', async () => {
      const product = { _id: 'testProductId', name: 'Test Product' };
      Product.findById.mockResolvedValue(product);

      req.params.id = 'testProductId';
      await productController.getProductById(req, res);

      expect(Product.findById).toHaveBeenCalledWith('testProductId');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(product);
    });

    it('should return 404 if product not found', async () => {
      Product.findById.mockResolvedValue(null);

      req.params.id = 'testProductId';
      await productController.getProductById(req, res);

      expect(Product.findById).toHaveBeenCalledWith('testProductId');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
    });

    it('should return 500 if there is a server error', async () => {
      Product.findById.mockRejectedValue(new Error('Server error'));

      req.params.id = 'testProductId';
      await productController.getProductById(req, res);

      expect(Product.findById).toHaveBeenCalledWith('testProductId');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('createProduct', () => {
    it('should create a new product', async () => {
      const product = { _id: 'testProductId', name: 'Test Product' };
      Product.prototype.save = jest.fn().mockResolvedValue(product);

      req.body = product;
      await productController.createProduct(req, res);

      expect(Product.prototype.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(product);
    });

    it('should return 500 if there is a server error', async () => {
      Product.prototype.save = jest.fn().mockRejectedValue(new Error('Server error'));

      req.body = { name: 'Test Product' };
      await productController.createProduct(req, res);

      expect(Product.prototype.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('updateProduct', () => {
    it('should update a product by ID', async () => {
      const updatedProduct = { _id: 'testProductId', name: 'Updated Product' };
      Product.findByIdAndUpdate.mockResolvedValue(updatedProduct);

      req.params.id = 'testProductId';
      req.body = { name: 'Updated Product' };
      await productController.updateProduct(req, res);

      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith('testProductId', { name: 'Updated Product' }, { new: true });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedProduct);
    });

    it('should return 404 if product not found', async () => {
      Product.findByIdAndUpdate.mockResolvedValue(null);

      req.params.id = 'testProductId';
      req.body = { name: 'Updated Product' };
      await productController.updateProduct(req, res);

      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith('testProductId', { name: 'Updated Product' }, { new: true });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
    });

    it('should return 500 if there is a server error', async () => {
      Product.findByIdAndUpdate.mockRejectedValue(new Error('Server error'));

      req.params.id = 'testProductId';
      req.body = { name: 'Updated Product' };
      await productController.updateProduct(req, res);

      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith('testProductId', { name: 'Updated Product' }, { new: true });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product by ID', async () => {
      const deletedProduct = { _id: 'testProductId', name: 'Deleted Product' };
      Product.findByIdAndDelete.mockResolvedValue(deletedProduct);

      req.params.id = 'testProductId';
      await productController.deleteProduct(req, res);

      expect(Product.findByIdAndDelete).toHaveBeenCalledWith('testProductId');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Product deleted successfully' });
    });

    it('should return 404 if product not found', async () => {
      Product.findByIdAndDelete.mockResolvedValue(null);

      req.params.id = 'testProductId';
      await productController.deleteProduct(req, res);

      expect(Product.findByIdAndDelete).toHaveBeenCalledWith('testProductId');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
    });

    it('should return 500 if there is a server error', async () => {
      Product.findByIdAndDelete.mockRejectedValue(new Error('Server error'));

      req.params.id = 'testProductId';
      await productController.deleteProduct(req, res);

      expect(Product.findByIdAndDelete).toHaveBeenCalledWith('testProductId');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('getAllProducts', () => {
    it('should return all products', async () => {
      const products = [{ _id: 'testProductId1', name: 'Product 1' }, { _id: 'testProductId2', name: 'Product 2' }];
      Product.find.mockResolvedValue(products);

      await productController.getAllProducts(req, res);

      expect(Product.find).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(products);
    });

    it('should return 500 if there is a server error', async () => {
      Product.find.mockRejectedValue(new Error('Server error'));

      await productController.getAllProducts(req, res);

      expect(Product.find).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('increasePopularity', () => {

    
    it('should return 400 if product ID is invalid', async () => {
      req.params.productId = 'invalidProductId';
      await productController.increasePopularity(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid product ID' });
    });

  });
});
