const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { connectDB, checkDBConnection } = require('./db');
const { login, authMiddleware } = require('./auth');
const blogAPI = require('./blog');
const contactAPI = require('./contact');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB immediately
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

// Health check
app.get('/api/health', async (req, res) => {
  const dbConnected = await checkDBConnection();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const result = login(username, password);
  res.json(result);
});

// Blog routes (public)
app.get('/api/blog', blogAPI.getAllPosts);
app.get('/api/blog/:slug', blogAPI.getPostBySlug);

// Blog routes (protected)
app.post('/api/blog', authMiddleware, blogAPI.createOrUpdatePost);
app.delete('/api/blog/:slug', authMiddleware, blogAPI.deletePost);

// Contact routes (public)
app.post('/api/contact', contactAPI.submitContact);

// Contact routes (protected)
app.get('/api/submissions', authMiddleware, contactAPI.getAllSubmissions);
app.put('/api/submissions/:id', authMiddleware, contactAPI.updateSubmission);

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin.html'));
});
// Add this to server/server.js
app.get('/sitemap.xml', async (req, res) => {
  const posts = await getBlogPosts(); // Your existing function
  
  let urls = posts.map(post => `
    <url>
      <loc>https://techdataseeders.com/blog/post.html?slug=${post.slug}</loc>
      <lastmod>${post.updatedAt || new Date().toISOString()}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.7</priority>
    </url>
  `).join('');
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <!-- Static URLs -->
      <url>
        <loc>https://techdataseeders.com/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
      </url>
      <!-- Dynamic blog posts -->
      ${urls}
    </urlset>`;
  
  res.header('Content-Type', 'application/xml');
  res.send(sitemap);
});
// Serve index for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log('🚀 Techdataseeders Server Started');
  console.log('=====================================');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📝 Admin: http://localhost:${PORT}/admin`);
  console.log(`📊 API: http://localhost:${PORT}/api/health`);
  console.log('🗄️  Database: MongoDB (techdataseeder_website_data)');
  console.log('=====================================');
  console.log('💡 Press Ctrl+C to stop');
});