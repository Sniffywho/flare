const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { catchAsync, successResponse } = require('../utils/helpers');
const ApiError = require('../utils/ApiError');
const { getRedisClient } = require('../config/redis');

// ─── Send a message ───────────────────────────────────────────────────────────
exports.sendMessage = catchAsync(async (req, res, next) => {
  const { chatId, content, type = 'text', replyTo, attachments } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(ApiError.notFound('Chat not found'));

  const isMember = chat.participants.some(
    (p) => p.toString() === req.user._id.toString()
  );
  if (!isMember) return next(ApiError.forbidden('Not a member of this chat'));

  const message = await Message.create({
    chat: chatId,
    sender: req.user._id,
    content: content || '',
    type,
    replyTo: replyTo || null,
    attachments: attachments || [],
  });

  // Update chat's lastMessage and bump unread for all other participants
  await Chat.updateOne(
    { _id: chatId },
    {
      $set: { lastMessage: message._id },
      $inc: { 'unreadCounts.$[elem].count': 1 },
    },
    {
      arrayFilters: [{ 'elem.user': { $ne: req.user._id } }],
    }
  );

  await message.populate('sender', 'username displayName avatar');
  if (message.replyTo) {
    await message.populate({
      path: 'replyTo',
      populate: { path: 'sender', select: 'username displayName' },
    });
  }

  // Invalidate Redis cache for chat messages (if Redis is available)
  const redis = getRedisClient();
  if (redis) await redis.del(`messages:${chatId}:page:1`);

  return successResponse(res, { message }, 'Message sent', 201);
});

// ─── Get messages for a chat (paginated, cursor-based for infinite scroll) ───
exports.getMessages = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  const { before, limit = 30 } = req.query; // `before` = message createdAt ISO string

  const chat = await Chat.findById(chatId);
  if (!chat) return next(ApiError.notFound('Chat not found'));

  const isMember = chat.participants.some(
    (p) => p.toString() === req.user._id.toString()
  );
  if (!isMember) return next(ApiError.forbidden('Not a member of this chat'));

  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const filter = { chat: chatId };
  if (before) filter.createdAt = { $lt: new Date(before) };

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .populate('sender', 'username displayName avatar')
    .populate({
      path: 'replyTo',
      populate: { path: 'sender', select: 'username displayName' },
    });

  // Reverse so client gets chronological order (oldest → newest)
  messages.reverse();

  const hasMore = messages.length === pageSize;

  return successResponse(res, {
    messages,
    hasMore,
    nextCursor: messages.length > 0 ? messages[0].createdAt.toISOString() : null,
  });
});

// ─── Edit a message ───────────────────────────────────────────────────────────
exports.editMessage = catchAsync(async (req, res, next) => {
  const { content } = req.body;
  const message = await Message.findById(req.params.id);

  if (!message) return next(ApiError.notFound('Message not found'));
  if (message.sender.toString() !== req.user._id.toString()) {
    return next(ApiError.forbidden('You can only edit your own messages'));
  }
  if (message.isDeleted) return next(ApiError.badRequest('Cannot edit a deleted message'));

  // Store edit history
  message.editHistory.push({ content: message.content, editedAt: new Date() });
  message.content = content;
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();

  await message.populate('sender', 'username displayName avatar');
  return successResponse(res, { message }, 'Message edited');
});

// ─── Delete a message (soft delete) ──────────────────────────────────────────
exports.deleteMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.id);
  if (!message) return next(ApiError.notFound('Message not found'));

  const chat = await Chat.findById(message.chat);
  const isAdmin =
    chat?.admins?.some((a) => a.toString() === req.user._id.toString()) ?? false;

  if (message.sender.toString() !== req.user._id.toString() && !isAdmin) {
    return next(ApiError.forbidden('You can only delete your own messages'));
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  await message.save();

  return successResponse(res, { messageId: message._id }, 'Message deleted');
});

// ─── Add / toggle emoji reaction ─────────────────────────────────────────────
exports.reactToMessage = catchAsync(async (req, res, next) => {
  const { emoji } = req.body;
  if (!emoji) return next(ApiError.badRequest('Emoji is required'));

  const message = await Message.findById(req.params.id);
  if (!message) return next(ApiError.notFound('Message not found'));

  const userId = req.user._id;
  const existing = message.reactions.find((r) => r.emoji === emoji);

  if (existing) {
    const idx = existing.users.findIndex((u) => u.toString() === userId.toString());
    if (idx > -1) {
      // Toggle off
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
  return successResponse(res, { reactions: message.reactions }, 'Reaction updated');
});

// ─── Pin / Unpin a message ────────────────────────────────────────────────────
exports.pinMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.id);
  if (!message) return next(ApiError.notFound('Message not found'));

  const chat = await Chat.findById(message.chat);
  const isAdmin = chat?.admins?.some((a) => a.toString() === req.user._id.toString());
  const isMember = chat?.participants?.some((p) => p.toString() === req.user._id.toString());
  if (!isMember) return next(ApiError.forbidden('Not a member of this chat'));

  message.isPinned = !message.isPinned;
  await message.save();

  // Sync pinnedMessages array on the Chat document
  if (message.isPinned) {
    await Chat.updateOne({ _id: message.chat }, { $addToSet: { pinnedMessages: message._id } });
  } else {
    await Chat.updateOne({ _id: message.chat }, { $pull: { pinnedMessages: message._id } });
  }

  return successResponse(res, { isPinned: message.isPinned });
});

// ─── Search messages in a chat ────────────────────────────────────────────────
exports.searchMessages = catchAsync(async (req, res, next) => {
  const { chatId, q, limit = 20 } = req.query;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(ApiError.notFound('Chat not found'));

  const isMember = chat.participants.some(
    (p) => p.toString() === req.user._id.toString()
  );
  if (!isMember) return next(ApiError.forbidden('Not a member of this chat'));

  const messages = await Message.find({
    chat: chatId,
    isDeleted: false,
    $text: { $search: q },
  })
    .sort({ score: { $meta: 'textScore' } })
    .limit(parseInt(limit, 10))
    .populate('sender', 'username displayName avatar');

  return successResponse(res, { messages });
});

// ─── Upload file attachment ──────────────────────────────────────────────────
exports.uploadFile = catchAsync(async (req, res, next) => {
  const cloudinary = require('../config/cloudinary');

  if (!req.file) {
    return next(ApiError.badRequest('No file provided'));
  }

  const file = req.file;

  // Determine resource type based on MIME type
  let resourceType = 'auto';
  if (file.mimetype.startsWith('image/')) {
    resourceType = 'image';
  } else if (file.mimetype.startsWith('video/')) {
    resourceType = 'video';
  } else if (file.mimetype.startsWith('audio/')) {
    resourceType = 'video'; // Cloudinary treats audio as video resource
  }

  // Upload to Cloudinary from buffer
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: 'chatapp/attachments',
        public_id: `${Date.now()}_${file.originalname.split('.')[0]}`,
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          // Return attachment metadata
          resolve(successResponse(
            res,
            {
              url: result.secure_url,
              type: getAttachmentType(file.mimetype),
              filename: file.originalname,
              size: file.size,
              mimeType: file.mimetype,
              width: result.width,
              height: result.height,
            },
            'File uploaded successfully',
            201
          ));
        }
      }
    );

    // Stream file buffer to Cloudinary
    uploadStream.end(file.buffer);
  });
});

// Helper function to determine attachment type
function getAttachmentType(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'file';
}
