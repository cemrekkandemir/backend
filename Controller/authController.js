// Controller/authController.js

const User = require('../Models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { mergeCarts } = require('../Middleware/cartMerger');
require('dotenv').config();

const generateAccessToken = (user) => {
  return jwt.sign(
    { email: user.email, id: user._id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '1d' } // Access token time
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { email: user.email, id: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '1d' } // Refresh token time 
  );
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password, address } = req.body;

     // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

     // Hash the user's password
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      address
    });

    // Save the new user to the database
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const oldSessionID = req.sessionID;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // If the user is a sales manager, we don't set cookies and tokens in the main site
    if (user.role === 'sales_manager') {
      // Just generate an access token but do not set refresh token cookie
      const accessToken = generateAccessToken(user);
      return res.status(200).json({
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          address: user.address,
          role: user.role,
          accessToken: accessToken
        }
      });
    }
    if (user.role === 'product_manager') {
      // Just generate an access token but do not set refresh token cookie
      const accessToken = generateAccessToken(user);
      return res.status(200).json({
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          address: user.address,
          role: user.role,
          accessToken: accessToken
        }
      });
    }

    if (user.role === 'product_manager') {
      // Just generate an access token but do not set refresh token cookie
      const accessToken = generateAccessToken(user);
      return res.status(200).json({
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          address: user.address,
          role: user.role,
          accessToken: accessToken
        }
      });
    }

    // For other users, proceed as normal: set the session, merge carts, set cookies
    req.session.userId = user._id;
    await mergeCarts(user._id, oldSessionID);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        address: user.address,
        role: user.role,
        accessToken: accessToken
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



// Refresh Token API
exports.refreshToken = async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) return res.sendStatus(401); // Unauthorized
  const refreshToken = cookies.jwt;

  try {
    const user = await User.findOne({ refreshToken });
    if (!user) return res.sendStatus(403); // Forbidden

    // Validate refresh token
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err || user.email !== decoded.email) return res.sendStatus(403);

      // Create a new access token
      const accessToken = jwt.sign(
        { email: user.email, id: user._id, role: user.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '30s' }
      );

      res.json({ accessToken });
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout function
exports.logout = async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) {
    return res.status(200).json({ message: 'Successfully logged out' }); 
  }

  const refreshToken = cookies.jwt;
  try {
    // Find the user with the given refresh token
    const user = await User.findOne({ refreshToken });
    if (!user) {
      // Clear the cookie even if the user is not found
      res.clearCookie('jwt', {
        httpOnly: true,
        sameSite: 'None',
        secure: true,
      });
      return res.status(200).json({ message: 'Successfully logged out' }); // Return 200 with a success message
    }

    // Clear the refresh token from the database
    user.refreshToken = '';
    await user.save();

    // Clear the cookie in the user's browser
    res.clearCookie('jwt', {
      httpOnly: true,
      sameSite: 'None',
      secure: true,
    });

    // Send 200 response with the logout message
    res.status(200).json({ message: 'Successfully logged out' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getUserTaxId = async (req, res) => {
  try {

    return res.status(200).json({ taxId: req.user.taxid });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};