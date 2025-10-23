import type { Request, Response } from 'express';
import { ReadingList } from '../models/ReadingList.js';
import { Book } from '../models/Book.js';
import { addReadingHistoryEntry } from './readingHistoryController.js';
import type { AuthRequest, ApiResponse } from '../types/index.js';

// Get user's reading list
export const getReadingList = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { status } = req.query;

    let query: any = { user: user?._id };
    
    if (status) {
      query.status = status;
    }

    const readingList = await ReadingList.find(query)
      .populate('book', 'title author isbn format category coverImage')
      .populate({
        path: 'book',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .sort({ addedDate: -1 });

    res.json({
      success: true,
      message: 'Liste de lecture récupérée avec succès',
      data: { readingList }
    } as ApiResponse);
  } catch (error) {
    console.error('Get reading list error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la liste de lecture'
    } as ApiResponse);
  }
};

// Add book to reading list
export const addToReadingList = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { bookId, status = 'to-read' } = req.body;

    // Check if book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Livre non trouvé'
      } as ApiResponse);
    }

    // Check if book is already in reading list
    const existingEntry = await ReadingList.findOne({
      user: user?._id,
      book: bookId
    });

    if (existingEntry) {
      return res.status(400).json({
        success: false,
        message: 'Ce livre est déjà dans votre liste de lecture'
      } as ApiResponse);
    }

    // Create new reading list entry
    const readingListItem = new ReadingList({
      user: user?._id,
      book: bookId,
      status,
      addedDate: new Date()
    });

    await readingListItem.save();

    const populatedItem = await ReadingList.findById(readingListItem._id)
      .populate('book', 'title author isbn format category coverImage')
      .populate({
        path: 'book',
        populate: {
          path: 'category',
          select: 'name'
        }
      });

    res.status(201).json({
      success: true,
      message: 'Livre ajouté à la liste de lecture',
      data: { readingListItem: populatedItem }
    } as ApiResponse);
  } catch (error) {
    console.error('Add to reading list error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout à la liste de lecture'
    } as ApiResponse);
  }
};

// Remove book from reading list
export const removeFromReadingList = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { bookId } = req.params;

    const readingListItem = await ReadingList.findOneAndDelete({
      user: user?._id,
      book: bookId
    });

    if (!readingListItem) {
      return res.status(404).json({
        success: false,
        message: 'Livre non trouvé dans la liste de lecture'
      } as ApiResponse);
    }

    res.json({
      success: true,
      message: 'Livre retiré de la liste de lecture'
    } as ApiResponse);
  } catch (error) {
    console.error('Remove from reading list error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la liste de lecture'
    } as ApiResponse);
  }
};

// Update reading progress
export const updateReadingProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { bookId } = req.params;
    const { progress, status, notes, lastPage } = req.body;

    const readingListItem = await ReadingList.findOne({
      user: user?._id,
      book: bookId
    });

    if (!readingListItem) {
      return res.status(404).json({
        success: false,
        message: 'Livre non trouvé dans la liste de lecture'
      } as ApiResponse);
    }

    // Update fields
    if (progress !== undefined) {
      readingListItem.progress = progress;
      readingListItem.lastReadDate = new Date();
      
      // Auto-update status based on progress
      if (progress === 100) {
        readingListItem.status = 'completed';
      } else if (progress > 0) {
        readingListItem.status = 'reading';
      }
    }

    if (lastPage !== undefined) {
      readingListItem.lastPage = lastPage;
      readingListItem.lastReadDate = new Date();
    }

    if (status) {
      readingListItem.status = status;
      readingListItem.lastReadDate = new Date();
    }

    if (notes !== undefined) {
      readingListItem.notes = notes;
    }

    await readingListItem.save();

    // Add to reading history if marked as completed
    if (readingListItem.status === 'completed') {
      await addReadingHistoryEntry(
        user?._id?.toString() || '',
        bookId,
        'reading_list',
        undefined,
        readingListItem._id.toString()
      );
    }

    const populatedItem = await ReadingList.findById(readingListItem._id)
      .populate('book', 'title author isbn format category coverImage')
      .populate({
        path: 'book',
        populate: {
          path: 'category',
          select: 'name'
        }
      });

    res.json({
      success: true,
      message: 'Progrès de lecture mis à jour',
      data: { readingListItem: populatedItem }
    } as ApiResponse);
  } catch (error) {
    console.error('Update reading progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du progrès'
    } as ApiResponse);
  }
};

// Get reading statistics
export const getReadingStats = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;

    const stats = await ReadingList.aggregate([
      { $match: { user: user?._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = {
      'to-read': 0,
      'reading': 0,
      'completed': 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id as keyof typeof formattedStats] = stat.count;
    });

    res.json({
      success: true,
      message: 'Statistiques de lecture récupérées',
      data: { stats: formattedStats }
    } as ApiResponse);
  } catch (error) {
    console.error('Get reading stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    } as ApiResponse);
  }
};
