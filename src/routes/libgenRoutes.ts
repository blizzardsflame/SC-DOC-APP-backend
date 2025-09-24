import express from 'express';
import {
  searchLibGen,
  startLibGenSearch,
  getLibGenSearchStatus,
  getDownloadLinks,
  downloadAndImportBook,
  getBookDetails
} from '../controllers/libgenController.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and staff role
router.use(auth);
router.use(requireRole('staff'));

// Search LibGen for books (regular)
router.get('/search', searchLibGen);

// Start a new search with real-time status tracking
router.post('/search/start', startLibGenSearch);

// Get search status and results
router.get('/search/status/:searchId', getLibGenSearchStatus);

// Get download links for a specific book
router.get('/download-links/:md5', getDownloadLinks);

// Get book details by MD5
router.get('/details/:md5', getBookDetails);

// Download and import a book from LibGen
router.post('/import', downloadAndImportBook);

export default router;
