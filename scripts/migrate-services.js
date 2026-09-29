const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Service } = require('../server/models');

const SERVICES_TO_SEED = [
  {
    slug: 'enterprise-web-scraping',
    title: 'Enterprise Web Scraping Services for Scalable Data Operations',
    navLabel: 'Enterprise Web Scraping',
    badge: 'Service 01',
    tagline: 'Extract millions of structured records from thousands of websites simultaneously at enterprise scale, on your schedule.',
    order: 1,
    published: true,
    heroImage: '',
    introKicker: 'Custom Web Crawling for Enterprises',
    introHeading: 'The Data You Need.<br><em>The Scale You Demand</em>',
    introBody: 'Our enterprise web scraping service is built to collect, process, and structure massive volumes of online data according to your specific organizational requirements. From competitive insights and trend tracking to customer-feedback analysis, we run scalable, fault-tolerant crawlers with real-time monitoring — turning the open web into a reliable, decision-ready data feed for your business.',
    offers: [],
    whyPoints: [],
    processSteps: [],
    metaTitle: 'Enterprise Web Scraping Services USA | Techdataseeders',
    metaDescription: 'Scale data operations with enterprise web scraping services built for accuracy, speed & compliance. Get a custom solution — talk to our experts!'
  },
  {
    slug: 'mobile-app-scraping',
    title: 'Mobile App Scraping Services for iOS & Android Data',
    navLabel: 'Mobile App Scraping',
    badge: 'Service 02',
    tagline: 'Capture real-time mobile application data through direct API intercepts, automated UI flows, and reverse-engineered network traffic at scale.',
    order: 2,
    published: true,
    heroImage: '',
    introKicker: 'App Data Extraction at Scale',
    introHeading: 'Mobile-First Intelligence.<br><em>Beyond the Browser</em>',
    introBody: 'Modern data often lives exclusively inside mobile apps. Our mobile application scraping services extract critical product listings, reviews, real-time pricing, and location data directly from iOS and Android platforms with complete accuracy and reliability.',
    offers: [],
    whyPoints: [],
    processSteps: [],
    metaTitle: 'Mobile App Scraping Services | Techdataseeders',
    metaDescription: 'Extract accurate, real-time data from iOS & Android apps with our mobile app scraping services. Reliable, scalable & compliant. Get started today!'
  },
  {
    slug: 'data-analytics-intelligence',
    title: 'Data Analytics & Intelligence Services Backed by Scraped Data',
    navLabel: 'Data Analytics & Intelligence',
    badge: 'Service 03',
    tagline: 'Turn raw scraped data into structured business intelligence — benchmarks, price signals, demand forecasting, and sentiment scoring.',
    order: 3,
    published: true,
    heroImage: '',
    introKicker: 'From Raw Feeds to Decisions',
    introHeading: 'Actionable Intelligence.<br><em>From Every Data Stream</em>',
    introBody: 'Data extraction is only the first step. Our analytics and intelligence solutions transform complex, high-velocity web datasets into clear KPI dashboards, predictive models, competitive benchmarks, and automated alerting systems.',
    offers: [],
    whyPoints: [],
    processSteps: [],
    metaTitle: 'Data Analytics Scraping Services USA | Techdataseeders',
    metaDescription: 'Transform raw web data into actionable business intelligence with advanced analytics, custom dashboards & predictive models. Request a consultation!'
  },
  {
    slug: 'custom-data-api',
    title: 'Custom Data Extraction Services Delivered via API',
    navLabel: 'Custom Data API Delivery',
    badge: 'Service 04',
    tagline: 'Receive scraped data exactly how you need it — via REST, GraphQL, CSV exports, or direct database pipes on automated schedules.',
    order: 4,
    published: true,
    heroImage: '',
    introKicker: 'Seamless Data Integration',
    introHeading: 'Your Data, Your Format.<br><em>Delivered Straight to Your Stack</em>',
    introBody: 'Integrate live web data directly into your CRM, ERP, data warehouse, or applications with dedicated REST and GraphQL endpoints, webhook triggers, and automated batch file deliveries.',
    offers: [],
    whyPoints: [],
    processSteps: [],
    metaTitle: 'Custom Data Extraction Services | Techdataseeders',
    metaDescription: 'Get tailored data delivery pipelines with our custom data extraction services. Structured, validated & delivered directly into your systems via API.'
  }
];

async function migrateServices() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/techdataseeder_website_data';
  console.log('Connecting to MongoDB at:', uri);

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log(' Connected to MongoDB successfully');

    console.log('\n--- Seeding Services ---');
    let created = 0;
    let updated = 0;

    for (const svc of SERVICES_TO_SEED) {
      const existing = await Service.findOne({ slug: svc.slug });
      if (existing) {
        // Update existing only if essential fields match or missing
        await Service.updateOne(
          { _id: existing._id },
          {
            $set: {
              navLabel: existing.navLabel || svc.navLabel,
              order: existing.order != null ? existing.order : svc.order,
              published: existing.published !== undefined ? existing.published : true,
              tagline: existing.tagline || svc.tagline,
              badge: existing.badge || svc.badge,
              metaTitle: existing.metaTitle || svc.metaTitle,
              metaDescription: existing.metaDescription || svc.metaDescription
            }
          }
        );
        console.log(` Updated service: ${svc.slug} ("${svc.navLabel}")`);
        updated++;
      } else {
        await Service.create(svc);
        console.log(` Created service: ${svc.slug} ("${svc.navLabel}")`);
        created++;
      }
    }

    const totalInDb = await Service.countDocuments();
    console.log('\n=======================================');
    console.log(' Service Migration Summary:');
    console.log(`   - New services created: ${created}`);
    console.log(`   - Existing services verified/updated: ${updated}`);
    console.log(`   - Total services in database: ${totalInDb}`);
    console.log('=======================================\n');

    const allServices = await Service.find().sort({ order: 1, createdAt: 1 }).select('slug navLabel order published');
    console.log('Current Services in Navbar Order:');
    allServices.forEach((s, idx) => {
      console.log(`   ${idx + 1}. [order: ${s.order}] ${s.navLabel} (/services/${s.slug}) ${s.published ? '✓' : '(draft)'}`);
    });

  } catch (error) {
    console.error(' Migration failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n Database connection closed.');
    process.exit(0);
  }
}

migrateServices();
