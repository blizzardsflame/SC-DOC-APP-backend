import { Router } from 'express';
import { 
  getBookmarks, 
  createBookmark, 
  updateBookmark, 
  deleteBookmark, 
  getBookBookmarks 
} from '../controllers/bookmarkController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, bookmarkSchema } from '../middleware/validation.js';

const router = Router();

// All bookmark routes require authentication
router.use(authenticate);

// Get all bookmarks for the authenticated user
router.get('/', getBookmarks);

// Create a new bookmark
router.post('/', validate(bookmarkSchema), createBookmark);

// Update a bookmark (only note can be updated)
router.patch('/:id', updateBookmark);

// Delete a bookmark
router.delete('/:id', deleteBookmark);

// Get bookmarks for a specific book
router.get('/book/:bookId', getBookBookmarks);

export default router;
