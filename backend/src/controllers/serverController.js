const Server = require('../models/Server');
const Channel = require('../models/Channel');
const User = require('../models/User');
const { catchAsync, successResponse, paginate } = require('../utils/helpers');
const ApiError = require('../utils/ApiError');

// ─── Create a server ──────────────────────────────────────────────────────────
exports.createServer = catchAsync(async (req, res) => {
  const { name, description, isPublic } = req.body;

  const server = await Server.create({
    name,
    description: description || '',
    isPublic: isPublic ?? true,
    owner: req.user._id,
    members: [{ user: req.user._id, role: 'owner' }],
  });

  // Create a default #general text channel
  const generalChannel = await Channel.create({
    server: server._id,
    name: 'general',
    type: 'text',
    topic: 'General discussion',
    position: 0,
  });

  server.channelOrder.push(generalChannel._id);
  await server.save();

  // Add server to user's server list
  await User.findByIdAndUpdate(req.user._id, { $push: { servers: server._id } });

  await server.populate('members.user', 'username displayName avatar status');
  return successResponse(res, { server }, 'Server created', 201);
});

// ─── Get all servers for the current user ────────────────────────────────────
exports.getMyServers = catchAsync(async (req, res) => {
  const servers = await Server.find({ 'members.user': req.user._id })
    .populate('members.user', 'username displayName avatar status')
    .select('-bannedUsers');
  return successResponse(res, { servers });
});

// ─── Get a server by ID ───────────────────────────────────────────────────────
exports.getServerById = catchAsync(async (req, res, next) => {
  const server = await Server.findById(req.params.id)
    .populate('members.user', 'username displayName avatar status lastSeen')
    .populate('channelOrder');

  if (!server) return next(ApiError.notFound('Server not found'));

  const isMember = server.members.some(
    (m) => m.user._id.toString() === req.user._id.toString()
  );
  if (!isMember && !server.isPublic) {
    return next(ApiError.forbidden('This server is private'));
  }

  return successResponse(res, { server });
});

// ─── Update server details ────────────────────────────────────────────────────
exports.updateServer = catchAsync(async (req, res, next) => {
  const server = await Server.findById(req.params.id);
  if (!server) return next(ApiError.notFound('Server not found'));

  if (!server.hasRole(req.user._id, 'owner', 'admin')) {
    return next(ApiError.forbidden('Insufficient permissions'));
  }

  const allowed = ['name', 'description', 'icon', 'banner', 'isPublic'];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) server[field] = req.body[field];
  });

  await server.save();
  return successResponse(res, { server }, 'Server updated');
});

// ─── Delete a server ──────────────────────────────────────────────────────────
exports.deleteServer = catchAsync(async (req, res, next) => {
  const server = await Server.findById(req.params.id);
  if (!server) return next(ApiError.notFound('Server not found'));

  if (server.owner.toString() !== req.user._id.toString()) {
    return next(ApiError.forbidden('Only the server owner can delete it'));
  }

  // Cascade: delete all channels
  await Channel.deleteMany({ server: server._id });
  // Remove from all members' server lists
  await User.updateMany(
    { servers: server._id },
    { $pull: { servers: server._id } }
  );
  await server.deleteOne();

  return successResponse(res, {}, 'Server deleted');
});

// ─── Join a server via invite code ────────────────────────────────────────────
exports.joinByInvite = catchAsync(async (req, res, next) => {
  const { inviteCode } = req.params;
  const server = await Server.findOne({ inviteCode });

  if (!server) return next(ApiError.notFound('Invalid invite code'));

  if (server.bannedUsers.includes(req.user._id)) {
    return next(ApiError.forbidden('You are banned from this server'));
  }

  const alreadyMember = server.members.some(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (alreadyMember) return successResponse(res, { server }, 'Already a member');

  if (server.members.length >= server.maxMembers) {
    return next(ApiError.forbidden('Server is full'));
  }

  server.members.push({ user: req.user._id, role: 'member' });
  await server.save();
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { servers: server._id } });

  return successResponse(res, { server }, 'Joined server');
});

// ─── Leave a server ───────────────────────────────────────────────────────────
exports.leaveServer = catchAsync(async (req, res, next) => {
  const server = await Server.findById(req.params.id);
  if (!server) return next(ApiError.notFound('Server not found'));

  if (server.owner.toString() === req.user._id.toString()) {
    return next(ApiError.badRequest('Owner cannot leave the server — transfer ownership or delete it'));
  }

  server.members = server.members.filter(
    (m) => m.user.toString() !== req.user._id.toString()
  );
  await server.save();
  await User.findByIdAndUpdate(req.user._id, { $pull: { servers: server._id } });

  return successResponse(res, {}, 'Left server');
});

// ─── Kick a member ────────────────────────────────────────────────────────────
exports.kickMember = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const server = await Server.findById(req.params.id);
  if (!server) return next(ApiError.notFound('Server not found'));

  if (!server.hasRole(req.user._id, 'owner', 'admin', 'moderator')) {
    return next(ApiError.forbidden('Insufficient permissions'));
  }

  server.members = server.members.filter((m) => m.user.toString() !== userId);
  await server.save();
  await User.findByIdAndUpdate(userId, { $pull: { servers: server._id } });

  return successResponse(res, {}, 'Member kicked');
});

// ─── Ban a member ─────────────────────────────────────────────────────────────
exports.banMember = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const server = await Server.findById(req.params.id);
  if (!server) return next(ApiError.notFound('Server not found'));

  if (!server.hasRole(req.user._id, 'owner', 'admin')) {
    return next(ApiError.forbidden('Insufficient permissions'));
  }

  server.members = server.members.filter((m) => m.user.toString() !== userId);
  if (!server.bannedUsers.includes(userId)) server.bannedUsers.push(userId);
  await server.save();
  await User.findByIdAndUpdate(userId, { $pull: { servers: server._id } });

  return successResponse(res, {}, 'Member banned');
});

// ─── Update a member's role ───────────────────────────────────────────────────
exports.updateMemberRole = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { role } = req.body;

  const server = await Server.findById(req.params.id);
  if (!server) return next(ApiError.notFound('Server not found'));
  if (!server.hasRole(req.user._id, 'owner')) {
    return next(ApiError.forbidden('Only the owner can change roles'));
  }

  const member = server.members.find((m) => m.user.toString() === userId);
  if (!member) return next(ApiError.notFound('Member not found'));

  member.role = role;
  await server.save();
  return successResponse(res, {}, 'Role updated');
});

// ─── Regenerate invite link ───────────────────────────────────────────────────
exports.regenerateInvite = catchAsync(async (req, res, next) => {
  const server = await Server.findById(req.params.id);
  if (!server) return next(ApiError.notFound('Server not found'));
  if (!server.hasRole(req.user._id, 'owner', 'admin')) {
    return next(ApiError.forbidden('Insufficient permissions'));
  }

  await server.regenerateInvite();
  return successResponse(res, { inviteCode: server.inviteCode });
});
