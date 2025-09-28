import { Router } from 'express';
import multer from 'multer';
import { register, login, getMe, updateProfile, changePassword } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema } from '../middleware/validation.js';

const router = Router();

// Configure multer for card photo uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for card photos
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'cardPhoto') {
      // Accept image files only
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Card photo must be an image file'));
      }
    } else {
      cb(null, true);
    }
  }
});

// Public routes
router.post('/register', 
  upload.single('cardPhoto'),
  validate(registerSchema), 
  register
);
router.post('/login', validate(loginSchema), login);

// Protected routes
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

export default router;
