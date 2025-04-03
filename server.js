require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const errorHandler = require('./middlewares/error');
const connectDB=require("./config/db")
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/provider', require('./routes/providerRoutes'));
app.use('/api/customer', require('./routes/customerRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
(
    async () => {
        await connectDB();
        app.listen(PORT, () =>{ 

            console.log(`Server running on port ${PORT}`)
        });
    }
)();
