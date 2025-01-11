const { mockPayment, generateInvoice } = require('../Controller/paymentController');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

// Mock dependencies
jest.mock('nodemailer');
jest.mock('pdfkit');

describe('Payment Controller', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('mockPayment', () => {
        beforeEach(() => {
            mockReq = {
                body: {
                    nameOnCard: 'John Doe',
                    cardNumber: '4532015112830366',
                    expiry: '12/25',
                    cvv: '123',
                    amount: 100
                }
            };
        });

        test('should process valid payment successfully', async () => {
            await mockPayment(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Payment successful',
                transactionId: expect.any(String),
                orderDetails: expect.objectContaining({
                    id: expect.any(String),
                    amount: 100
                })
            });
        });

        test('should reject invalid card number', async () => {
            mockReq.body.cardNumber = '1234567890';
            
            await mockPayment(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Invalid card number'
            });
        });

        test('should reject expired card', async () => {
            mockReq.body.expiry = '01/20';
            
            await mockPayment(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Card is expired'
            });
        });
    });

    describe('generateInvoice', () => {
        beforeEach(() => {
            mockReq = {
                body: {
                    user: {
                        name: 'John Doe',
                        email: 'john@example.com',
                        address: '123 Test St'
                    },
                    orderDetails: {
                        id: 'ORDER-123',
                        amount: 100
                    },
                    transactionId: 'TXN-123'
                }
            };

            // Mock PDF generation
            PDFDocument.mockImplementation(() => ({
                on: jest.fn((event, callback) => {
                    if (event === 'end') callback();
                }),
                text: jest.fn().mockReturnThis(),
                fontSize: jest.fn().mockReturnThis(),
                end: jest.fn()
            }));

            // Mock email transport
            nodemailer.createTransport.mockReturnValue({
                sendMail: jest.fn().mockResolvedValue(true)
            });
        });

        test('should generate invoice and send email successfully', async () => {
            await generateInvoice(mockReq, mockRes);

            expect(nodemailer.createTransport).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Invoice sent successfully'
            });
        });

        test('should handle invalid input data', async () => {
            delete mockReq.body.user.email;
            
            await generateInvoice(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: expect.any(String)
            });
        });

        test('should handle email sending error', async () => {
            const mockError = new Error('Email sending failed');
            nodemailer.createTransport.mockReturnValue({
                sendMail: jest.fn().mockRejectedValue(mockError)
            });

            await generateInvoice(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Error sending email',
                error: mockError
            });
        });
    });
});