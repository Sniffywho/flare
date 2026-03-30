const mongoose = require('mongoose');

/**
 * Reaction sub-document: { emoji: '👍', users: [userId, ...] }
 */
const reactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false }
);

/**
 * Attachment sub-document — image, video, file, audio, etc.
 */
const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'file'],
      required: true,
    },
    filename: String,
    size: Number,  // bytes
    mimeType: String,
    width: Number, // for images/videos
    height: Number,
  },
  { _id: false }
);

/**
 * ReadReceipt sub-document — tracks who has read up to when.
 */
const readReceiptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    // null for system messages
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Message type
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file', 'system'],
      default: 'text',
    },
    content: {
      type: String,
      trim: true,
      maxlength: [5000, 'Message too long'],
      default: '',
    },
    attachments: [attachmentSchema],
    // Reply threading
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    // Emoji reactions
    reactions: [reactionSchema],
    // Read receipts: each entry = { user, readAt }
    readBy: [readReceiptSchema],
    // Delivery status flags
    deliveredTo: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ],
    // Soft delete support
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    // Edit tracking
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    editHistory: [
      {
        content: String,
        editedAt: { type: Date, default: Date.now },
      },
    ],
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
messageSchema.index({ chat: 1, createdAt: -1 }); // pagination
messageSchema.index({ sender: 1 });
messageSchema.index({ chat: 1, isPinned: 1 });
// Text index for search
messageSchema.index({ content: 'text' });

// ─── Virtual: human-readable delivery status ──────────────────────────────────
// 'sent' | 'delivered' | 'seen'  (computed on the fly from readBy)
messageSchema.virtual('status').get(function () {
  if (this.readBy && this.readBy.length > 0) return 'seen';
  if (this.deliveredTo && this.deliveredTo.length > 0) return 'delivered';
  return 'sent';
});

// ─── Pre-save: sanitise content ───────────────────────────────────────────────
messageSchema.pre('save', function (next) {
  if (this.isDeleted) {
    this.content = 'This message was deleted';
    this.attachments = [];
  }
  next();
});

module.exports = mongoose.model('Message', messageSchema);
