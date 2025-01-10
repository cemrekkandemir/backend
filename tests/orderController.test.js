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