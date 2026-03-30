const User = require('../../models/User');
const Chat = require('../../models/Chat');
const logger = require('../../utils/logger');

/**
 * Mark user as online, join their personal room, auto-join all their chat rooms,
 * and broadcast their status to anyone who shares a chat with them.
 */
const setOnline = async (io, socket, onlineUsers) => {
  const userId = socket.user._id.toString();

  try {
    // Update DB status
    await User.findByIdAndUpdate(userId, { status: 'online' });

    // Personal room — for direct notifications (e.g. friend requests, DM pings)
    socket.join(`user:${userId}`);

    // Auto-join all chat rooms the user is part of
    const chats = await Chat.find({ participants: userId, isActive: true }).select('_id');
    chats.forEach((chat) => socket.join(`chat:${chat._id}`));

    // Notify other users in shared chats
    socket.to(`user:${userId}`).emit('presence:update', {
      userId,
      status: 'online',
    });

    // Broadcast to all rooms this socket is in (except its own personal room)
    const rooms = [...socket.rooms].filter((r) => r !== socket.id && r !== `user:${userId}`);
    rooms.forEach((room) => {
      socket.to(room).emit('presence:update', { userId, status: 'online' });
    });
  } catch (err) {
    logger.error(`presenceHandler.setOnline error: ${err.message}`);
  }
};

/**
 * Mark user offline, update lastSeen, and broadcast to shared rooms.
 */
const setOffline = async (io, socket) => {
  const userId = socket.user._id.toString();
  const lastSeen = new Date();

  try {
    await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen });

    // Broadcast to all rooms the socket was in
    const rooms = [...socket.rooms].filter((r) => r !== socket.id);
    rooms.forEach((room) => {
      io.to(room).emit('presence:update', { userId, status: 'offline', lastSeen });
    });
  } catch (err) {
    logger.error(`presenceHandler.setOffline error: ${err.message}`);
  }
};

/**
 * Handle client-requested status changes (e.g. 'away', 'do_not_disturb').
 *
 * Emit: 'presence:set_status' { status: 'away' | 'do_not_disturb' | 'online' }
 */
const handleStatusChange = async (io, socket) => {
  socket.on('presence:set_status', async ({ status }) => {
    const allowed = ['online', 'away', 'do_not_disturb'];
    if (!allowed.includes(status)) return;

    const userId = socket.user._id.toString();
    try {
      await User.findByIdAndUpdate(userId, { status });
      const rooms = [...socket.rooms].filter((r) => r !== socket.id);
      rooms.forEach((room) => {
        io.to(room).emit('presence:update', { userId, status });
      });
    } catch (err) {
      logger.error(`presenceHandler.handleStatusChange error: ${err.message}`);
    }
  });
};

module.exports = { setOnline, setOffline, handleStatusChange };
