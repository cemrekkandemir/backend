const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../Models/User');
const authController = require('../Controller/authController');

jest.mock('../Models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../Middleware/cartMerger', () => ({
  mergeCarts: jest.fn()
}));

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      cookies: {},
      session: {},
      sessionID: 'testSessionID'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      clearCookie: jest.fn()
    };
  });

  describe('signup', () => {
    it('should register a new user', async () => {
      req.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        address: '123 Test St'
      };

      User.findOne.mockResolvedValue(null);
      User.prototype.save = jest.fn().mockResolvedValue({});

      await authController.signup(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(User.prototype.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'User registered successfully' });
    });

    it('should return 400 if email already exists', async () => {
      req.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        address: '123 Test St'
      };

      User.findOne.mockResolvedValue({});

      await authController.signup(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email already exists' });
    });
  });

  describe('login', () => {  
    it('should return 401 if credentials are invalid', async () => {
      req.body = { email: 'test@example.com', password: 'wrongpassword' };
  
      User.findOne.mockResolvedValue(null);
  
      await authController.login(req, res);
  
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });
  });

  describe('logout', () => {
    it('should logout the user and clear the cookie', async () => {
      req.cookies.jwt = 'testRefreshToken';

      const user = { _id: 'testUserId', email: 'test@example.com', refreshToken: 'testRefreshToken' };
      User.findOne.mockResolvedValue(user);
      user.save = jest.fn().mockResolvedValue({});

      await authController.logout(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ refreshToken: 'testRefreshToken' });
      expect(user.save).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('jwt', {
        httpOnly: true,
        sameSite: 'None',
        secure: true
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Successfully logged out' });
    });

    it('should return 200 even if no refresh token is provided', async () => {
      await authController.logout(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Successfully logged out' });
    });
  });
});
