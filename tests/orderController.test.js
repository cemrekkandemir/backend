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