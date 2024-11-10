const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./Routes/authRoutes'); 
const productRoutes = require('./Routes/productRoutes');
require('dotenv').config();

const app = express();
app.use(express.json());

// Enable CORS
app.use(cors());

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Database connected'))
  .catch((err) => console.log(err));

// Routes to use
app.use('/api/users', authRoutes);
app.use('/api/products', productRoutes);

//cartRoutes
const cartRoutes = require('./Routes/cartRoutes'); 
app.use('/api/cart', cartRoutes);



// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
