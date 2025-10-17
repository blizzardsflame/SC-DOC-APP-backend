import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getLibGenLinks,
  createLibGenLink,
  updateLibGenLink,
  deleteLibGenLink
} from '../controllers/libgenLinksController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/libgen-links - Get all LibGen links
router.get('/', getLibGenLinks);

// POST /api/libgen-links - Create new LibGen link (staff only)
router.post('/', createLibGenLink);

// PUT /api/libgen-links/:id - Update LibGen link (staff only)
router.put('/:id', updateLibGenLink);

// DELETE /api/libgen-links/:id - Delete LibGen link (staff only)
router.delete('/:id', deleteLibGenLink);

export default router;
