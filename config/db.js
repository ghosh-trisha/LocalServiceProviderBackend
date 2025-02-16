const mongoose = require('mongoose');
const logger = require('../utils/logger'); // Optional logger

const connectDB = async () => {
  try {
    
    // Event listeners for connection monitoring
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection established');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection disconnected');
    });

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

  } catch (err) {
    console.error(`Database connection error: ${err.message}`);
    process.exit(1);
  }
};

// Handle SIGINT for graceful shutdown
//when press crt+c
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB;