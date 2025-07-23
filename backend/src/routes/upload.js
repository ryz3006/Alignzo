import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import sharp from 'sharp';
const router = express.Router();

function getUploadPath() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return path.join(process.cwd(), 'uploads', year.toString(), month, day);
}

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadPath = getUploadPath();
    await fs.ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Only process image files
  const ext = path.extname(req.file.filename).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    try {
      const image = sharp(req.file.path);
      const metadata = await image.metadata();
      if (metadata.width > 600) {
        // Use a temp file for resizing
        const tempPath = req.file.path + '_resized';
        await image.resize({ width: 600 }).toFile(tempPath);
        // Replace the original file only if resizing succeeded
        await fs.move(tempPath, req.file.path, { overwrite: true });
      }
    } catch (err) {
      // If sharp fails, keep the original file and log the error
      console.error('Image resize failed:', err);
    }
  }

  const relPath = path.relative(process.cwd(), req.file.path).replace(/\\/g, '/');
  res.json({ filePath: '/' + relPath });
});

export default router; 