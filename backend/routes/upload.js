const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Preserve extension if possible, or default to .m4a (audio) or .jpg (image)
        const ext = path.extname(file.originalname) || '.bin';
        cb(null, 'upload-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage: storage });

router.post('/', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Construct URL
    // Assuming API is hosted at root/api, but images served at root/uploads
    // Use full URL for robustness
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const url = `${protocol}://${host}/uploads/${filename}`;

    res.json({ url });
});

module.exports = router;
