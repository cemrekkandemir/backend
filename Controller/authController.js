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

// Login API with Access and Refresh Token
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Store old sessionID
    const oldSessionID = req.sessionID;
    console.log("Session ID before login:", oldSessionID);

    // Find the user 
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set userId without recreating session
    req.session.userId = user._id;

    // Merge baskets
    await mergeCarts(user._id, oldSessionID);
    console.log(`Carts merged for user ${user._id} and guest ${oldSessionID}`);

    // Create access token
    const accessToken = generateAccessToken(user);

    // Create refresh token
    const refreshToken = generateRefreshToken(user);

    // Assign refresh token to user and save
    user.refreshToken = refreshToken;
    await user.save();

    // Store refresh token as HTTP-only cookie
    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // Geliştirme ortamında false
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // Return the access token and user information
    res.status(200).json({
      accessToken,
      user: {
        name: user.name,
        email: user.email,
        address: user.address
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