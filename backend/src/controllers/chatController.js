const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');
const { catchAsync, successResponse } = require('../utils/helpers');
const ApiError = require('../utils/ApiError');

// ─── Get all chats for current user ──────────────────────────────────────────
exports.getMyChats = catchAsync(async (req, res) => {
  const chats = await Chat.find({
    participants: req.user._id,
    isActive: true,
  })
    .populate('participants', 'username displayName avatar status lastSeen')
    .populate({
      path: 'lastMessage',
      populate: { path: 'sender', select: 'username displayName avatar' },
    })
    .sort({ updatedAt: -1 });

  return successResponse(res, { chats });
});

// ─── Get or create a private chat ────────────────────────────────────────────
exports.getOrCreatePrivateChat = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (userId === req.user._id.toString()) {
    return next(ApiError.badRequest('Cannot create a chat with yourself'));
  }

  const other = await User.findById(userId);
  if (!other) return next(ApiError.notFound('User not found'));

  // Check if blocked
  if (req.user.blockedUsers?.includes(userId)) {
    return next(ApiError.forbidden('You have blocked this user'));
  }

  const chat = await Chat.findOrCreatePrivate(req.user._id, userId);
  await chat.populate('participants', 'username displayName avatar status lastSeen');

  return successResponse(res, { chat }, 'Chat ready', 200);
});

// ─── Create a group chat ──────────────────────────────────────────────────────
exports.createGroupChat = catchAsync(async (req, res, next) => {
  const { name, participantIds, description } = req.body;

  if (!participantIds || participantIds.length < 1) {
    return next(ApiError.badRequest('A group chat needs at least 2 members'));
  }

  // Deduplicate and include creator
  const uniqueIds = [...new Set([req.user._id.toString(), ...participantIds])];

  const chat = await Chat.create({
    type: 'group',
    name,
    description: description || '',
    participants: uniqueIds,
    admins: [req.user._id],
    unreadCounts: uniqueIds.map((id) => ({ user: id, count: 0 })),
  });

  await chat.populate('participants', 'username displayName avatar status lastSeen');
  return successResponse(res, { chat }, 'Group chat created', 201);
});

// ─── Get a single chat by ID ──────────────────────────────────────────────────
exports.getChatById = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id)
    .populate('participants', 'username displayName avatar status lastSeen')
    .populate({
      path: 'lastMessage',
      populate: { path: 'sender', select: 'username displayName avatar' },
    });

  if (!chat) return next(ApiError.notFound('Chat not found'));

  const isMember = chat.participants.some(
    (p) => p._id.toString() === req.user._id.toString()
  );
  if (!isMember) return next(ApiError.forbidden('Not a member of this chat'));

  return successResponse(res, { chat });
});

// ─── Update group chat details ────────────────────────────────────────────────
exports.updateGroupChat = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(ApiError.notFound('Chat not found'));
  if (chat.type !== 'group') return next(ApiError.badRequest('Only group chats can be updated'));

  const isAdmin = chat.admins.some((a) => a.toString() === req.user._id.toString());
  if (!isAdmin) return next(ApiError.forbidden('Only admins can update group details'));

  const allowed = ['name', 'description', 'icon'];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) chat[field] = req.body[field];
  });

  await chat.save();
  await chat.populate('participants', 'username displayName avatar status lastSeen');
  return successResponse(res, { chat }, 'Group chat updated');
});

// ─── Add members to a group ───────────────────────────────────────────────────
exports.addMember = catchAsync(async (req, res, next) => {
  const { userId } = req.body;
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(ApiError.notFound('Chat not found'));
  if (chat.type !== 'group') return next(ApiError.badRequest('Cannot add members to private chats'));

  const isAdmin = chat.admins.some((a) => a.toString() === req.user._id.toString());
  if (!isAdmin) return next(ApiError.forbidden('Only admins can add members'));

  if (chat.participants.includes(userId)) {
    return next(ApiError.conflict('User is already a member'));
  }

  chat.participants.push(userId);
  chat.unreadCounts.push({ user: userId, count: 0 });
  await chat.save();
  await chat.populate('participants', 'username displayName avatar status');
  return successResponse(res, { chat }, 'Member added');
});

// ─── Remove member / leave group ─────────────────────────────────────────────
exports.removeMember = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(ApiError.notFound('Chat not found'));
  if (chat.type !== 'group') return next(ApiError.badRequest('Cannot remove members from private chats'));

  const isSelf = userId === req.user._id.toString();
  const isAdmin = chat.admins.some((a) => a.toString() === req.user._id.toString());

  if (!isSelf && !isAdmin) {
    return next(ApiError.forbidden('Only admins can remove other members'));
  }

  chat.participants.pull(userId);
  chat.unreadCounts = chat.unreadCounts.filter((uc) => uc.user.toString() !== userId);
  await chat.save();

  return successResponse(res, {}, isSelf ? 'Left group' : 'Member removed');
});

// ─── Reset unread count for current user in a chat ──────────────────────────
exports.markAsRead = catchAsync(async (req, res) => {
  await Chat.updateOne(
    { _id: req.params.id, 'unreadCounts.user': req.user._id },
    { $set: { 'unreadCounts.$.count': 0 } }
  );
  return successResponse(res, {}, 'Marked as read');
});
