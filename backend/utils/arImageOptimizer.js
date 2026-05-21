const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const AR_DIR = 'uploads/ar-assets';

// Ensure directory exists
if (!fs.existsSync(AR_DIR)) {
  fs.mkdirSync(AR_DIR, { recursive: true });
}

/**
 * Optimizes an uploaded AR image (transparent PNG)
 * @param {string} filePath - The path to the uploaded image on disk
 * @param {string} filename - The generated filename without extension
 * @returns {string} - The relative path to the saved image
 */
const optimizeArImage = async (filePath, filename) => {
  try {
    const finalFilename = `${filename}.png`;
    const outputPath = path.join(AR_DIR, finalFilename);

    // Use sharp to compress and resize the image, ensuring it remains a PNG with transparency
    await sharp(filePath)
      .resize(1024, 1024, {
        fit: 'inside', // preserve aspect ratio
        withoutEnlargement: true // don't scale up small images
      })
      .png({
        quality: 80, // Compression quality
        compressionLevel: 9, // zlib compression level (0-9)
        palette: true // quantise to 256 colors for much smaller file size (optional, but great for performance)
      })
      .toFile(outputPath);

    return `/${AR_DIR}/${finalFilename}`.replace(/\\/g, '/');
  } catch (error) {
    console.error("Error optimizing AR image:", error);
    throw error;
  }
};

module.exports = {
  optimizeArImage
};
