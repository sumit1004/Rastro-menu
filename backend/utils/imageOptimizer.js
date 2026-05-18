const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const optimizeImage = async (fileBuffer, filename, folder) => {
  const optimizedFilename = `${filename}-${Date.now()}.webp`;
  const filepath = path.join(__dirname, '..', 'uploads', folder, optimizedFilename);
  
  await sharp(fileBuffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(filepath);
    
  return `/uploads/${folder}/${optimizedFilename}`;
};

module.exports = { optimizeImage };
