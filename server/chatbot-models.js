const mongoose = require('mongoose');

// Schema for OTP verification tracking
const ChatVerificationSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  channel: {
    type: String,
    required: true,
    enum: ['email', 'phone']
  },
  codeHash: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  verified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'chat_verifications'
});

// Compound index for quick rate-limiting and verification lookups
ChatVerificationSchema.index({ identifier: 1, createdAt: -1 });

// Schema for chat messages persistence
const ChatMessageSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant']
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'chat_messages'
});

ChatMessageSchema.index({ identifier: 1, createdAt: 1 });

// Schema for tracking chat session activity and transcript delivery
const ChatSessionSchema = new mongoose.Schema({
  identifier:     { type: String, required: true, unique: true, trim: true, lowercase: true },
  lastActivityAt: { type: Date, default: Date.now },
  transcriptSent: { type: Boolean, default: false },
  createdAt:      { type: Date, default: Date.now }
}, { collection: 'chat_sessions' });

ChatSessionSchema.index({ lastActivityAt: 1, transcriptSent: 1 });

const ChatVerification = mongoose.models.ChatVerification || mongoose.model('ChatVerification', ChatVerificationSchema);
const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);
const ChatSession = mongoose.models.ChatSession || mongoose.model('ChatSession', ChatSessionSchema);

module.exports = {
  ChatVerification,
  ChatMessage,
  ChatSession
};
