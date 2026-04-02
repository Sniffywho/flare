const bcrypt = require('bcryptjs');
const User = require('../models/User');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/generateToken');
const { catchAsync, successResponse, sanitizeUser } = require('../utils/helpers');
const ApiError = require('../utils/ApiError');

// ─── Register ─────────────────────────────────────────────────────────────────
exports.register = catchAsync(async (req, res, next) => {
  const { username, email, password, displayName } = req.body;

  // Check for duplicate email or username
  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    const field = existing.email === email ? 'email' : 'username';
    return next(ApiError.conflict(`${field} is already in use`));
  }

  const user = await User.create({ username, email, password, displayName: displayName || username });

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Store hashed refresh token
  user.refreshToken = await bcrypt.hash(refreshToken, 10);
  await user.save({ validateBeforeSave: false });

  return successResponse(
    res,
    { user: sanitizeUser(user), accessToken, refreshToken },
    'Registration successful',
    201
  );
});

// ─── Login ────────────────────────────────────────────────────────────────────
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password +refreshToken');
  if (!user || !(await user.comparePassword(password))) {
    return next(ApiError.unauthorized('Invalid email or password'));
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = await bcrypt.hash(refreshToken, 10);
  user.status = 'online';
  await user.save({ validateBeforeSave: false });

  return successResponse(
    res,
    { user: sanitizeUser(user), accessToken, refreshToken },
    'Login successful'
  );
});

// ─── Refresh Access Token ─────────────────────────────────────────────────────
exports.refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return next(ApiError.badRequest('Refresh token required'));

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (_err) {
    return next(ApiError.unauthorized('Invalid or expired refresh token'));
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || !user.refreshToken) return next(ApiError.unauthorized('Session not found'));

  const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
  if (!isValid) return next(ApiError.unauthorized('Refresh token mismatch'));

  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  user.refreshToken = await bcrypt.hash(newRefreshToken, 10);
  await user.save({ validateBeforeSave: false });

  return successResponse(res, {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
exports.logout = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    user.refreshToken = null;
    user.status = 'offline';
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });
  }
  return successResponse(res, {}, 'Logged out successfully');
});

// ─── Get current user (me) ────────────────────────────────────────────────────
exports.getMe = catchAsync(async (req, res) => {
  return successResponse(res, { user: sanitizeUser(req.user) });
});

// ─── Change Password ──────────────────────────────────────────────────────────
exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    return next(ApiError.unauthorized('Current password is incorrect'));
  }

  user.password = newPassword;
  await user.save();

  return successResponse(res, {}, 'Password updated successfully');
});

// ─── OAuth Callback ───────────────────────────────────────────────────────────
exports.oauthCallback = catchAsync(async (req, res) => {
  // Passport populates req.user with the authenticated user
  const user = req.user;

  if (!user) {
    return res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = await bcrypt.hash(refreshToken, 10);
  user.status = 'online';
  await user.save({ validateBeforeSave: false });

  // Redirect to frontend with tokens as query params
  // Frontend will extract these and save them to localStorage
  const redirectUrl = new URL(`${process.env.CLIENT_URL}/`);
  redirectUrl.searchParams.set('accessToken', accessToken);
  redirectUrl.searchParams.set('refreshToken', refreshToken);
  redirectUrl.searchParams.set('userId', user._id);

  res.redirect(redirectUrl.toString());
});
