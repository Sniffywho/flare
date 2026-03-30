require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const { initSocket } = require('./src/socket');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

// Create HTTP server so Express and Socket.IO share the same port
const server = http.createServer(app);

// Attach Socket.IO to the HTTP server (pass app so controllers can access io)
initSocket(server, app);

// Connect to MongoDB then start listening
connectDB().then(() => {
  server.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
}).catch((err) => {
  logger.error('Failed to connect to MongoDB', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});
