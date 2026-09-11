const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary using environment variables
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
    secure: true
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - The image buffer from multer
 * @param {string} folder - The Cloudinary folder path
 * @returns {Promise<string>} - Returns the secure HTTPS URL of the uploaded image
 */
const uploadToCloudinary = (fileBuffer, folder = 'jingjang_store/products') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: 'image'
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }
                resolve(result.secure_url);
            }
        );
        uploadStream.end(fileBuffer);
    });
};

module.exports = {
    cloudinary,
    uploadToCloudinary
};
