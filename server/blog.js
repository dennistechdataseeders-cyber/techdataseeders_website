const { getBlogPosts, getBlogPostBySlug, saveBlogPost, deleteBlogPost } = require('./db');

async function getAllPosts(req, res) {
  try {
    const posts = await getBlogPosts();
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getPostBySlug(req, res) {
  try {
    const { slug } = req.params;
    const post = await getBlogPostBySlug(slug);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function createOrUpdatePost(req, res) {
  try {
    const post = req.body;
    
    console.log('📝 Received post data:', {
      title: post.title,
      slug: post.slug,
      originalSlug: post.originalSlug || post._id ? 'has _id' : 'new',
      hasExcerpt: !!post.excerpt,
      hasBody: !!post.body,
      hasId: !!post._id
    });
    
    // Validate required fields
    if (!post.title || !post.title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }
    
    if (!post.slug || !post.slug.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Slug is required'
      });
    }
    
    if (!post.body || !post.body.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Body content is required'
      });
    }
    
    // Clean up post data
    const cleanPost = {
      slug: post.slug.trim().toLowerCase(),
      title: post.title.trim(),
      category: (post.category || 'Uncategorized').trim(),
      author: (post.author || 'Techdataseeders Team').trim(),
      date: post.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      readTime: (post.readTime || '5 min read').trim(),
      excerpt: (post.excerpt || '').trim(),
      body: post.body || '',
      heroImage: (post.heroImage || '').trim(),
      gradient: post.gradient || 'blue',
      icon: post.icon || 'database',
      tags: Array.isArray(post.tags) ? post.tags : (post.tags ? post.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
      published: post.published !== undefined ? post.published : true,
      metaTitle: (post.metaTitle || '').trim(),
      metaDescription: (post.metaDescription || '').trim()
    };
    
    // If updating, preserve the _id
    if (post._id) {
      cleanPost._id = post._id;
    }
    
    // Check for duplicate slug - EXCLUDE the current post if editing
    const allPosts = await getBlogPosts();
    let existing = null;
    
    if (post._id) {
      // If editing by _id, find the current post
      existing = allPosts.find(p => p._id && p._id.toString() === post._id.toString());
    } else if (post.originalSlug) {
      // If editing by original slug
      existing = allPosts.find(p => p.slug === post.originalSlug);
    }
    
    // Check if any OTHER post has this slug
    const duplicateSlug = allPosts.some(function(p) {
      // If we found the current post, skip it
      if (existing && p._id && p._id.toString() === existing._id.toString()) {
        return false;
      }
      // Check if this post has the same slug
      return p.slug === cleanPost.slug;
    });
    
    if (duplicateSlug) {
      return res.status(400).json({
        success: false,
        message: 'A post with this slug already exists'
      });
    }
    
    const savedPost = await saveBlogPost(cleanPost);
    
    console.log('✅ Post saved successfully:', savedPost.title);
    
    res.json({
      success: true,
      message: 'Post saved successfully',
      data: savedPost
    });
  } catch (error) {
    console.error('❌ Error in createOrUpdatePost:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to save post'
    });
  }
}

async function deletePost(req, res) {
  try {
    const { slug } = req.params;
    const success = await deleteBlogPost(slug);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAllPosts,
  getPostBySlug,
  createOrUpdatePost,
  deletePost
};