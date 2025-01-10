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
            stock: 10,
            imageURL: 'test.jpg',           // Add required field
            brand: 'Test Brand',            // Add required field
            description: 'Test Description' // Add required field
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

          
          // Add address object to all Order.create() calls:
          const defaultAddress = {
            name: 'Test User',
            address: '123 Test St',
            city: 'Test City',
            postalCode: '12345',
            country: 'Test Country'
          };

          // Update each Order.create() call:
          const order = await Order.create({
            user: mockReq.user._id,
            products: [],
            totalAmount: 100,
            orderStatus: 'processing',
            address: defaultAddress  // Add this line
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
          // Add address object to all Order.create() calls:
          const defaultAddress = {
            name: 'Test User',
            address: '123 Test St',
            city: 'Test City',
            postalCode: '12345',
            country: 'Test Country'
          };

          // Update each Order.create() call:
          const order = await Order.create({
            user: mockReq.user._id,
            products: [],
            totalAmount: 100,
            orderStatus: 'processing',
            address: defaultAddress  // Add this line
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
      describe('cancelOrder', () => {
        test('should successfully cancel order', async () => {
          // Add address object to all Order.create() calls:
          const defaultAddress = {
            name: 'Test User',
            address: '123 Test St',
            city: 'Test City',
            postalCode: '12345',
            country: 'Test Country'
          };

          // Update each Order.create() call:
          const order = await Order.create({
            user: mockReq.user._id,
            products: [],
            totalAmount: 100,
            orderStatus: 'processing',
            address: defaultAddress  // Add this line
          });
    
          mockReq.params.orderId = order._id;
    
          await orderController.cancelOrder(mockReq, mockRes);
    
          expect(mockRes.status).toHaveBeenCalledWith(200);
          expect(mockRes.json).toHaveBeenCalledWith({
            message: 'Order canceled successfully.'
          });
        });
    
        test('should return error for non-cancellable order', async () => {
          // Add address object to all Order.create() calls:
          const defaultAddress = {
            name: 'Test User',
            address: '123 Test St',
            city: 'Test City',
            postalCode: '12345',
            country: 'Test Country'
          };

          // Update each Order.create() call:
          const order = await Order.create({
            user: mockReq.user._id,
            products: [],
            totalAmount: 100,
            orderStatus: 'in-transit',
            address: defaultAddress  // Add this line
          });
    
          mockReq.params.orderId = order._id;
    
          await orderController.cancelOrder(mockReq, mockRes);
    
          expect(mockRes.status).toHaveBeenCalledWith(404);
          expect(mockRes.json).toHaveBeenCalledWith({
            error: 'Order not found or not cancellable.'
          });
        });
      });
      describe('getAllOrders', () => {

        test('should return 404 when user has no orders', async () => {
          await orderController.getAllOrders(mockReq, mockRes);
      
          expect(mockRes.status).toHaveBeenCalledWith(404);
          expect(mockRes.json).toHaveBeenCalledWith({
            error: "No orders found for this user."
          });
        });
      
        test('should handle missing user ID', async () => {
          mockReq.user = null;
      
          await orderController.getAllOrders(mockReq, mockRes);
      
          expect(mockRes.status).toHaveBeenCalledWith(400);
          expect(mockRes.json).toHaveBeenCalledWith({
            error: "User ID is missing."
          });
        });
      });
      
      describe('getAllOrdersAdmin', () => {
        test('should get all orders for admin view', async () => {
          // Create test orders


          const orders = await Order.create([
            {
              user: new mongoose.Types.ObjectId(),
              products: [{
                productId: new mongoose.Types.ObjectId(),
                quantity: 1,
                priceAtPurchase: 100
              }],
              totalAmount: 100,
              orderStatus: 'processing',
              address: {
                name: 'Test User',
                address: '123 Test St',
                city: 'Test City',
                postalCode: '12345',
                country: 'Test Country'
              }
            },
            {
              user: new mongoose.Types.ObjectId(),
              products: [{
                productId: new mongoose.Types.ObjectId(),
                quantity: 2,
                priceAtPurchase: 50
              }],
              totalAmount: 100,
              orderStatus: 'delivered',
              address: {
                name: 'Test User 2',
                address: '456 Test Ave',
                city: 'Test City',
                postalCode: '12345',
                country: 'Test Country'
              }
            }
          ]);
      
          await orderController.getAllOrdersAdmin(mockReq, mockRes);
      
          expect(mockRes.status).toHaveBeenCalledWith(200);
          expect(mockRes.json).toHaveBeenCalledWith(
            expect.arrayContaining([
              expect.objectContaining({
                orderId: expect.any(mongoose.Types.ObjectId),
                user: expect.any(mongoose.Types.ObjectId),
                status: expect.stringMatching(/processing|delivered/),
                totalAmount: expect.any(Number),
                address: expect.objectContaining({
                  name: expect.any(String),
                  address: expect.any(String),
                  city: expect.any(String),
                  postalCode: expect.any(String),
                  country: expect.any(String)
                })
              })
            ])
          );
        });
      
        test('should return 404 when no orders exist', async () => {
          await orderController.getAllOrdersAdmin(mockReq, mockRes);
      
          expect(mockRes.status).toHaveBeenCalledWith(404);
          expect(mockRes.json).toHaveBeenCalledWith({
            error: "No orders found."
          });
        });
      
        test('should handle database errors', async () => {
          // Mock Order.find to throw error
          jest.spyOn(Order, 'find').mockImplementationOnce(() => {
            throw new Error('Database error');
          });
      
          await orderController.getAllOrdersAdmin(mockReq, mockRes);
      
          expect(mockRes.status).toHaveBeenCalledWith(500);
          expect(mockRes.json).toHaveBeenCalledWith({
            error: "Internal Server Error"
          });
        });
      });
    });
    