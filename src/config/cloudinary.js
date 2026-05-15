const { v2: cloudinary } = require('cloudinary');
const {
  cloudinaryCloudName,
  cloudinaryApiKey,
  cloudinaryApiSecret
} = require('./dotenv');

cloudinary.config({
  cloud_name: cloudinaryCloudName,
  api_key: cloudinaryApiKey,
  api_secret: cloudinaryApiSecret,
  secure: true
});

module.exports = cloudinary;
