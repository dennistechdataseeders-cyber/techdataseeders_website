const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const url = 'mongodb://localhost:27017';
const dbName = 'techdataseeder_website_data';
const blogFile = path.join(__dirname, '..', 'data', 'blogs.json');

async function migrateFromJSON() {
  // Check if blogs.json exists
  if (!fs.existsSync(blogFile)) {
    console.log('❌ blogs.json not found. Skipping migration.');
    return;
  }
  
  const client = new MongoClient(url);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    const collection = db.collection('blogposts');
    
    // Read existing blogs.json
    const data = fs.readFileSync(blogFile, 'utf8');
    const posts = JSON.parse(data);
    
    if (!Array.isArray(posts) || posts.length === 0) {
      console.log('📭 No posts found in blogs.json');
      return;
    }
    
    console.log(`📝 Found ${posts.length} posts in blogs.json`);
    
    // Process each post
    let inserted = 0;
    let updated = 0;
    
    for (const post of posts) {
      // Check if post exists
      const existing = await collection.findOne({ slug: post.slug });
      
      if (existing) {
        // Update existing
        await collection.updateOne(
          { slug: post.slug },
          { 
            $set: {
              ...post,
              updatedAt: new Date(),
              createdAt: existing.createdAt || new Date()
            }
          }
        );
        updated++;
      } else {
        // Insert new
        await collection.insertOne({
          ...post,
          createdAt: new Date(),
          updatedAt: new Date(),
          published: true
        });
        inserted++;
      }
    }
    
    console.log(`✅ Migration complete!`);
    console.log(`📥 Inserted: ${inserted}`);
    console.log(`🔄 Updated: ${updated}`);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await client.close();
  }
}

migrateFromJSON();