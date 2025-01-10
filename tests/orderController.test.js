const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const orderController = require('../Controller/orderController');
const Order = require('../Models/Order');
const Cart = require('../Models/Cart');
const Product = require('../Models/Product');
const User = require('../Models/User');

let mongoServer;

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue(true)
  })
}));

// Mock PDFDocument
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => ({
    pipe: jest.fn(),
    fontSize: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    end: jest.fn(),
    on: jest.fn()
  }));
});



describe('Order Controller Tests', () => {
    let mockReq;
    let mockRes;
  
    beforeAll(async () => {
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
    });
  
    afterAll(async () => {
      await mongoose.disconnect();
      await mongoServer.stop();
    });
  
    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockReq = {
        user: { _id: new mongoose.Types.ObjectId() },
        body: {},
        params: {},
        query: {}
      };
    });
  
    afterEach(async () => {
      await Order.deleteMany({});
      await Cart.deleteMany({});
      await Product.deleteMany({});
      jest.clearAllMocks();
    });

    describe('placeOrder', () => {
        test('should successfully place an order with valid input', async () => {
          // Setup test data
          const product = await Product.create({
            name: 'Test Product',
            price: 100,
            stock: 10
          });
    
          await Cart.create({
            userId: mockReq.user._id,
            items: [{
              productId: product._id,
              quantity: 2
            }]
          });
    
          mockReq.body.shippingInfo = {
            name: 'Test User',
            address: '123 Test St',
            city: 'Test City',
            postalCode: '12345',
            country: 'Test Country'
          };
    
          // Execute test
          await orderController.placeOrder(mockReq, mockRes);
    
          // Assertions
          expect(mockRes.status).toHaveBeenCalledWith(201);
          expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Order placed successfully',
              orderId: expect.any(mongoose.Types.ObjectId)
            })
          );
        });
    
        test('should return error for incomplete shipping info', async () => {
          mockReq.body.shippingInfo = {
            name: 'Test User'
            // Missing required fields
          };
    
          await orderController.placeOrder(mockReq, mockRes);
    
          expect(mockRes.status).toHaveBeenCalledWith(400);
          expect(mockRes.json).toHaveBeenCalledWith({
            error: 'Incomplete shipping information.'
          });
        });
      });

      describe('updateOrderStatus', () => {
        test('should successfully update order status', async () => {
          const order = await Order.create({
            user: mockReq.user._id,
            products: [],
            totalAmount: 100,
            orderStatus: 'processing'
          });
    
          mockReq.params.orderId = order._id;
          mockReq.body.status = 'delivered';
    
          await orderController.updateOrderStatus(mockReq, mockRes);
    
          expect(mockRes.status).toHaveBeenCalledWith(200);
          expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Order status updated successfully'
            })
          );
        });
    
        test('should return error for invalid status', async () => {
          mockReq.params.orderId = new mongoose.Types.ObjectId();
          mockReq.body.status = 'invalid-status';
    
          await orderController.updateOrderStatus(mockReq, mockRes);
    
          expect(mockRes.status).toHaveBeenCalledWith(400);
          expect(mockRes.json).toHaveBeenCalledWith({
            error: 'Invalid status'
          });
        });
      });
      describe('getLatestOrderStatus', () => {
        test('should return latest order status', async () => {
          const order = await Order.create({
            user: mockReq.user._id,
            products: [],
            totalAmount: 100,
            orderStatus: 'processing'
          });
    
          await orderController.getLatestOrderStatus(mockReq, mockRes);
    
          expect(mockRes.status).toHaveBeenCalledWith(200);
          expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
              orderId: order._id,
              status: 'processing'
            })
          );
        });
    
        test('should return 404 when no orders exist', async () => {
          await orderController.getLatestOrderStatus(mockReq, mockRes);
    
          expect(mockRes.status).toHaveBeenCalledWith(404);
          expect(mockRes.json).toHaveBeenCalledWith({
            error: 'No orders found for this user.'
          });
        });
      });
      describe('requestRefund', () => {
        test('should successfully create refund request', async () => {
          const order = await Order.create({
            user: mockReq.user._id,
            products: [{
              productId: new mongoose.Types.ObjectId(),
              quantity: 1,
              priceAtPurchase: 100
            }],
            totalAmount: 100,
            orderStatus: 'delivered',
            createdAt: new Date()
          });
    
          mockReq.params.orderId = order._id;
          mockReq.body.productId = order.products[0].productId;
    
          await orderController.requestRefund(mockReq, mockRes);
    
          expect(mockRes.status).toHaveBeenCalledWith(200);
          expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Refund request submitted successfully'
            })
          );
        });
      });
      describe('cancelOrder', () => {
        test('should successfully cancel order', async () => {
          const order = await Order.create({
            user: mockReq.user._id,
            products: [],
            totalAmount: 100,
            orderStatus: 'processing'
          });
    
          mockReq.params.orderId = order._id;
    
          await orderController.cancelOrder(mockReq, mockRes);
    
          expect(mockRes.status).toHaveBeenCalledWith(200);
          expect(mockRes.json).toHaveBeenCalledWith({
            message: 'Order canceled successfully.'
          });
        });
    
        test('should return error for non-cancellable order', async () => {
          const order = await Order.create({
            user: mockReq.user._id,
            products: [],
            totalAmount: 100,
            orderStatus: 'delivered'
          });
    
          mockReq.params.orderId = order._id;
    
          await orderController.cancelOrder(mockReq, mockRes);
    
          expect(mockRes.status).toHaveBeenCalledWith(404);
          expect(mockRes.json).toHaveBeenCalledWith({
            error: 'Order not found or not cancellable.'
          });
        });
      });
    });
    