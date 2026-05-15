const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'school_erp',
    allowed_formats: ['jpg', 'png', 'pdf'],
    public_id: (req, file) => `${Date.now()}-${file.originalname.split('.')[0]}`
  }
});

/**
 * Upload a single file Buffer to Cloudinary
 * @param {Buffer} buffer 
 * @param {Object} options 
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadFromBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'school_erp', ...options },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

module.exports = { cloudinary, storage, uploadFromBuffer };
