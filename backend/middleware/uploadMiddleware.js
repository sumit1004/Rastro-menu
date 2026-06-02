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
    else if (file.fieldname === 'glb_model') folder = 'uploads/ar-assets/models/glb/';
    else if (file.fieldname === 'usdz_model') folder = 'uploads/ar-assets/models/usdz/';
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
  // Some browsers send generic application/octet-stream for 3d models, or model/gltf-binary
  const allowedModelTypes = ['model/gltf-binary', 'model/gltf+json', 'model/vnd.usdz+zip', 'application/octet-stream'];
  
  const ext = path.extname(file.originalname).toLowerCase();

  // Basic security validation: reject executables
  const blockedExtensions = ['.exe', '.sh', '.bat', '.cmd', '.php', '.js', '.html'];
  if (blockedExtensions.includes(ext)) {
    return cb(new Error('Invalid file type! Executables are not allowed.'), false);
  }

  if (file.fieldname === 'glb_model' && (allowedModelTypes.includes(file.mimetype) || ext === '.glb' || ext === '.gltf')) {
    cb(null, true);
  } else if (file.fieldname === 'usdz_model' && (allowedModelTypes.includes(file.mimetype) || ext === '.usdz')) {
    cb(null, true);
  } else if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else if (file.fieldname === 'ar_video' && allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type for ${file.fieldname}!`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit for high-quality production models
  },
  fileFilter: fileFilter
});

module.exports = upload;
