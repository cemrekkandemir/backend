const authController = require('../Controller/authController');
const User = require('../Models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../Models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

process.env.ACCESS_TOKEN_SECRET = 'your-access-token-secret';
process.env.REFRESH_TOKEN_SECRET = 'your-refresh-token-secret';

describe('authController', () => {
    describe('signup', () => {
        it('should return a success message on valid signup', async () => {
            const req = { body: { name: 'test', email: 'test@example.com', password: 'password', address: '123 Test St' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            User.findOne.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashedPassword');
            User.prototype.save = jest.fn().mockResolvedValue({});

            await authController.signup(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ message: 'User registered successfully' });
        });

        it('should return an error message if email already exists', async () => {
            const req = { body: { name: 'test', email: 'test@example.com', password: 'password', address: '123 Test St' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            User.findOne.mockResolvedValue({ email: 'test@example.com' });

            await authController.signup(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Email already exists' });
        });

        it('should return an error message on internal server error', async () => {
            const req = { body: { name: 'test', email: 'test@example.com', password: 'password', address: '123 Test St' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            User.findOne.mockRejectedValue(new Error('Internal server error'));

            await authController.signup(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
        });
    });

    describe('login', () => {
        it('should return a success message on valid login', async () => {
            const req = { body: { email: 'test@example.com', password: 'password' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), cookie: jest.fn() };
            User.findOne.mockResolvedValue({ email: 'test@example.com', password: 'hashedPassword', _id: '123', role: 'user', name: 'test', address: '123 Test St' });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValueOnce('accessToken').mockReturnValueOnce('refreshToken');

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                accessToken: 'accessToken',
                user: {
                    name: 'test',
                    email: 'test@example.com',
                    address: '123 Test St'
                }
            });
            expect(res.cookie).toHaveBeenCalledWith('jwt', 'refreshToken', {
                httpOnly: true,
                sameSite: 'None',
                secure: true,
                maxAge: 24 * 60 * 60 * 1000
            });
        });

        it('should return an error message on invalid credentials', async () => {
            const req = { body: { email: 'test@example.com', password: 'wrongpassword' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            User.findOne.mockResolvedValue({ email: 'test@example.com', password: 'hashedPassword' });
            bcrypt.compare.mockResolvedValue(false);

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
        });

        it('should return an error message if user does not exist', async () => {
            const req = { body: { email: 'test@example.com', password: 'password' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            User.findOne.mockResolvedValue(null);

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
        });

        it('should return an error message on internal server error', async () => {
            const req = { body: { email: 'test@example.com', password: 'password' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            User.findOne.mockRejectedValue(new Error('Internal server error'));

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
        });
    });
});