const { MongoClient } = require('mongodb');
require('dotenv').config();

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB || 'techdataseeder_website_data';

async function cleanupIDs() {
  const client = new MongoClient(url);
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(dbName);
    const collection = db.collection('blogposts');

    // Find all documents
    const allDocs = await collection.find({}).toArray();
    console.log(`📊 Total documents in collection: ${allDocs.length}`);

    let fixedCount = 0;

    for (const doc of allDocs) {
      const idStr = doc._id.toString();
      
      // Check if _id is in the format "ObjectId('...')"
      if (idStr.startsWith("ObjectId('") && idStr.endsWith("')")) {
        const cleanHex = idStr.substring(10, idStr.length - 2);
        console.log(`🔧 Fixing malformed ID for post: "${doc.slug}"`);
        console.log(`   Old ID: ${idStr} ➜ New ID: ${cleanHex}`);

        // Delete the old document
        await collection.deleteOne({ _id: doc._id });

        // Create new document with correct ID string
        const newDoc = { ...doc, _id: cleanHex };
        await collection.insertOne(newDoc);

        fixedCount++;
      }
    }

    console.log(`✅ Cleanup complete! Fixed ${fixedCount} documents.`);

  } catch (error) {
    console.error('❌ Cleanup error:', error);
  } finally {
    await client.close();
  }
}

cleanupIDs();
