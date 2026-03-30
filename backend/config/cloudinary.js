const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Determine folder based on route or file type
        let folder = 'general';
        if (req.originalUrl.includes('/users')) folder = 'avatars';
        if (req.originalUrl.includes('/posts')) folder = 'posts';

        return {
            folder: folder,
            allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'mp4', 'mov'],
            resource_type: 'auto', // Important for video support
            public_id: 'upload-' + Date.now()
        };
    },
});

module.exports = {
    cloudinary,
    storage
};
