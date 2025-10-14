import { Router } from 'express';
import { 
  getReadingList,
  addToReadingList,
  removeFromReadingList,
  updateReadingProgress,
  getReadingStats
} from '../controllers/readingListController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All reading list routes require authentication
router.use(authenticate);

// Get user's reading list
router.get('/', getReadingList);

// Get reading statistics
router.get('/stats', getReadingStats);

// Add book to reading list
router.post('/', addToReadingList);

// Update reading progress
router.put('/:bookId', updateReadingProgress);

// Remove book from reading list
router.delete('/:bookId', removeFromReadingList);

export default router;
