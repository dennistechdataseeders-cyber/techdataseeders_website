const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { connectDB, checkDBConnection, getBlogPosts } = require('./db');
const { login, authMiddleware } = require('./auth');
const blogAPI = require('./blog');
const contactAPI = require('./contact');

const urlMap = {
  "why-rental-market-intelligence-matters-for-property-investors": "why-rental-market-intelligence-matters-for-property-investors",
  "why-hyperlocal-data-intelligence-is-essential-for-modern-business-growth": "hyperlocal-data-intelligence-for-business-growth",
  "why-competitor-price-tracking-is-important-for-businesses-in-2026": "competitor-price-tracking-for-businesses",
  "why-data-analytics-is-important-for-businesses-at-every-stage": "data-analytics-for-businesses",
  "why-dark-store-analytics-is-critical-for-quick-commerce-growth": "dark-store-analytics-for-quick-commerce",
  "why-brand-monitoring-is-crucial-a-guide-to-safeguard-and-grow-your-brand": "brand-monitoring-for-business-growth",
  "what-is-ecommerce-data-scraping-a-complete-guide": "ecommerce-data-scraping-guide",
  "using-web-scraping-for-financial-market-intelligence-and-competitive-analysis": "web-scraping-for-financial-market-intelligence",
  "using-real-estate-data-analytics-to-identify-emerging-investment-hotspots": "real-estate-data-analytics-investment-hotspots",
  "using-competitive-ad-monitoring-to-improve-campaign-performance": "competitive-ad-monitoring",
  "using-booking-platform-intelligence-to-optimize-hospitality-pricing": "booking-platform-intelligence-for-hospitality-pricing",
  "top-ecommerce-data-scraping-use-cases-2026-and-beyond": "ecommerce-data-scraping-use-cases",
  "top-5-web-scraping-use-cases-in-the-food-industry": "web-scraping-use-cases-food-industry",
  "food-delivery-data-scraping-top-10-use-cases-for-food-tech-success": "food-delivery-data-scraping-use-cases",
  "the-role-of-alternative-data-in-modern-risk-assessment": "alternative-data-for-risk-assessment",
  "the-power-of-sku-level-pricing-boost-retail-sales-with-smart-data": "sku-level-pricing-intelligence",
  "social-listening-vs-traditional-market-research-which-delivers-better-insights": "social-listening-vs-market-research",
  "scrape-amazon-competitor-reviews-to-increase-your-sales": "scrape-amazon-competitor-reviews",
  "real-time-price-monitoring-on-amazon-walmart-and-target-to-stay-competitive": "real-time-price-monitoring-amazon-walmart-target",
  "powerful-ways-to-use-web-scraping-for-ecommerce": "web-scraping-for-ecommerce",
  "media-analytics-turning-audience-data-into-revenue-opportunities": "media-analytics-for-revenue-growth",
  "maximizing-real-estate-opportunities-with-realtor-apis-and-data-scraping": "realtor-apis-real-estate-data-scraping",
  "leveraging-influencer-data-analytics-for-better-marketing-decisions": "influencer-data-analytics",
  "leverage-social-media-data-for-brand-success": "social-media-data-for-brand-success",
  "increase-sales-of-dropshipping-business-with-web-scraping": "web-scraping-for-dropshipping",
  "how-to-generate-more-sales-leads-through-web-scraping": "web-scraping-for-sales-leads",
  "how-web-scraping-apis-power-real-time-product-monitoring": "web-scraping-apis-for-product-monitoring",
  "how-social-media-intelligence-helps-brands-understand-consumer-behavior": "social-media-intelligence-consumer-behavior",
  "how-u-s-brands-use-amazon-and-walmart-data-to-benchmark-daily-prices": "amazon-walmart-price-benchmarking",
  "how-travel-data-analytics-helps-tourism-businesses-understand-demand": "travel-data-analytics-for-tourism",
  "how-quick-commerce-platforms-use-real-time-inventory-intelligence-to-reduce-stockouts": "quick-commerce-inventory-intelligence",
  "how-quick-commerce-data-helps-fmcg-brands-increase-product-visibility": "quick-commerce-data-for-fmcg-brands",
  "how-property-price-intelligence-helps-real-estate-investors-make-better-decisions": "property-price-intelligence-for-real-estate-investors",
  "how-proptech-companies-leverage-data-for-market-growth": "data-for-proptech-market-growth",
  "how-linkedin-data-scraping-enhances-brand-image-and-business-growth": "linkedin-data-scraping-for-business-growth",
  "how-fintech-companies-use-data-analytics-to-improve-customer-acquisition": "fintech-data-analytics-for-customer-acquisition",
  "how-entertainment-platforms-use-data-to-predict-audience-preferences": "entertainment-data-audience-preferences",
  "how-brands-use-digital-advertising-data-to-measure-market-share": "digital-advertising-data-market-share",
  "how-alternative-data-is-transforming-investment-research-in-2026": "alternative-data-investment-research",
  "how-advertising-intelligence-helps-brands-optimize-marketing-spend": "advertising-intelligence-marketing-spend",
  "hotel-rate-intelligence-how-data-helps-increase-occupancy-and-revenue": "hotel-rate-intelligence",
  "extract-travel-insights-with-travel-and-booking-data-apis": "travel-and-booking-data-apis",
  "extract-real-time-pricing-data-from-uber-eats-doordash-and-grubhub-in-usa": "real-time-pricing-uber-eats-doordash-grubhub",
  "food-delivery-data-scraping-in-usa-the-key-to-restaurant-success": "food-delivery-data-scraping-usa",
  "data-driven-pricing-in-e-commerce-stay-competitive-and-profitable": "data-driven-pricing-ecommerce",
  "data-driven-pricing-in-car-rentals-stay-competitive-and-increase-fleet-revenue": "data-driven-pricing-car-rentals",
  "competitive-pricing-intelligence-for-blinkit-zepto-and-instamart-sellers": "competitive-pricing-intelligence-quick-commerce",
  "competitive-benchmarking-for-hotels-using-ota-and-booking-data": "competitive-benchmarking-hotels-ota-data",
  "boost-your-market-research-with-ai-driven-web-scraping": "ai-driven-web-scraping-market-research",
  "boost-car-rental-profits-with-location-based-dynamic-pricing": "location-based-dynamic-pricing-car-rentals",
  "benefits-of-data-scraping-from-real-estate-websites": "data-scraping-real-estate-websites",
  "automated-product-matching-a-complete-guide-to-boost-conversions": "automated-product-matching",
  "applications-of-data-scraping-in-the-finance-industry": "data-scraping-finance-industry",
  "a-step-by-step-guide-to-gathering-valuable-healthcare-information-online": "healthcare-data-scraping-guide"
};

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB immediately
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 301 Redirect for legacy /blog/post.html?slug= URL format
app.get('/blog/post.html', (req, res, next) => {
  const oldSlug = req.query.slug;
  if (oldSlug) {
    const targetSlug = urlMap[oldSlug] || oldSlug;
    return res.redirect(301, `/blog/${targetSlug}/`);
  }
  res.sendFile(path.join(__dirname, '..', 'blog', 'post.html'));
});

