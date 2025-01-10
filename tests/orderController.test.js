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