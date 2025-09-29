import express from 'express';
import { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser,
  updateProfile,
  changePassword,
  sendEmailVerification,
  verifyEmail,
  getUserStats,
  activateUser,
  deactivateUser,
  suspendUser,
  banUser,
  promoteToStaff,
  liftSuspension,
  unbanUser
} from '../controllers/userController.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/verify-email/:token', verifyEmail);

// Protected routes
router.use(auth);

// Profile management (any authenticated user)
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.post('/send-verification', sendEmailVerification);

// Staff only: Get user statistics
router.get('/stats', requireRole('staff'), getUserStats);

// Admin routes (staff only)
router.get('/', requireRole('staff'), getAllUsers);
router.get('/:id', requireRole('staff'), getUserById);
router.post('/', requireRole('staff'), createUser);
router.put('/:id', requireRole('staff'), updateUser);
router.delete('/:id', requireRole('staff'), deleteUser);
router.put('/:userId/activate', requireRole('staff'), activateUser);
router.put('/:userId/deactivate', requireRole('staff'), deactivateUser);
router.put('/:userId/suspend', requireRole('staff'), suspendUser);
router.put('/:userId/lift-suspension', requireRole('staff'), liftSuspension);
router.put('/:userId/ban', requireRole('staff'), banUser);
router.put('/:userId/unban', requireRole('staff'), unbanUser);
router.put('/:userId/promote-to-staff', requireRole('staff'), promoteToStaff);

export default router;
