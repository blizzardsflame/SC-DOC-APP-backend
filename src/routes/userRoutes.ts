import { Router } from 'express';
import { getAllUsers, getUserStats } from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Staff only: Get all users
router.get('/', authorize('staff'), getAllUsers);

// Staff only: Get user statistics
router.get('/stats', authorize('staff'), getUserStats);

export default router;
