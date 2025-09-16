import { Router } from 'express';
import multer from 'multer';
import { getBooks, getBook, createBook, updateBook, deleteBook } from '../controllers/bookController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, bookSchema } from '../middleware/validation.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'coverImage') {
      // Accept image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Cover image must be an image file'), false);
      }
    } else if (file.fieldname === 'bookFile') {
      // Accept PDF and EPUB files
      if (file.mimetype === 'application/pdf' || file.mimetype === 'application/epub+zip') {
        cb(null, true);
      } else {
        cb(new Error('Book file must be PDF or EPUB'), false);
      }
    } else {
      cb(null, true);
    }
  }
});

// Public routes
router.get('/', getBooks);
router.get('/:id', getBook);

// Protected routes - Staff only for CUD operations
router.post('/', 
  authenticate, 
  authorize('staff'), 
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'bookFile', maxCount: 1 }
  ]),
  validate(bookSchema), 
  createBook
);

router.put('/:id', 
  authenticate, 
  authorize('staff'), 
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'bookFile', maxCount: 1 }
  ]),
  validate(bookSchema), 
  updateBook
);

router.delete('/:id', authenticate, authorize('staff'), deleteBook);

export default router;
