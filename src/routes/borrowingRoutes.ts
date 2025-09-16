import { Router } from 'express';
import { 
  getBorrowings, 
  createBorrowing, 
  createBorrowingForUser,
  returnBook, 
  renewBorrowing,
  getOverdueBooks,
  getBorrowingStats,
  sendOverdueNotification,
  updateBorrowing
} from '../controllers/borrowingController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, borrowingSchema } from '../middleware/validation.js';

const router = Router();

// All borrowing routes require authentication
router.use(authenticate);

// Get borrowings (users see their own, staff see all)
router.get('/', getBorrowings);

// Create new borrowing
router.post('/', validate(borrowingSchema), createBorrowing);

// Staff only: Create borrowing for any user
router.post('/staff', authorize('staff'), createBorrowingForUser);

// Update borrowing (staff only)
router.put('/:id', authorize('staff'), updateBorrowing);

// Return a book
router.put('/:id/return', returnBook);

// Renew a borrowing
router.put('/:id/renew', renewBorrowing);

// Staff only: Send overdue notification
router.post('/:id/notify', authorize('staff'), sendOverdueNotification);

// Staff only routes
router.get('/overdue', authorize('staff'), getOverdueBooks);
router.get('/stats', authorize('staff'), getBorrowingStats);

export default router;
