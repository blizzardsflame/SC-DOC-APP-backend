import { Router } from 'express';
import { 
  getReadingHistory,
  addToReadingHistory
} from '../controllers/readingHistoryController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All reading history routes require authentication
router.use(authenticate);

// Get user's reading history
router.get('/', getReadingHistory);

// Add book to reading history
router.post('/', addToReadingHistory);

export default router;
