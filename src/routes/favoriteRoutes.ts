import { Router } from 'express';
import { 
  getFavorites, 
  addToFavorites, 
  removeFromFavorites, 
  checkIsFavorite 
} from '../controllers/favoriteController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, favoriteSchema } from '../middleware/validation.js';

const router = Router();

// All favorite routes require authentication
router.use(authenticate);

// Get all favorites for the authenticated user
router.get('/', getFavorites);

// Add a book to favorites
router.post('/', validate(favoriteSchema), addToFavorites);

// Remove a book from favorites
router.delete('/:bookId', removeFromFavorites);

// Check if a book is in user's favorites
router.get('/check/:bookId', checkIsFavorite);

export default router;
