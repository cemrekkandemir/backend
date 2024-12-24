const mongoose = require('mongoose');
const Cart = require('../Models/Cart');
const Product = require('../Models/Product');
const cartController = require('../Controller/cartController');

jest.mock('../Models/Cart');
jest.mock('../Models/Product');

describe('Cart Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      user: {},
      guestId: 'guest123'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('addItem', () => {

    it('should return 404 if product not found', async () => {
      req.body = { productId: 'testProductId', quantity: 2 };
      req.user._id = 'testUserId';

      Cart.findOne.mockResolvedValue({ userId: 'testUserId', items: [] });
      Product.findById.mockResolvedValue(null);

      await cartController.addItem(req, res);

      expect(Product.findById).toHaveBeenCalledWith('testProductId');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
    });

    it('should return 400 if insufficient stock', async () => {
      req.body = { productId: 'testProductId', quantity: 2 };
      req.user._id = 'testUserId';

      const product = { _id: 'testProductId', stock: 1 };

      Cart.findOne.mockResolvedValue({ userId: 'testUserId', items: [] });
      Product.findById.mockResolvedValue(product);

      await cartController.addItem(req, res);

      expect(Product.findById).toHaveBeenCalledWith('testProductId');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient stock' });
    });
  });

  describe('updateItem', () => {

    it('should return 404 if product not found in cart', async () => {
      req.body = { productId: 'testProductId', quantity: 3 };
      req.user._id = 'testUserId';

      const cart = { userId: 'testUserId', items: [] };

      Cart.findOne.mockResolvedValue(cart);

      await cartController.updateItem(req, res);

      expect(Cart.findOne).toHaveBeenCalledWith({ userId: 'testUserId' });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Product not found in the cart' });
    });
  });

  describe('removeItem', () => {

    it('should return 404 if product not found in cart', async () => {
      req.body = { productId: 'testProductId' };
      req.user._id = 'testUserId';

      const cart = { userId: 'testUserId', items: [] };

      Cart.findOne.mockResolvedValue(cart);

      await cartController.removeItem(req, res);

      expect(Cart.findOne).toHaveBeenCalledWith({ userId: 'testUserId' });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Product not found in the cart' });
    });
  });

  describe('viewCart', () => {
    it('should return the cart for the user', async () => {
      req.user._id = 'testUserId';

      const cart = {
        userId: 'testUserId',
        items: [{ productId: new mongoose.Types.ObjectId(), quantity: 2 }],
        populate: jest.fn().mockResolvedValue({})
      };

      Cart.findOne.mockResolvedValue(cart);

      await cartController.viewCart(req, res);

      expect(Cart.findOne).toHaveBeenCalledWith({ userId: 'testUserId' });
      expect(cart.populate).toHaveBeenCalledWith({
        path: 'items.productId',
        select: 'name price stock imageURL'
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(cart);
    });

    it('should return 500 if there is a server error', async () => {
      req.user._id = 'testUserId';

      Cart.findOne.mockRejectedValue(new Error('Server error'));

      await cartController.viewCart(req, res);

      expect(Cart.findOne).toHaveBeenCalledWith({ userId: 'testUserId' });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error viewing cart' });
    });
  });

  describe('clearCart', () => {
    it('should clear the cart for the user', async () => {
        req.user._id = 'testUserId';
    
        const cart = {
          userId: 'testUserId',
          items: [{ productId: new mongoose.Types.ObjectId(), quantity: 2 }],
          save: jest.fn().mockResolvedValue({})
        };
    
        Cart.findOne.mockResolvedValue(cart);
    
        await cartController.clearCart(req, res);
    
        expect(Cart.findOne).toHaveBeenCalledWith({ userId: 'testUserId' });
        expect(cart.items.length).toBe(0);
        expect(cart.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Cart cleared successfully' });
      });

      it('should return 500 if there is a server error', async () => {
        req.user._id = 'testUserId';
    
        Cart.findOne.mockRejectedValue(new Error('Server error'));
    
        await cartController.clearCart(req, res);
    
        expect(Cart.findOne).toHaveBeenCalledWith({ userId: 'testUserId' });
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Error clearing the cart' });
      });
  });
});
