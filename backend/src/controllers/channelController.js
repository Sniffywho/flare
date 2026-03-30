const Channel = require('../models/Channel');
const Message = require('../models/Message');
const Server = require('../models/Server');
const { catchAsync, successResponse } = require('../utils/helpers');
const ApiError = require('../utils/ApiError');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Confirm the requesting user is a member of the server that owns this channel.
 */
const assertServerMember = (server, userId) => {
  return server.members.some((m) => m.user.toString() === userId.toString());
};

// ─── Get all channels for a server ───────────────────────────────────────────
exports.getServerChannels = catchAsync(async (req, res, next) => {
  const server = await Server.findById(req.params.serverId);
  if (!server) return next(ApiError.notFound('Server not found'));
  if (!assertServerMember(server, req.user._id)) {
    return next(ApiError.forbidden('Not a member of this server'));
  }

  const channels = await Channel.find({ server: req.params.serverId, isArchived: false })
    .sort({ position: 1 })
    .populate('lastMessage');

  return successResponse(res, { channels });
});

// ─── Create a channel ─────────────────────────────────────────────────────────
exports.createChannel = catchAsync(async (req, res, next) => {
  const { name, type = 'text', topic, isPrivate, position } = req.body;
  const server = await Server.findById(req.params.serverId);
  if (!server) return next(ApiError.notFound('Server not found'));

  if (!server.hasRole(req.user._id, 'owner', 'admin')) {
    return next(ApiError.forbidden('Insufficient permissions'));
  }

  const channel = await Channel.create({
    server: server._id,
    name,
    type,
    topic: topic || '',
    isPrivate: isPrivate || false,
    position: position ?? server.channelOrder.length,
  });

  server.channelOrder.push(channel._id);
  await server.save();

  return successResponse(res, { channel }, 'Channel created', 201);
});

// ─── Get a single channel ─────────────────────────────────────────────────────
exports.getChannelById = catchAsync(async (req, res, next) => {
  const channel = await Channel.findById(req.params.channelId).populate('lastMessage');
  if (!channel) return next(ApiError.notFound('Channel not found'));

  const server = await Server.findById(channel.server);
  if (!assertServerMember(server, req.user._id)) {
    return next(ApiError.forbidden('Not a member of this server'));
  }

  return successResponse(res, { channel });
});

// ─── Update a channel ─────────────────────────────────────────────────────────
exports.updateChannel = catchAsync(async (req, res, next) => {
  const channel = await Channel.findById(req.params.channelId);
  if (!channel) return next(ApiError.notFound('Channel not found'));

  const server = await Server.findById(channel.server);
  if (!server.hasRole(req.user._id, 'owner', 'admin')) {
    return next(ApiError.forbidden('Insufficient permissions'));
  }

  const allowed = ['name', 'topic', 'slowMode', 'isPrivate', 'position'];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) channel[field] = req.body[field];
  });

  await channel.save();
  return successResponse(res, { channel }, 'Channel updated');
});

// ─── Delete a channel ─────────────────────────────────────────────────────────
exports.deleteChannel = catchAsync(async (req, res, next) => {
  const channel = await Channel.findById(req.params.channelId);
  if (!channel) return next(ApiError.notFound('Channel not found'));

  const server = await Server.findById(channel.server);
  if (!server.hasRole(req.user._id, 'owner', 'admin')) {
    return next(ApiError.forbidden('Insufficient permissions'));
  }

  // Remove from server channel order
  server.channelOrder.pull(channel._id);
  await server.save();

  // Soft-delete messages (keep them but detach from UI)
  await Message.updateMany({ chat: channel._id }, { isDeleted: true });
  await channel.deleteOne();

  return successResponse(res, {}, 'Channel deleted');
});

// ─── Get messages in a channel (reuses message logic with channel ref) ────────
exports.getChannelMessages = catchAsync(async (req, res, next) => {
  const channel = await Channel.findById(req.params.channelId);
  if (!channel) return next(ApiError.notFound('Channel not found'));

  const server = await Server.findById(channel.server);
  if (!assertServerMember(server, req.user._id)) {
    return next(ApiError.forbidden('Not a member of this server'));
  }

  const { before, limit = 30 } = req.query;
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const filter = { chat: channel._id };
  if (before) filter.createdAt = { $lt: new Date(before) };

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .populate('sender', 'username displayName avatar')
    .populate({
      path: 'replyTo',
      populate: { path: 'sender', select: 'username displayName' },
    });

  messages.reverse();

  return successResponse(res, {
    messages,
    hasMore: messages.length === pageSize,
    nextCursor: messages.length > 0 ? messages[0].createdAt.toISOString() : null,
  });
});
