// server.js

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const authRoutes = require('./Routes/authRoutes');
const productRoutes = require('./Routes/productRoutes');
const cartRoutes = require('./Routes/cartRoutes');
const orderRoutes = require('./Routes/orderRoutes');
const paymentRoute = require('./Routes/paymentRoutes');
const setUser = require('./Middleware/setUser'); 
const categoryRoutes = require('./Routes/categoryRoutes');

require('dotenv').config();

const app = express();

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: false, 
  saveUninitialized: false, 
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
  }),
  cookie: {
    secure: false, 
    httpOnly: true, 
    maxAge: 1000 * 60 * 60 * 24, 
    sameSite: 'lax', 
  },
}));

app.use(cors({
  origin: 'http://localhost:5173', // Allow requests from the frontend
  credentials: true, // Allow cookies and authorization headers
}));

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Database connected'))
  .catch((err) => console.log(err));

// Middleware: Set user or guestId
app.use(setUser);

app.use('/api/users', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoute);
app.use('/api/categories', categoryRoutes);

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});