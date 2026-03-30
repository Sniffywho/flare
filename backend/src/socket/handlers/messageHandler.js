const Message = require('../../models/Message');
const Chat = require('../../models/Chat');
const Channel = require('../../models/Channel');
const Server = require('../../models/Server');
const logger = require('../../utils/logger');

/**
 * Socket.IO message events.
 *
 * Client emits:
 *   'message:send'     { chatId, content, type?, replyTo?, attachments? }
 *   'message:edit'     { messageId, content }
 *   'message:delete'   { messageId }
 *   'message:react'    { messageId, emoji }
 *   'message:typing'   { chatId }
 *   'message:stop_typing' { chatId }
 *   'message:read'     { chatId, messageId }
 *   'message:delivered'{ chatId }
 *
 * Server emits:
 *   'message:new'      — broadcast to chat room
 *   'message:edited'   — broadcast to chat room
 *   'message:deleted'  — broadcast to chat room
 *   'message:reaction' — broadcast to chat room
 *   'message:typing'   — broadcast to chat room (except sender)
 *   'message:stop_typing' — broadcast to chat room (except sender)
 *   'message:seen'     — broadcast to chat room
 *   'message:delivered'— broadcast to sender
 */
module.exports = (io, socket, onlineUsers) => {
  const userId = socket.user._id;

  // ── Send ────────────────────────────────────────────────────────────────────
  socket.on('message:send', async (data) => {
    try {
      const { chatId, content, type = 'text', replyTo, attachments } = data;

      // Support both DM/group Chat documents and server Channel documents
      let isChannel = false;
      const chat = await Chat.findById(chatId);

      if (!chat) {
        // Try as a Channel (server text channel)
        const channel = await Channel.findById(chatId);
        if (!channel) return socket.emit('error', { message: 'Chat not found' });

        const server = await Server.findById(channel.server).select('members');
        if (!server) return socket.emit('error', { message: 'Server not found' });

        const isMember = server.members.some((m) => m.user.toString() === userId.toString());
        if (!isMember) return socket.emit('error', { message: 'Not a member of this server' });

        isChannel = true;
      } else {
        const isMember = chat.participants.some((p) => p.toString() === userId.toString());
        if (!isMember) return socket.emit('error', { message: 'Not a member of this chat' });
      }

      const message = await Message.create({
        chat: chatId,
        sender: userId,
        content: content || '',
        type,
        replyTo: replyTo || null,
        attachments: attachments || [],
      });

      // Update lastMessage on the chat (DM/group only) + bump unread for others
      if (!isChannel) {
        await Chat.updateOne(
          { _id: chatId },
          {
            $set: { lastMessage: message._id },
            $inc: { 'unreadCounts.$[elem].count': 1 },
          },
          { arrayFilters: [{ 'elem.user': { $ne: userId } }] }
        );
      } else {
        await Channel.updateOne({ _id: chatId }, { $set: { lastMessage: message._id } });
      }

      await message.populate('sender', 'username displayName avatar');
      if (message.replyTo) {
        await message.populate({
          path: 'replyTo',
          populate: { path: 'sender', select: 'username displayName' },
        });
      }

      // Broadcast to everyone in the chat room (including sender for confirmation)
      io.to(`chat:${chatId}`).emit('message:new', { message });

      // Mark as delivered to all currently-online participants (DM/group only)
      if (!isChannel) {
        const deliveredTo = chat.participants
          .map((p) => p.toString())
          .filter((p) => p !== userId.toString() && onlineUsers.has(p));

        if (deliveredTo.length > 0) {
          await Message.findByIdAndUpdate(message._id, { $addToSet: { deliveredTo: { $each: deliveredTo } } });
          socket.emit('message:delivered', { messageId: message._id, deliveredTo });
        }
      }
    } catch (err) {
      logger.error(`message:send error: ${err.message}`);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // ── Edit ────────────────────────────────────────────────────────────────────
  socket.on('message:edit', async ({ messageId, content }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return socket.emit('error', { message: 'Message not found' });
      if (message.sender.toString() !== userId.toString()) {
        return socket.emit('error', { message: 'Cannot edit another user\'s message' });
      }

      message.editHistory.push({ content: message.content });
      message.content = content;
      message.isEdited = true;
      message.editedAt = new Date();
      await message.save();

      io.to(`chat:${message.chat}`).emit('message:edited', {
        messageId,
        content,
        editedAt: message.editedAt,
      });
    } catch (err) {
      logger.error(`message:edit error: ${err.message}`);
      socket.emit('error', { message: 'Failed to edit message' });
    }
  });

  // ── Delete ──────────────────────────────────────────────────────────────────
  socket.on('message:delete', async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return socket.emit('error', { message: 'Message not found' });
      if (message.sender.toString() !== userId.toString()) {
        return socket.emit('error', { message: 'Cannot delete another user\'s message' });
      }

      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();

      io.to(`chat:${message.chat}`).emit('message:deleted', { messageId });
    } catch (err) {
      logger.error(`message:delete error: ${err.message}`);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  });

  // ── Reactions ───────────────────────────────────────────────────────────────
  socket.on('message:react', async ({ messageId, emoji }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      const existing = message.reactions.find((r) => r.emoji === emoji);
      if (existing) {
        const idx = existing.users.findIndex((u) => u.toString() === userId.toString());
        if (idx > -1) {
          existing.users.splice(idx, 1);
          if (existing.users.length === 0) {
            message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
          }
        } else {
          existing.users.push(userId);
        }
      } else {
        message.reactions.push({ emoji, users: [userId] });
      }

      await message.save();
      io.to(`chat:${message.chat}`).emit('message:reaction', {
        messageId,
        reactions: message.reactions,
      });
    } catch (err) {
      logger.error(`message:react error: ${err.message}`);
    }
  });

  // ── Typing indicators ───────────────────────────────────────────────────────
  socket.on('message:typing', ({ chatId }) => {
    socket.to(`chat:${chatId}`).emit('message:typing', {
      chatId,
      userId: userId.toString(),
      username: socket.user.username,
    });
  });

  socket.on('message:stop_typing', ({ chatId }) => {
    socket.to(`chat:${chatId}`).emit('message:stop_typing', {
      chatId,
      userId: userId.toString(),
    });
  });

  // ── Read receipts ───────────────────────────────────────────────────────────
  socket.on('message:read', async ({ chatId, messageId }) => {
    try {
      const readAt = new Date();

      // Mark all messages up to (and including) messageId as read
      await Message.updateMany(
        {
          chat: chatId,
          'readBy.user': { $ne: userId },
          createdAt: { $lte: (await Message.findById(messageId).select('createdAt'))?.createdAt || readAt },
        },
        { $push: { readBy: { user: userId, readAt } } }
      );

      // Reset unread counter for this user in the chat
      await Chat.updateOne(
        { _id: chatId, 'unreadCounts.user': userId },
        { $set: { 'unreadCounts.$.count': 0 } }
      );

      socket.to(`chat:${chatId}`).emit('message:seen', {
        chatId,
        messageId,
        userId: userId.toString(),
        readAt,
      });
    } catch (err) {
      logger.error(`message:read error: ${err.message}`);
    }
  });
};
