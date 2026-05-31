const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'uploads/';
    if (file.fieldname === 'logo') folder = 'uploads/logos/';
    else if (file.fieldname === 'banner') folder = 'uploads/banners/';
    else if (file.fieldname === 'ar_image') folder = 'uploads/ar-assets/temp/'; // Temp folder for pre-optimized AR images
    else if (file.fieldname === 'ar_video') folder = 'uploads/ar-assets/video/';
    else folder = 'uploads/dishes/';
    
    // Ensure directory exists
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideoTypes = ['video/mp4', 'video/webm'];

  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else if (file.fieldname === 'ar_video' && allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type! Only JPG, PNG, WEBP, GIF images and MP4, WEBM videos are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit (AR assets might be large before compression)
  },
  fileFilter: fileFilter
});

module.exports = upload;
