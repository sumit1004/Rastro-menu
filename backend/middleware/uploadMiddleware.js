const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'uploads/';
    if (file.fieldname === 'logo') folder = 'uploads/logos/';
    else if (file.fieldname === 'banner') folder = 'uploads/banners/';
    else if (file.fieldname === 'ar_image') folder = 'uploads/ar-assets/temp/'; // Temp folder for pre-optimized AR images
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
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
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
