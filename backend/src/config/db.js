const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB using the URI from environment variables.
 * Retries once on failure before rejecting.
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not defined in environment variables');

  mongoose.set('strictQuery', true);

  try {
    const conn = await mongoose.connect(uri, {
      // Mongoose 7+ no longer needs useNewUrlParser / useUnifiedTopology
      serverSelectionTimeoutMS: 10000,
    });
    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`);
    throw err;
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
};

module.exports = { connectDB };
