const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { connectDB, checkDBConnection, getBlogPosts, getBlogPostBySlug } = require('./db');
const { login, authMiddleware } = require('./auth');
const blogAPI = require('./blog');
const contactAPI = require('./contact');

// Helper to check if a file or directory exists on disk safely
function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
}

// Legacy slug → current slug mapping (old URLs from GSC that must 301 redirect)
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

// ---------------------------------------------------------------
// REDIRECT: /index.html → / (301 Permanent)
// Fixes the homepage duplicate canonical issue in Google Search Console
// ---------------------------------------------------------------
app.get('/index.html', (req, res) => {
  return res.redirect(301, '/');
});

// ---------------------------------------------------------------
// REDIRECT: /blog/index.html → /blog/ (301 Permanent)
// Prevents duplicate content canonical issues for the blog index
// ---------------------------------------------------------------
app.get('/blog/index.html', (req, res) => {
  return res.redirect(301, '/blog/');
});

// ---------------------------------------------------------------
// ROUTE: /blog and /blog/ → blog/index.html
// Ensures the blog index page is served correctly when requested
// ---------------------------------------------------------------
app.get(['/blog', '/blog/'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'blog', 'index.html'));
});

// ---------------------------------------------------------------
// REDIRECT: Legacy /blog/post.html?slug=OLD-SLUG → /blog/CURRENT-SLUG/
// Three-step resolution:
//   1. urlMap lookup (handles renamed slugs from GSC soft 404 list)
//   2. Database lookup (handles current slugs and future posts)
//   3. Fallback to /blog/ (never a soft 404)
// ---------------------------------------------------------------
app.get('/blog/post.html', async (req, res) => {
  const slug = req.query.slug;

  // No slug provided — redirect to blog index
  if (!slug) {
    return res.redirect(301, '/blog/');
  }

  // Step 1: Check urlMap for renamed slugs (old GSC URLs)
  if (urlMap[slug]) {
    return res.redirect(301, `/blog/${urlMap[slug]}/`);
  }

  // Step 2: Query the database to verify the slug exists as-is
  try {
    const post = await getBlogPostBySlug(slug);
    if (post) {
      return res.redirect(301, `/blog/${post.slug}/`);
    }
  } catch (err) {
    console.error('DB lookup error in /blog/post.html redirect:', err.message);
  }

  // Step 3: Unknown slug — redirect to blog index (prevents soft 404)
  return res.redirect(301, '/blog/');
});

