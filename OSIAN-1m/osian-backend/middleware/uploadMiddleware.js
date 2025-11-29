const multer = require('multer');
const path = require('path');

// Storage config can be memory storage or disk storage based on requirements
// For now, use memory storage to get file buffer for processing
const storage = multer.memoryStorage();

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('File upload only supports image files (jpeg, jpg, png, gif)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 // 1MB size limit
  },
  fileFilter: fileFilter
});

module.exports = upload;
