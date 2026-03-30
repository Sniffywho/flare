const Chat = require('../../models/Chat');
const Server = require('../../models/Server');
const logger = require('../../utils/logger');

/**
 * Socket.IO chat / server-room events.
 *
 * Client emits:
 *   'chat:join'          { chatId }         — join a specific chat room (e.g. when user opens a chat)
 *   'chat:leave'         { chatId }         — leave a chat room (tab closed, etc.)
 *   'server:join'        { serverId }       — join all channel rooms for a server
 *   'server:leave'       { serverId }       — leave all channel rooms for a server
 *   'channel:join'       { channelId }      — join a specific channel room
 *   'channel:leave'      { channelId }      — leave a channel room
 *   'voice:join'         { channelId }      — join a voice channel (WebRTC signaling room)
 *   'voice:leave'        { channelId }      — leave a voice channel
 *   'voice:signal'       { to, signal }     — WebRTC SDP / ICE signal relay
 *
 * Server emits:
 *   'chat:member_added'  — new member joined a group chat
 *   'chat:member_removed'— member removed from a group chat
 *   'server:member_joined'
 *   'server:member_left'
 *   'voice:user_joined'  { userId, channelId }
 *   'voice:user_left'    { userId, channelId }
 *   'voice:signal'       { from, signal }   — relayed WebRTC signal
 */
module.exports = (io, socket, onlineUsers) => {
  const userId = socket.user._id.toString();

  // ── Chat room management ────────────────────────────────────────────────────
  socket.on('chat:join', ({ chatId }) => {
    socket.join(`chat:${chatId}`);
  });

  socket.on('chat:leave', ({ chatId }) => {
    socket.leave(`chat:${chatId}`);
  });

  // ── Server / channel room management ──────────────────────────────────────
  socket.on('server:join', async ({ serverId }) => {
    try {
      const server = await Server.findById(serverId).select('members channelOrder');
      if (!server) return;

      const isMember = server.members.some((m) => m.user.toString() === userId);
      if (!isMember) return;

      socket.join(`server:${serverId}`);
      // Join all channel rooms for this server
      server.channelOrder.forEach((channelId) => {
        socket.join(`channel:${channelId}`);
      });

      socket.to(`server:${serverId}`).emit('server:member_joined', {
        serverId,
        userId,
        username: socket.user.username,
      });
    } catch (err) {
      logger.error(`server:join error: ${err.message}`);
    }
  });

  socket.on('server:leave', ({ serverId }) => {
    socket.leave(`server:${serverId}`);
    socket.to(`server:${serverId}`).emit('server:member_left', { serverId, userId });
  });

  socket.on('channel:join', ({ channelId }) => {
    socket.join(`channel:${channelId}`);
  });

  socket.on('channel:leave', ({ channelId }) => {
    socket.leave(`channel:${channelId}`);
  });

  // ── Voice channel (WebRTC signaling) ───────────────────────────────────────
  socket.on('voice:join', ({ channelId }) => {
    const room = `voice:${channelId}`;
    socket.join(room);

    // Tell others in the voice room that this user joined
    socket.to(room).emit('voice:user_joined', {
      userId,
      socketId: socket.id,
      username: socket.user.username,
      avatar: socket.user.avatar,
    });

    // Tell the joiner who is already in the room
    const socketsInRoom = io.sockets.adapter.rooms.get(room);
    const existingUsers = socketsInRoom
      ? [...socketsInRoom]
          .filter((sid) => sid !== socket.id)
          .map((sid) => {
            const s = io.sockets.sockets.get(sid);
            return s
              ? { socketId: sid, userId: s.user?._id.toString(), username: s.user?.username }
              : null;
          })
          .filter(Boolean)
      : [];

    socket.emit('voice:existing_users', { users: existingUsers, channelId });
  });

  socket.on('voice:leave', ({ channelId }) => {
    const room = `voice:${channelId}`;
    socket.leave(room);
    io.to(room).emit('voice:user_left', { userId, socketId: socket.id, channelId });
  });

  // Relay WebRTC SDP offers / answers / ICE candidates between peers
  socket.on('voice:signal', ({ to, signal }) => {
    io.to(to).emit('voice:signal', { from: socket.id, signal });
  });
};
