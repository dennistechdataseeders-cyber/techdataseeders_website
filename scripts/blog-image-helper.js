const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

/**
 * Converts a text title into a URL-friendly slug
 * @param {string} text 
 * @returns {string}
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

/**
 * Generates a clean, unique filename for a blog image using the title and a timestamp
 * @param {string} title 
 * @param {string} extension 
 * @returns {string}
 */
function generateBlogImageFilename(title, extension = 'webp') {
  const slug = slugify(title) || 'blog-image';
  return `${slug}-${Date.now()}.${extension}`;
}

/**
 * Downloads an image (if external) or reads a local image, optimizes it, and saves it locally
 * @param {string} imageUrl - The URL or local path of the image to process
 * @param {string} title - The blog post title or slug to generate the filename
 * @returns {Promise<string|null>} The local image path (e.g. /images/blog/filename.webp) or null on failure
 */
async function processBlogHeroImage(imageUrl, title) {
  if (!imageUrl) return null;

  // If already in the target blog image folder, skip processing
  if (imageUrl.startsWith('/images/blog/')) {
    return imageUrl;
  }

  const blogImagesDir = path.join(__dirname, '..', 'images', 'blog');
  if (!fs.existsSync(blogImagesDir)) {
    fs.mkdirSync(blogImagesDir, { recursive: true });
  }

  const filename = generateBlogImageFilename(title, 'webp');
  const outputPath = path.join(blogImagesDir, filename);
  const returnedPath = `/images/blog/${filename}`;

  try {
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // External Image download & optimize
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${imageUrl}. Status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await sharp(buffer)
        .rotate() // auto-orient based on EXIF metadata
        .resize({ width: 1200, withoutEnlargement: true }) // max width 1200px, maintain aspect ratio
        .webp({ quality: 85 })
        .toFile(outputPath);

      return returnedPath;
    } else {
      // Local Image path (relative to root)
      const rootDir = path.join(__dirname, '..');
      const cleanRelativePath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
      const inputPath = path.resolve(rootDir, cleanRelativePath);

      if (!fs.existsSync(inputPath)) {
        throw new Error(`Local file not found: ${inputPath}`);
      }

      await sharp(inputPath)
        .rotate()
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(inputPath === outputPath ? outputPath + '.tmp' : outputPath); // prevent reading/writing same file directly

      return returnedPath;
    }
  } catch (error) {
    console.error(`❌ Error processing blog image "${imageUrl}":`, error.message);
    return null;
  }
}

/**
 * Batch processes an array of blog posts' hero images
 * @param {Array<object>} posts 
 * @returns {Promise<object>} Summary of the batch process
 */
async function processBlogPosts(posts) {
  const results = {
    total: posts.length,
    updated: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  for (const post of posts) {
    if (!post.heroImage) {
      results.skipped++;
      continue;
    }

    if (post.heroImage.startsWith('/images/blog/')) {
      results.skipped++;
      continue;
    }

    const localPath = await processBlogHeroImage(post.heroImage, post.title || post.slug);
    if (localPath) {
      results.updated++;
      results.details.push({
        slug: post.slug,
        original: post.heroImage,
        local: localPath
      });
    } else {
      results.failed++;
    }
  }

  return results;
}

module.exports = {
  slugify,
  generateBlogImageFilename,
  processBlogHeroImage,
  processBlogPosts
};
