const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Optimizes a single image
 * @param {string} inputPath 
 * @param {string} outputPath 
 * @param {object} options 
 * @returns {Promise<boolean>}
 */
async function optimizeImage(inputPath, outputPath, options = {}) {
  const { width = 1200, quality = 85, format = 'webp' } = options;
  try {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let pipeline = sharp(inputPath).rotate();

    if (width) {
      pipeline = pipeline.resize({ width, withoutEnlargement: true });
    }

    if (format === 'webp') {
      pipeline = pipeline.webp({ quality });
    } else if (format === 'jpeg' || format === 'jpg') {
      pipeline = pipeline.jpeg({ quality });
    } else if (format === 'png') {
      pipeline = pipeline.png({ quality });
    } else if (format === 'gif') {
      pipeline = pipeline.gif();
    }

    await pipeline.toFile(outputPath);
    return true;
  } catch (error) {
    console.error(`❌ Error optimizing image ${inputPath}:`, error.message);
    return false;
  }
}

/**
 * Recursively optimizes all images in a directory
 * @param {string} inputDir 
 * @param {string} outputDir 
 * @param {object} options 
 * @returns {Promise<{ success: number, failed: number, skipped: number }>}
 */
async function optimizeDirectory(inputDir, outputDir, options = {}) {
  const { format = 'webp' } = options;
  const results = { success: 0, failed: 0, skipped: 0 };

  async function walk(currentIn, currentOut) {
    if (!fs.existsSync(currentIn)) return;

    const entries = fs.readdirSync(currentIn, { withFileTypes: true });

    for (const entry of entries) {
      const inPath = path.join(currentIn, entry.name);

      if (entry.isDirectory()) {
        const outPath = path.join(currentOut, entry.name);
        await walk(inPath, outPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        if (!allowedExtensions.includes(ext)) {
          continue;
        }

        const nameWithoutExt = path.basename(entry.name, ext);
        const outFilename = `${nameWithoutExt}.${format}`;
        const outPath = path.join(currentOut, outFilename);

        // Skip if output file already exists
        if (fs.existsSync(outPath)) {
          results.skipped++;
          continue;
        }

        console.log(`🔄 Optimizing: ${inPath} ➜ ${outPath}`);
        const success = await optimizeImage(inPath, outPath, options);
        if (success) {
          results.success++;
        } else {
          results.failed++;
        }
      }
    }
  }

  await walk(inputDir, outputDir);
  return results;
}

/**
 * Downloads and optimizes an image from a URL
 * @param {string} url 
 * @param {string} outputPath 
 * @param {object} options 
 * @returns {Promise<boolean>}
 */
async function downloadAndOptimizeImage(url, outputPath, options = {}) {
  const { width = 1200, quality = 85, format = 'webp' } = options;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${url}. Status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let pipeline = sharp(buffer).rotate();

    if (width) {
      pipeline = pipeline.resize({ width, withoutEnlargement: true });
    }

    if (format === 'webp') {
      pipeline = pipeline.webp({ quality });
    } else if (format === 'jpeg' || format === 'jpg') {
      pipeline = pipeline.jpeg({ quality });
    } else if (format === 'png') {
      pipeline = pipeline.png({ quality });
    } else if (format === 'gif') {
      pipeline = pipeline.gif();
    }

    await pipeline.toFile(outputPath);
    return true;
  } catch (error) {
    console.error(`❌ Error downloading/optimizing ${url}:`, error.message);
    return false;
  }
}

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'optimize') {
    const inputDir = args[1];
    const outputDir = args[2];
    if (!inputDir || !outputDir) {
      console.log('Usage: node scripts/optimize-images.js optimize <inputDir> <outputDir>');
      process.exit(1);
    }
    console.log(`Starting directory optimization from ${inputDir} to ${outputDir}...`);
    optimizeDirectory(inputDir, outputDir)
      .then(res => {
        console.log('✅ Directory optimization complete!');
        console.log(`Success: ${res.success}, Failed: ${res.failed}, Skipped: ${res.skipped}`);
      })
      .catch(err => {
        console.error('❌ Error optimizing directory:', err);
        process.exit(1);
      });
  } else if (command === 'download') {
    const url = args[1];
    const outputPath = args[2];
    if (!url || !outputPath) {
      console.log('Usage: node scripts/optimize-images.js download <url> <outputPath>');
      process.exit(1);
    }
    console.log(`Downloading and optimizing image from ${url} to ${outputPath}...`);
    downloadAndOptimizeImage(url, outputPath)
      .then(success => {
        if (success) {
          console.log(`✅ Successfully downloaded and optimized to ${outputPath}`);
        } else {
          console.log('❌ Failed to download and optimize image');
          process.exit(1);
        }
      })
      .catch(err => {
        console.error('❌ Error downloading image:', err);
        process.exit(1);
      });
  } else {
    console.log('Invalid command. Available commands:');
    console.log('  node scripts/optimize-images.js optimize <inputDir> <outputDir>');
    console.log('  node scripts/optimize-images.js download <url> <outputPath>');
    process.exit(1);
  }
}

module.exports = {
  optimizeImage,
  optimizeDirectory,
  downloadAndOptimizeImage
};
