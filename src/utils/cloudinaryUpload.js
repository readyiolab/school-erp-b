const cloudinary = require('../config/cloudinary');

const uploadBufferToCloudinary = (buffer, { folder, publicId }) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'raw',
        format: 'pdf',
        overwrite: true
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        return resolve(result);
      }
    );

    stream.end(buffer);
  });

module.exports = {
  uploadBufferToCloudinary
};
