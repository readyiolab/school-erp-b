const multer = require('multer');
const path = require('path');
const ApiError = require('../utils/apiError');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

const fileFilter = (allowedTypes) => (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`), false);
  }
};

/**
 * Upload middleware for student admission documents.
 * Fields: photo (image), aadhaar (image/pdf), transferCertificate (image/pdf)
 */
const admissionUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter(ALLOWED_DOC_TYPES)
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'aadhaar', maxCount: 1 },
  { name: 'transferCertificate', maxCount: 1 }
]);

/**
 * Single photo upload middleware.
 */
const photoUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter(ALLOWED_IMAGE_TYPES)
}).single('photo');

/**
 * Generic single file upload.
 */
const singleUpload = (fieldName) => multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter(ALLOWED_DOC_TYPES)
}).single(fieldName);

module.exports = {
  admissionUpload,
  photoUpload,
  singleUpload
};
