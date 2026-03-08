/**
 * Image optimization script
 * Compresses and resizes images for web performance
 * 
 * Usage: node scripts/optimize-images.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'src', 'assets', 'images');
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const JPEG_QUALITY = 80;
const PNG_QUALITY = 80;

// Files to skip (already optimized or special files)
const SKIP_FILES = [];

async function getImageFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await getImageFiles(fullPath, files);
    } else if (/\.(jpg|jpeg|png)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

async function optimizeImage(filePath) {
  const relativePath = path.relative(IMAGES_DIR, filePath);
  
  if (SKIP_FILES.includes(relativePath)) {
    console.log(`  Skipping: ${relativePath}`);
    return { skipped: true };
  }
  
  const originalStats = fs.statSync(filePath);
  const originalSize = originalStats.size;
  
  // Skip if already small (under 50KB)
  if (originalSize < 50 * 1024) {
    console.log(`  Already small: ${relativePath} (${formatSize(originalSize)})`);
    return { skipped: true, reason: 'small' };
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const isJpeg = ext === '.jpg' || ext === '.jpeg' || ext === '.jpe';
  const isPng = ext === '.png';
  
  try {
    // Read file into buffer first to avoid file locking issues
    const inputBuffer = fs.readFileSync(filePath);
    let image = sharp(inputBuffer);
    const metadata = await image.metadata();
    
    // Check if resize needed
    const needsResize = metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT;
    
    if (needsResize) {
      image = image.resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Apply compression
    if (isJpeg) {
      image = image.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
    } else if (isPng) {
      image = image.png({ quality: PNG_QUALITY, compressionLevel: 9 });
    }
    
    // Write to buffer first, then compare
    const buffer = await image.toBuffer();
    const newSize = buffer.length;
    
    // Only save if we actually reduced size
    if (newSize < originalSize) {
      fs.writeFileSync(filePath, buffer);
      const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
      console.log(`  ✓ ${relativePath}: ${formatSize(originalSize)} → ${formatSize(newSize)} (-${savings}%)`);
      return { 
        optimized: true, 
        originalSize, 
        newSize, 
        savings: originalSize - newSize 
      };
    } else {
      console.log(`  - ${relativePath}: No improvement (${formatSize(originalSize)})`);
      return { skipped: true, reason: 'no-improvement' };
    }
    
  } catch (err) {
    console.error(`  ✗ Error: ${relativePath}: ${err.message}`);
    return { error: true, message: err.message };
  }
}

async function main() {
  console.log('Image Optimization Script');
  console.log('=========================\n');
  console.log(`Source: ${IMAGES_DIR}`);
  console.log(`Max dimensions: ${MAX_WIDTH}x${MAX_HEIGHT}`);
  console.log(`JPEG quality: ${JPEG_QUALITY}%`);
  console.log(`PNG quality: ${PNG_QUALITY}%\n`);
  
  const files = await getImageFiles(IMAGES_DIR);
  console.log(`Found ${files.length} images\n`);
  
  let totalOriginal = 0;
  let totalNew = 0;
  let optimizedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const file of files) {
    const result = await optimizeImage(file);
    
    if (result.optimized) {
      totalOriginal += result.originalSize;
      totalNew += result.newSize;
      optimizedCount++;
    } else if (result.error) {
      errorCount++;
    } else {
      skippedCount++;
    }
  }
  
  console.log('\n=========================');
  console.log('Summary:');
  console.log(`  Optimized: ${optimizedCount} images`);
  console.log(`  Skipped: ${skippedCount} images`);
  console.log(`  Errors: ${errorCount} images`);
  
  if (optimizedCount > 0) {
    const totalSavings = totalOriginal - totalNew;
    const savingsPercent = (totalSavings / totalOriginal * 100).toFixed(1);
    console.log(`\n  Total savings: ${formatSize(totalSavings)} (-${savingsPercent}%)`);
    console.log(`  ${formatSize(totalOriginal)} → ${formatSize(totalNew)}`);
  }
}

main().catch(console.error);
