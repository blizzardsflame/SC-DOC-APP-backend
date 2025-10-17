import type { Response } from 'express';
import type { AuthRequest, ApiResponse } from '../types/index.js';
import libgenService from '../services/libgenService.js';
import { Book } from '../models/Book.js';

// Store for ongoing searches
const ongoingSearches = new Map<string, {
  status: string[];
  results?: any;
  completed: boolean;
  error?: string;
}>();

// Search LibGen for books
export const searchLibGen = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;

    // Check if user is staff
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut rechercher dans LibGen'
      } as ApiResponse);
    }

    const { q: query, page = 1, limit = 25 } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Requête de recherche requise'
      } as ApiResponse);
    }

    const statusUpdates: string[] = [];
    
    const searchResults = await libgenService.searchBooks(
      query,
      parseInt(page as string),
      parseInt(limit as string),
      {
        onStatusUpdate: (status: string) => {
          statusUpdates.push(status);
          console.log(status); // Keep console logging for server logs
        }
      }
    );

    res.json({
      success: true,
      message: 'Recherche LibGen réussie',
      data: {
        ...searchResults,
        statusUpdates
      }
    } as ApiResponse);
  } catch (error: any) {
    console.error('LibGen search error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche LibGen',
      error: error.message
    } as ApiResponse);
  }
};

// Get download links for a book
export const getDownloadLinks = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;

    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut obtenir les liens de téléchargement'
      } as ApiResponse);
    }

    const { md5 } = req.params;

    if (!md5) {
      return res.status(400).json({
        success: false,
        message: 'Hash MD5 requis'
      } as ApiResponse);
    }

    const downloadLinks = await libgenService.getDownloadLinks(md5);

    res.json({
      success: true,
      message: 'Liens de téléchargement obtenus',
      data: { downloadLinks }
    } as ApiResponse);
  } catch (error: any) {
    console.error('Get download links error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'obtention des liens de téléchargement',
      error: error.message
    } as ApiResponse);
  }
};

// Get direct download URL for a book (bypassing ads page)
export const getDirectDownloadUrl = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;

    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut obtenir les liens de téléchargement direct'
      } as ApiResponse);
    }

    const { md5 } = req.params;

    if (!md5) {
      return res.status(400).json({
        success: false,
        message: 'Hash MD5 requis'
      } as ApiResponse);
    }

    // Get the actual download links (with extracted keys)
    const downloadLinks = await libgenService.getDownloadLinks(md5);

    if (downloadLinks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aucun lien de téléchargement direct trouvé'
      } as ApiResponse);
    }

    // Return all available direct download links
    res.json({
      success: true,
      message: 'Liens de téléchargement direct obtenus',
      data: { 
        directDownloadUrls: downloadLinks,
        count: downloadLinks.length
      }
    } as ApiResponse);
  } catch (error: any) {
    console.error('Get direct download URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'obtention du lien de téléchargement direct',
      error: error.message
    } as ApiResponse);
  }
};

// Download and import a book from LibGen
export const downloadAndImportBook = async (req: AuthRequest, res: Response) => {
  try {
    console.log('=== Import Book Request ===');
    console.log('Request body:', req.body);
    console.log('User:', req.user?.email);

    const { user } = req;

    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut importer des livres'
      } as ApiResponse);
    }

    const { 
      downloadUrl, 
      bookInfo, 
      categoryId,
      subcategoryId,
      physicalCopies = 0 
    } = req.body;

    console.log('Extracted data:', { downloadUrl, bookInfo, categoryId, subcategoryId, physicalCopies });

    if (!downloadUrl || !bookInfo || !categoryId) {
      console.log('Missing required fields:', { 
        hasDownloadUrl: !!downloadUrl, 
        hasBookInfo: !!bookInfo, 
        hasCategoryId: !!categoryId 
      });
      return res.status(400).json({
        success: false,
        message: 'URL de téléchargement, informations du livre et catégorie requis'
      } as ApiResponse);
    }

    // Check if book already exists by title and author
    const existingBook = await Book.findOne({
      title: { $regex: new RegExp(bookInfo.title, 'i') },
      author: { $regex: new RegExp(bookInfo.author, 'i') }
    });

    if (existingBook) {
      return res.status(409).json({
        success: false,
        message: 'Ce livre existe déjà dans la bibliothèque'
      } as ApiResponse);
    }

    // Download the book file
    const filePath = await libgenService.downloadBook(downloadUrl, bookInfo);

    // Prepare book data for database
    const bookData = await libgenService.importBook(bookInfo, categoryId, filePath, subcategoryId);
    
    // Add physical copies if specified
    bookData.physicalCopies = parseInt(physicalCopies as string) || 0;
    bookData.availableCopies = bookData.physicalCopies;

    // Create book in database
    const newBook = new Book(bookData);
    await newBook.save();

    res.json({
      success: true,
      message: 'Livre téléchargé et importé avec succès',
      data: newBook
    } as ApiResponse);
  } catch (error: any) {
    console.error('Download and import error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du téléchargement et de l\'importation du livre',
      error: error.message
    } as ApiResponse);
  }
};

