const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = async (filePath, folder = 'models/glb') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'raw', // needed for glb/usdz non-image files
      use_filename: true,
      unique_filename: true
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

const deleteFromCloudinary = async (publicId, resourceType = 'raw') => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
  }
};

const uploadBufferToCloudinary = (buffer, folder = 'models/glb') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'raw',
        use_filename: true,
        unique_filename: true
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary buffer upload error:', error);
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );

    // Convert Uint8Array to Buffer if needed, then end stream
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    uploadStream.end(buf);
  });
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadBufferToCloudinary
};
