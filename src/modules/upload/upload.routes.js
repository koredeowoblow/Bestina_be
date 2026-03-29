import express from 'express';
import multer from 'multer';
import uploadController from './upload.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import AppError from '../../utils/AppError.js';
const router = express.Router();

// Configure Multer for memory storage structure limiting sizes and types
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('Not an image! Please upload only images.', 400), false);
    }
  }
});

// Using protect middleware to enforce admin/system ownership
router.use(protect, restrictTo('admin', 'super_admin'));

router.post('/image', upload.single('image'), uploadController.uploadImage);

export default router;
