const mongoose = require('mongoose');

/**
 * Chat model — handles both private (DM) and group conversations.
 *
 * type: 'private' — exactly 2 participants, no name/icon required
 * type: 'group'   — 2+ participants, has a name and optional icon
 */
const chatSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['private', 'group'],
      required: true,
      default: 'private',
    },
    // For group chats
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Chat name must be at most 100 characters'],
    },
    icon: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      maxlength: [300, 'Description must be at most 300 characters'],
      default: '',
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    // Group admin(s)
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Snapshot of the last message for sidebar previews
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    // Track per-participant unread count
    unreadCounts: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        count: { type: Number, default: 0 },
      },
    ],
    // Pinned messages
    pinnedMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],
    // For group chats: users who have been muted by an admin
    mutedParticipants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
chatSchema.index({ participants: 1 });
chatSchema.index({ type: 1, participants: 1 });
chatSchema.index({ updatedAt: -1 }); // sort chats by recent activity

// ─── Static: find or create a private chat between two users ─────────────────
chatSchema.statics.findOrCreatePrivate = async function (userAId, userBId) {
  let chat = await this.findOne({
    type: 'private',
    participants: { $all: [userAId, userBId], $size: 2 },
  });
  if (!chat) {
    chat = await this.create({
      type: 'private',
      participants: [userAId, userBId],
    });
  }
  return chat;
};

module.exports = mongoose.model('Chat', chatSchema);
