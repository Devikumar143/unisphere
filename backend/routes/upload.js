const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const { storage } = require('../config/cloudinary');

const upload = multer({ storage: storage });

router.post('/', upload.single('file'), (req, res) => {
    console.log(`[Cloudinary] Generic upload request. File:`, req.file ? req.file.originalname : 'NONE');

    if (!req.file) {
        console.error(`[Cloudinary] Generic upload failed: No file in request`);
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Cloudinary returns the URL in req.file.path (or req.file.secure_url)
    const url = req.file.path;

    res.json({ url });
});

module.exports = router;
