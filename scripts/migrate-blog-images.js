const { MongoClient } = require('mongodb');
require('dotenv').config();
const { processBlogHeroImage } = require('./blog-image-helper');

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB || 'techdataseeder_website_data';

async function migrateBlogImages() {
  const client = new MongoClient(url);
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(dbName);
    const collection = db.collection('blogposts');

    // Query blog posts that have a heroImage that is not empty and doesn't start with '/images/blog/'
    const query = {
      heroImage: {
        $exists: true,
        $ne: '',
        $not: /^\/images\/blog\//
      }
    };

    const posts = await collection.find(query).toArray();
    console.log(`📝 Found ${posts.length} posts with hero images`);

    let updated = 0;
    let failed = 0;

    for (const post of posts) {
      console.log(`🔄 Processing ${post.slug}...`);
      const originalImage = post.heroImage;
      const title = post.title || post.slug;
      
      const localPath = await processBlogHeroImage(originalImage, title);
      
      if (localPath) {
        await collection.updateOne(
          { _id: post._id },
          { $set: { heroImage: localPath, updatedAt: new Date() } }
        );
        console.log(`✅ Updated ${post.slug}: ${originalImage} → ${localPath}`);
        updated++;
      } else {
        console.error(`❌ Failed to process image for post: ${post.slug}`);
        failed++;
      }
    }

    console.log('✅ Migration complete!');
    console.log(`📥 Updated: ${updated}`);
    console.log(`❌ Failed: ${failed}`);

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await client.close();
  }
}

migrateBlogImages();
