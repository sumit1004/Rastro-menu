const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Storage strategy: memory storage to allow sharp to process the buffer before saving
const storage = multer.memoryStorage();

// File type validation
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
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

module.exports = upload;
