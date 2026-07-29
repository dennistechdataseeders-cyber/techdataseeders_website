const { MongoClient } = require('mongodb');

// Connection URL
const url = 'mongodb://localhost:27017';
const dbName = 'techdataseeder_website_data';

async function initDB() {
  const client = new MongoClient(url);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // Create collections if they don't exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    if (!collectionNames.includes('blogposts')) {
      await db.createCollection('blogposts');
      console.log('✅ Created blogposts collection');
    }
    
    if (!collectionNames.includes('contactsubmissions')) {
      await db.createCollection('contactsubmissions');
      console.log('✅ Created contactsubmissions collection');
    }
    
    // Create indexes
    const blogposts = db.collection('blogposts');
    
    // Create unique index on slug
    await blogposts.createIndex({ slug: 1 }, { unique: true });
    console.log('✅ Created slug index on blogposts');
    
    // Create index for sorting by date
    await blogposts.createIndex({ createdAt: -1 });
    console.log('✅ Created date index on blogposts');
    
    // Create text index for search
    await blogposts.createIndex({ 
      title: 'text', 
      body: 'text', 
      excerpt: 'text' 
    });
    console.log('✅ Created text search index on blogposts');
    
    console.log('✅ Database initialization complete!');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  } finally {
    await client.close();
  }
}

initDB();