// Get book details from LibGen
export const getBookDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;

    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut voir les détails des livres'
      } as ApiResponse);
    }

    const { md5 } = req.params;

    if (!md5) {
      return res.status(400).json({
        success: false,
        message: 'Hash MD5 requis'
      } as ApiResponse);
    }

    const bookDetails = await libgenService.getBookDetails(md5);

    if (!bookDetails) {
      return res.status(404).json({
        success: false,
        message: 'Livre non trouvé dans LibGen'
      } as ApiResponse);
    }

    res.json({
      success: true,
      message: 'Détails du livre obtenus',
      data: bookDetails
    } as ApiResponse);
  } catch (error: any) {
    console.error('Get book details error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'obtention des détails du livre',
      error: error.message
    } as ApiResponse);
  }
};

// Start a search with real-time status tracking
export const startLibGenSearch = async (req: AuthRequest, res: Response) => {
  try {
    console.log('=== LibGen Search Start ===');
    console.log('Request query:', req.query);
    console.log('Request body:', req.body);
    console.log('Request user:', req.user);

    const { user } = req;

    // Check if user exists
    if (!user) {
      console.log('No user found in request');
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      } as ApiResponse);
    }

    // Check if user is staff
    if (user.role !== 'staff') {
      console.log('User is not staff:', user.role);
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut rechercher dans LibGen'
      } as ApiResponse);
    }

    // Get parameters from query string (for POST with URL params)
    const { q: query, page = 1, limit = 50, format, fields } = req.query;

    console.log('Extracted parameters:', { query, page, limit, format, fields });

    if (!query || typeof query !== 'string') {
      console.log('Invalid query parameter:', query);
      return res.status(400).json({
        success: false,
        message: 'Requête de recherche requise',
        debug: { query: req.query, body: req.body }
      } as ApiResponse);
    }

    // Generate unique search ID
    const searchId = `${user.id || 'anonymous'}-${Date.now()}`;
    console.log('Generated search ID:', searchId);
    
    // Initialize search status
    ongoingSearches.set(searchId, {
      status: ['Starting LibGen search...'],
      completed: false
    });

    console.log('Search initialized in memory');

    // Start search in background with real LibGen service
    libgenService.searchBooks(
      query,
      parseInt(page as string),
      parseInt(limit as string),
      {
        onStatusUpdate: (status: string) => {
          const search = ongoingSearches.get(searchId);
          if (search) {
            search.status.push(status);
            console.log('LibGen status update:', status);
          }
        }
      },
      format as string
    ).then((results) => {
      const search = ongoingSearches.get(searchId);
      if (search) {
        search.results = results;
        search.completed = true;
        search.status.push('LibGen search completed successfully');
        console.log('LibGen search completed for ID:', searchId, 'Results:', results.books.length, 'books');
      }
    }).catch((error) => {
      const search = ongoingSearches.get(searchId);
      if (search) {
        search.error = error.message;
        search.completed = true;
        search.status.push('LibGen search failed: ' + error.message);
        console.error('LibGen search failed for ID:', searchId, error);
      }
    });

    // Return immediately
    res.json({
      success: true,
      message: 'Recherche démarrée',
      data: { searchId }
    } as ApiResponse);

    console.log('Response sent successfully');

  } catch (error: any) {
    console.error('=== LibGen Search Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors du démarrage de la recherche LibGen',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    } as ApiResponse);
  }
};

// Get search status and results
export const getLibGenSearchStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { searchId } = req.params;

    // Check if user is staff
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      } as ApiResponse);
    }

    const search = ongoingSearches.get(searchId);
    if (!search) {
      return res.status(404).json({
        success: false,
        message: 'Recherche non trouvée'
      } as ApiResponse);
    }

    console.log(`Status request for ${searchId}:`, {
      completed: search.completed,
      statusCount: search.status.length,
      hasResults: !!search.results,
      hasError: !!search.error
    });

    // Clean up completed searches after sending response
    if (search.completed) {
      setTimeout(() => {
        ongoingSearches.delete(searchId);
      }, 30000); // Keep for 30 seconds after completion
    }

    res.json({
      success: true,
      data: {
        status: search.status,
        results: search.results,
        completed: search.completed,
        error: search.error
      }
    } as ApiResponse);
  } catch (error: any) {
    console.error('Get LibGen search status error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut',
      error: error.message
    } as ApiResponse);
  }
};
