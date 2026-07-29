const mongoose = require('mongoose');
const { BlogPost, ContactSubmission } = require('./models');
require('dotenv').config();

let isConnected = false;

// Connect to MongoDB
async function connectDB() {
  if (isConnected) {
    console.log('✅ Already connected to MongoDB');
    return;
  }

  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/techdataseeder_website_data';
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    isConnected = true;
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      isConnected = false;
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      isConnected = false;
    });
    
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

// BLOG POSTS
async function getBlogPosts() {
  await connectDB();
  try {
    const posts = await BlogPost.find()
      .sort({ createdAt: -1 })
      .lean();
    return posts;
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

async function getBlogPostBySlug(slug) {
  await connectDB();
  try {
    const post = await BlogPost.findOne({ slug }).lean();
    return post;
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

async function saveBlogPost(postData) {
  await connectDB();
  try {
    console.log('📝 saveBlogPost called with:', {
      hasId: !!postData._id,
      slug: postData.slug,
      title: postData.title
    });
    
    let existing = null;
    
    // Try to find by _id first
    if (postData._id) {
      existing = await BlogPost.findById(postData._id);
    }
    
    // If not found by _id, try by slug
    if (!existing && postData.slug) {
      existing = await BlogPost.findOne({ slug: postData.slug });
    }
    
    // Remove _id from update data to avoid trying to update it
    const updateData = { ...postData };
    delete updateData._id;
    delete updateData.originalSlug;
    
    if (existing) {
      // Update existing post
      console.log('🔄 Updating existing post:', existing.slug);
      
      const updated = await BlogPost.findByIdAndUpdate(
        existing._id,
        { 
          $set: {
            ...updateData,
            updatedAt: new Date()
          }
        },
        { new: true, runValidators: true }
      );
      
      return updated;
    } else {
      // Create new post
      console.log('📝 Creating new post:', postData.slug);
      const newPost = new BlogPost(updateData);
      await newPost.save();
      return newPost;
    }
  } catch (error) {
    console.error('Error saving post:', error);
    throw error;
  }
}

async function deleteBlogPost(slug) {
  await connectDB();
  try {
    const result = await BlogPost.findOneAndDelete({ slug });
    return result !== null;
  } catch (error) {
    console.error('Error deleting post:', error);
    return false;
  }
}

// CONTACT SUBMISSIONS
async function getSubmissions() {
  await connectDB();
  try {
    const submissions = await ContactSubmission.find()
      .sort({ createdAt: -1 })
      .lean();
    return submissions;
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return [];
  }
}

async function saveSubmission(submissionData) {
  await connectDB();
  try {
    const submission = new ContactSubmission(submissionData);
    await submission.save();
    return submission;
  } catch (error) {
    console.error('Error saving submission:', error);
    throw error;
  }
}

async function updateSubmissionStatus(id, status) {
  await connectDB();
  try {
    const updated = await ContactSubmission.findByIdAndUpdate(
      id,
      { 
        status, 
        updatedAt: new Date() 
      },
      { new: true }
    );
    return updated;
  } catch (error) {
    console.error('Error updating submission:', error);
    return null;
  }
}

// Check database connection
async function checkDBConnection() {
  await connectDB();
  const state = mongoose.connection.readyState;
  return state === 1; // 1 = connected
}

module.exports = {
  connectDB,
  checkDBConnection,
  getBlogPosts,
  getBlogPostBySlug,
  saveBlogPost,
  deleteBlogPost,
  getSubmissions,
  saveSubmission,
  updateSubmissionStatus
};