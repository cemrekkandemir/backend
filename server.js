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
const wishlistRoutes = require('./Routes/wishlistRoutes');

require('dotenv').config();
const app = express();
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175']; 

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
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, 
}));

app.use(setUser);

app.use('/api/users', authRoutes);

app.use('/api/products', productRoutes);

app.use('/api/cart', cartRoutes);

app.use('/api/orders', orderRoutes);

app.use('/api/payment', paymentRoute);

app.use('/api/wishlist', wishlistRoutes);

app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'An internal server error occurred' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Database connected'))
  .catch((err) => console.log(err));
