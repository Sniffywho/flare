const User = require('../models/User');
const { catchAsync, successResponse, sanitizeUser, paginate } = require('../utils/helpers');
const ApiError = require('../utils/ApiError');

// ─── Get own full profile (includes blockedUsers) ────────────────────────────
exports.getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('-password -refreshToken')
    .populate('blockedUsers', 'username displayName avatar');
  return successResponse(res, { user: sanitizeUser(user) });
});

// ─── Get user by ID ───────────────────────────────────────────────────────────
exports.getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password -refreshToken -blockedUsers');
  if (!user) return next(ApiError.notFound('User not found'));
  return successResponse(res, { user });
});

// ─── Search users by username ─────────────────────────────────────────────────
exports.searchUsers = catchAsync(async (req, res) => {
  const { q, page, limit } = req.query;
  if (!q || q.trim().length < 2) {
    return successResponse(res, { users: [] });
  }

  const filter = {
    username: { $regex: q.trim(), $options: 'i' },
    _id: { $ne: req.user._id }, // exclude self
  };

  const result = await paginate(User, filter, {
    page,
    limit,
    sort: { username: 1 },
  });

  const users = result.docs.map((u) => sanitizeUser(u));
  return successResponse(res, { users, ...result, docs: undefined });
});

// ─── Update own profile ───────────────────────────────────────────────────────
exports.updateProfile = catchAsync(async (req, res) => {
  const allowed = ['displayName', 'bio', 'avatar', 'status'];
  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  }).select('-password -refreshToken');

  return successResponse(res, { user: sanitizeUser(user) }, 'Profile updated');
});

// ─── Block / Unblock a user ───────────────────────────────────────────────────
exports.blockUser = catchAsync(async (req, res, next) => {
  const { id: targetId } = req.params;
  if (targetId === req.user._id.toString()) {
    return next(ApiError.badRequest('You cannot block yourself'));
  }

  const target = await User.findById(targetId);
  if (!target) return next(ApiError.notFound('User not found'));

  const me = await User.findById(req.user._id);
  const alreadyBlocked = me.blockedUsers.includes(targetId);

  if (alreadyBlocked) {
    me.blockedUsers.pull(targetId);
    await me.save();
    return successResponse(res, {}, 'User unblocked');
  }

  me.blockedUsers.push(targetId);
  await me.save();
  return successResponse(res, {}, 'User blocked');
});

// ─── Get online status of a user ─────────────────────────────────────────────
exports.getUserStatus = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('status lastSeen username');
  if (!user) return next(ApiError.notFound('User not found'));
  return successResponse(res, {
    userId: user._id,
    status: user.status,
    lastSeen: user.lastSeen,
  });
});
