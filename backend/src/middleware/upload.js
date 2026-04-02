const multer = require('multer');
const ApiError = require('../utils/ApiError');

// In-memory storage (files are streamed directly to Cloudinary)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allow images, videos, audio, and common documents
  const allowedTypes = [
    'image/', // images
    'video/', // videos
    'audio/', // audio files
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type) || file.mimetype === type);

  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `File type ${file.mimetype} is not allowed`));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter,
});

module.exports = upload;
