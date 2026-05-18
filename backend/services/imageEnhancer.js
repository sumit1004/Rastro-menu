const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const enhanceImage = async (fileBuffer, filename, folder) => {
  const enhancedFilename = `enhanced-${filename}-${Date.now()}.webp`;
  const filepath = path.join(__dirname, '..', 'uploads', folder, enhancedFilename);
  
  await sharp(fileBuffer)
    .resize({ width: 1200, withoutEnlargement: true })
    // Gentle enhancement: slight saturation boost and contrast
    .modulate({
      brightness: 1.05,
      saturation: 1.15
    })
    .clahe({ width: 10, height: 10 }) // Contrast Limited Adaptive Histogram Equalization for sharpness/contrast
    .webp({ quality: 80 })
    .toFile(filepath);
    
  return `/uploads/${folder}/${enhancedFilename}`;
};

module.exports = { enhanceImage };