// ---------------------------------------------------------------
// DYNAMIC SITEMAP — must be registered before express.static so the
// physical sitemap.xml file (if any) does not intercept this route
// ---------------------------------------------------------------
app.get('/sitemap.xml', async (req, res) => {
  let posts = [];
  try {
    posts = await getBlogPosts();
  } catch (err) {
    console.error('Error fetching posts for sitemap:', err.message);
  }

  const now = new Date().toISOString();

  const staticUrls = [
    // Homepage
    { loc: 'https://techdataseeders.com/', changefreq: 'daily',   priority: '1.0', lastmod: now },
    // Core pages
    { loc: 'https://techdataseeders.com/about.html',        changefreq: 'monthly', priority: '0.8', lastmod: now },
    { loc: 'https://techdataseeders.com/case-studies.html', changefreq: 'weekly',  priority: '0.8', lastmod: now },
    { loc: 'https://techdataseeders.com/blog/',             changefreq: 'daily',   priority: '0.9', lastmod: now },
    // Services
    { loc: 'https://techdataseeders.com/services/enterprise-web-scraping.html',   changefreq: 'monthly', priority: '0.8', lastmod: now },
    { loc: 'https://techdataseeders.com/services/mobile-app-scraping.html',       changefreq: 'monthly', priority: '0.8', lastmod: now },
    { loc: 'https://techdataseeders.com/services/data-analytics-intelligence.html', changefreq: 'monthly', priority: '0.8', lastmod: now },
    { loc: 'https://techdataseeders.com/services/custom-data-api.html',           changefreq: 'monthly', priority: '0.8', lastmod: now },
    // Industries
    { loc: 'https://techdataseeders.com/industries/ecomm.html',           changefreq: 'monthly', priority: '0.7', lastmod: now },
    { loc: 'https://techdataseeders.com/industries/entertainment-ott.html', changefreq: 'monthly', priority: '0.7', lastmod: now },
    { loc: 'https://techdataseeders.com/industries/food-beverages.html',   changefreq: 'monthly', priority: '0.7', lastmod: now },
    { loc: 'https://techdataseeders.com/industries/q-commerce.html',       changefreq: 'monthly', priority: '0.7', lastmod: now },
    { loc: 'https://techdataseeders.com/industries/real-estate.html',      changefreq: 'monthly', priority: '0.7', lastmod: now },
    { loc: 'https://techdataseeders.com/industries/retail.html',           changefreq: 'monthly', priority: '0.7', lastmod: now },
    { loc: 'https://techdataseeders.com/industries/social-media.html',     changefreq: 'monthly', priority: '0.7', lastmod: now },
    { loc: 'https://techdataseeders.com/industries/travel-hotel.html',     changefreq: 'monthly', priority: '0.7', lastmod: now },
    // Case Studies
    { loc: 'https://techdataseeders.com/case-studies/pharma-data-extraction-services.html',       changefreq: 'monthly', priority: '0.7', lastmod: now },
    { loc: 'https://techdataseeders.com/case-studies/retail-automated-product-matching.html',     changefreq: 'monthly', priority: '0.7', lastmod: now },
    { loc: 'https://techdataseeders.com/case-studies/food-delivery-competitive-intelligence.html', changefreq: 'monthly', priority: '0.7', lastmod: now },
    { loc: 'https://techdataseeders.com/case-studies/finance-real-time-alternative-data-scraping.html', changefreq: 'monthly', priority: '0.7', lastmod: now },
    { loc: 'https://techdataseeders.com/case-studies/real-estate-aggregator-growth.html',         changefreq: 'monthly', priority: '0.7', lastmod: now },
    { loc: 'https://techdataseeders.com/case-studies/car-rental-pricing-intelligence.html',       changefreq: 'monthly', priority: '0.7', lastmod: now },
    { loc: 'https://techdataseeders.com/case-studies/event-ticket-booking-data-extraction.html',  changefreq: 'monthly', priority: '0.7', lastmod: now },
    { loc: 'https://techdataseeders.com/case-studies/ecommerce-pricing-intelligence.html',        changefreq: 'monthly', priority: '0.7', lastmod: now },
    // Legal
    { loc: 'https://techdataseeders.com/privacy.html', changefreq: 'yearly', priority: '0.3', lastmod: now },
    { loc: 'https://techdataseeders.com/terms.html',   changefreq: 'yearly', priority: '0.3', lastmod: now },
  ];

  const staticXml = staticUrls.map(u => `
  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('');

  const blogXml = posts.map(post => {
    const lastmod = post.updatedAt ? new Date(post.updatedAt).toISOString() : now;
    return `
  <url>
    <loc>https://techdataseeders.com/blog/${post.slug}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }).join('');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticXml}${blogXml}
</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(sitemap);
});

// ---------------------------------------------------------------
// Serve blog post HTML for SEO-friendly URLs: /blog/:slug and /blog/:slug/
// Also handles old slugs that are in urlMap
// ---------------------------------------------------------------
app.get(['/blog/:slug', '/blog/:slug/'], (req, res, next) => {
  const { slug } = req.params;
  // Let express.static handle actual files (blog/index.html, etc.)
  if (slug === 'index.html' || slug === 'post.html') {
    return next();
  }
  // Redirect old-slug → new-slug if found in urlMap
  if (urlMap[slug] && urlMap[slug] !== slug) {
    return res.redirect(301, `/blog/${urlMap[slug]}/`);
  }
  res.sendFile(path.join(__dirname, '..', 'blog', 'post.html'));
});

// Static files (CSS, images, JS, HTML pages)
app.use(express.static(path.join(__dirname, '..'), {
  // Do not serve index.html automatically — we handle it via the catch-all
  index: false
}));

// ---------------------------------------------------------------
// Health check
// ---------------------------------------------------------------
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

// ---------------------------------------------------------------
// Catch-all: resolves clean URLs, serves directory indexes, or falls back to root index.html
// Returns 404 status for non-existent API paths to avoid soft 404s
// ---------------------------------------------------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.use((req, res) => {
  const reqPath = req.path;

  // 1. API routes that don't exist get a real 404 JSON response
  if (reqPath.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  const baseDir = path.join(__dirname, '..');
  
  // Resolve the physical path on disk (safely handling URL encoding)
  let decodedPath = '';
  try {
    decodedPath = decodeURIComponent(reqPath);
  } catch (err) {
    decodedPath = reqPath;
  }
  
  const targetPath = path.join(baseDir, decodedPath);

  // 2. Check if a directory exists on disk and has an index.html file
  if (checkFileExists(targetPath)) {
    try {
      const stats = fs.statSync(targetPath);
      if (stats.isDirectory()) {
        const indexHtmlPath = path.join(targetPath, 'index.html');
        if (checkFileExists(indexHtmlPath)) {
          return res.sendFile(indexHtmlPath);
        }
      } else if (stats.isFile()) {
        // Direct file match
        return res.sendFile(targetPath);
      }
    } catch (err) {
      console.error('Error reading path stats:', err.message);
    }
  }

  // 3. Clean URL resolution: if a path doesn't end with a slash and has no extension,
  // check if appending '.html' yields a valid file (e.g. /about → /about.html)
  if (!reqPath.endsWith('/') && !path.extname(reqPath)) {
    const htmlFilePath = targetPath + '.html';
    if (checkFileExists(htmlFilePath)) {
      return res.sendFile(htmlFilePath);
    }
  }

  // 4. Fallback to homepage index.html as a last resort
  res.sendFile(path.join(baseDir, 'index.html'));
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