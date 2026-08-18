const mongoose = require('mongoose');

// Blog Post Schema
const BlogPostSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    default: 'Uncategorized'
  },
  author: {
    type: String,
    default: 'Techdataseeders Team'
  },
  date: {
    type: String,
    required: true
  },
  readTime: {
    type: String,
    default: '5 min read'
  },
  excerpt: {
    type: String,
    default: ''  // Changed from required: true to default: ''
  },
  body: {
    type: String,
    required: true
  },
  heroImage: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: 'database'
  },
  gradient: {
    type: String,
    default: 'blue'
  },
  tags: {
    type: [String],
    default: []
  },
  published: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  metaTitle: {
    type: String,
    default: ''
  },
  metaDescription: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Contact Submission Schema
const ContactSubmissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'archived'],
    default: 'new'
  },
  ip: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Create models
const BlogPost = mongoose.model('BlogPost', BlogPostSchema);
const ContactSubmission = mongoose.model('ContactSubmission', ContactSubmissionSchema);

module.exports = {
  BlogPost,
  ContactSubmission
};