const mongoose = require('mongoose');

/**
 * Permission override — per-role or per-user permission override within a channel.
 */
const permissionOverrideSchema = new mongoose.Schema(
  {
    target: { type: mongoose.Schema.Types.ObjectId, required: true }, // User or Role id
    targetType: { type: String, enum: ['user', 'role'], required: true },
    allow: [String], // e.g. ['send_messages', 'read_history']
    deny: [String],
  },
  { _id: false }
);

const channelSchema = new mongoose.Schema(
  {
    server: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Server',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Channel name is required'],
      trim: true,
      lowercase: true,
      minlength: [1, 'Channel name must be at least 1 character'],
      maxlength: [100, 'Channel name must be at most 100 characters'],
      match: [/^[a-z0-9-_]+$/, 'Channel name may only contain lowercase letters, numbers, hyphens, and underscores'],
    },
    type: {
      type: String,
      enum: ['text', 'voice', 'announcement'],
      default: 'text',
    },
    topic: {
      type: String,
      maxlength: [1024, 'Topic must be at most 1024 characters'],
      default: '',
    },
    // Slow mode: minimum seconds between messages per user (0 = disabled)
    slowMode: {
      type: Number,
      default: 0,
      min: 0,
      max: 21600, // 6 hours max
    },
    // Who can access this channel
    isPrivate: {
      type: Boolean,
      default: false,
    },
    permissionOverrides: [permissionOverrideSchema],
    // Last message snapshot for the channel list sidebar
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    // Pinned messages
    pinnedMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],
    // For voice channels
    voiceParticipants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    position: {
      type: Number,
      default: 0,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
channelSchema.index({ server: 1, name: 1 }, { unique: true });
channelSchema.index({ server: 1, position: 1 });

module.exports = mongoose.model('Channel', channelSchema);
