const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * Member sub-document — user reference + role within this server.
 */
const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'moderator', 'member'],
      default: 'member',
    },
    nickname: {
      type: String,
      maxlength: 50,
      default: '',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const serverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Server name is required'],
      trim: true,
      minlength: [2, 'Server name must be at least 2 characters'],
      maxlength: [100, 'Server name must be at most 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description must be at most 500 characters'],
      default: '',
    },
    icon: {
      type: String,
      default: '',
    },
    banner: {
      type: String,
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [memberSchema],
    // Channels are stored in a separate collection; this is just for ordering
    channelOrder: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
      },
    ],
    // Invite system
    inviteCode: {
      type: String,
      unique: true,
      default: () => uuidv4().split('-')[0], // short 8-char code
    },
    inviteExpiry: {
      type: Date,
      default: null, // null = never expires
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    // Moderation
    bannedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    maxMembers: {
      type: Number,
      default: 500,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
// inviteCode already has unique:true which creates its index.
serverSchema.index({ owner: 1 });
serverSchema.index({ 'members.user': 1 });
serverSchema.index({ name: 'text', description: 'text' }); // search

// ─── Virtual: member count ─────────────────────────────────────────────────────
serverSchema.virtual('memberCount').get(function () {
  return this.members ? this.members.filter((m) => !m.isBanned).length : 0;
});

// ─── Instance method: check if a user has a given role or higher ──────────────
serverSchema.methods.hasRole = function (userId, ...roles) {
  const member = this.members.find((m) => m.user.toString() === userId.toString());
  return member ? roles.includes(member.role) : false;
};

// ─── Static: regenerate invite code ───────────────────────────────────────────
serverSchema.methods.regenerateInvite = async function () {
  this.inviteCode = uuidv4().split('-')[0];
  return this.save();
};

module.exports = mongoose.model('Server', serverSchema);
