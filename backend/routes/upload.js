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
    console.log(`[Push-Debug] [Upload] Generic upload request. File:`, req.file ? req.file.originalname : 'NONE');

    if (!req.file) {
        console.error(`[Push-Debug] [Upload] Generic upload failed: No file in request`);
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const host = req.get('host');
    const filename = req.file.filename;
    const protocol = req.get('x-forwarded-proto') || req.protocol;

    // Construct absolute URL for the uploaded file
    const url = `${protocol}://${host}/uploads/${filename}`;

    res.json({ url });
});

module.exports = router;
