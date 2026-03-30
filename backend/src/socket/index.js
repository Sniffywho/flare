const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/generateToken');
const User = require('../models/User');
const logger = require('../utils/logger');

const presenceHandler = require('./handlers/presenceHandler');
const messageHandler = require('./handlers/messageHandler');
const chatHandler = require('./handlers/chatHandler');

/**
 * A simple in-memory map from userId → Set<socketId>.
 * Lets us track multiple browser tabs / devices per user.
 *
 * In a multi-instance deployment, replace this with a Redis-backed
 * solution (e.g., Redis pub/sub + socket.io-redis adapter).
 */
const onlineUsers = new Map(); // userId → Set<socketId>

/**
 * Attach Socket.IO to the HTTP server and set up all event handlers.
 *
 * @param {import('http').Server} httpServer
 * @param {import('express').Application} app
 */
const initSocket = (httpServer, app) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Expose io to Express controllers via req.app.get('io')
  if (app) app.set('io', io);

  // ── Authentication middleware ─────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) return next(new Error('Authentication token missing'));

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('-password -refreshToken');
      if (!user) return next(new Error('User not found'));

      socket.user = user; // attach user to every socket
      next();
    } catch (err) {
      logger.warn(`Socket auth failed: ${err.message}`);
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection ────────────────────────────────────────────────────────────
  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    logger.info(`Socket connected: ${socket.id} (user: ${userId})`);

    // Join personal room for targeted events (friend requests, etc.)
    socket.join(`user:${userId}`);

    // Register presence
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // Mark user online in DB and broadcast
    await presenceHandler.setOnline(io, socket, onlineUsers);

    // ── Register domain handlers ────────────────────────────────────────────
    messageHandler(io, socket, onlineUsers);
    chatHandler(io, socket, onlineUsers);

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (reason: ${reason})`);
      onlineUsers.get(userId)?.delete(socket.id);
      if (onlineUsers.get(userId)?.size === 0) {
        onlineUsers.delete(userId);
        await presenceHandler.setOffline(io, socket);
      }
    });

    // ── Error passthrough ─────────────────────────────────────────────────
    socket.on('error', (err) => {
      logger.error(`Socket error (${socket.id}): ${err.message}`);
    });
  });

  return io;
};

module.exports = { initSocket, onlineUsers };
