import { Router } from 'express';
import { 
  getCategories, 
  getCategoryTree, 
  getCategory, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from '../controllers/categoryController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, categorySchema } from '../middleware/validation.js';

const router = Router();

// Public routes
router.get('/', getCategories);
router.get('/tree', getCategoryTree);
router.get('/:id', getCategory);

// Protected routes - Staff only for CUD operations
router.post('/', authenticate, authorize('staff'), validate(categorySchema), createCategory);
router.put('/:id', authenticate, authorize('staff'), validate(categorySchema), updateCategory);
router.delete('/:id', authenticate, authorize('staff'), deleteCategory);

export default router;