// Serve blog post HTML for SEO-friendly URLs: /blog/:slug and /blog/:slug/
app.get(['/blog/:slug', '/blog/:slug/'], (req, res, next) => {
  const { slug } = req.params;
  if (slug === 'index.html' || slug === 'post.html') {
    return next();
  }
  if (urlMap[slug] && urlMap[slug] !== slug) {
    return res.redirect(301, `/blog/${urlMap[slug]}/`);
  }
  res.sendFile(path.join(__dirname, '..', 'blog', 'post.html'));
});

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

// Dynamic sitemap route
app.get('/sitemap.xml', async (req, res) => {
  const posts = await getBlogPosts();
  
  let urls = posts.map(post => `
    <url>
      <loc>https://techdataseeders.com/blog/${post.slug}/</loc>
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

app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Techdataseeders Server Started');
  console.log('=====================================');
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📍 Network: http://192.168.1.8:${PORT}`);
  console.log(`📝 Admin: http://192.168.1.8:${PORT}/admin`);
  console.log(`📊 API: http://192.168.1.8:${PORT}/api/health`);
  console.log('🗄️  Database: MongoDB (techdataseeder_website_data)');
  console.log('=====================================');
  console.log('📱 To view on your phone, open:');
  console.log(`   http://192.168.1.8:${PORT}`);
  console.log('💡 Make sure both devices are on the same WiFi network');
  console.log('=====================================');
  console.log('💡 Press Ctrl+C to stop');
});