const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must be at most 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned in queries by default
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, 'Display name must be at most 50 characters'],
    },
    avatar: {
      type: String,
      default: '', // URL — Cloudinary / S3 / local upload
    },
    bio: {
      type: String,
      maxlength: [200, 'Bio must be at most 200 characters'],
      default: '',
    },
    // Online presence
    status: {
      type: String,
      enum: ['online', 'offline', 'away', 'do_not_disturb'],
      default: 'offline',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    // JWT refresh token (hashed) — supports single-device logout
    refreshToken: {
      type: String,
      select: false,
    },
    // Servers the user is a member of (back-reference for quick lookup)
    servers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Server',
      },
    ],
    // Users this person has blocked
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Accepted friends
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Incoming pending friend requests
    friendRequests: [
      {
        from: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
// email and username already have unique:true which creates their indexes.

// ─── Pre-save Hook: Hash password ──────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance Method: Compare passwords ───────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Instance Method: Safe public profile (no sensitive fields) ───────────────
userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
