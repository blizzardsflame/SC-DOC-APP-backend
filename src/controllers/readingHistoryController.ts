import type { Response } from 'express';
import { ReadingHistory } from '../models/ReadingHistory.js';
import type { AuthRequest, ApiResponse } from '../types/index.js';

// Get user's reading history (recently read books)
export const getReadingHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { limit = 20 } = req.query;

    const readingHistory = await ReadingHistory.find({ user: user?._id })
      .populate('book', 'title author isbn format category coverImage')
      .populate({
        path: 'book',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .sort({ readDate: -1 })
      .limit(parseInt(limit as string));

    res.json({
      success: true,
      message: 'Historique de lecture récupéré avec succès',
      data: { readingHistory }
    } as ApiResponse);
  } catch (error) {
    console.error('Get reading history error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique de lecture'
    } as ApiResponse);
  }
};

// Add book to reading history
export const addToReadingHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { bookId, source = 'manual', borrowingId, readingListId, progress = 0, lastPage = 1 } = req.body;

    // Check if entry already exists for this source
    const existingEntry = await ReadingHistory.findOne({
      user: user?._id,
      book: bookId,
      source
    });

    if (existingEntry) {
      // Update the read date and progress
      existingEntry.readDate = new Date();
      existingEntry.progress = progress;
      existingEntry.lastPage = lastPage;
      await existingEntry.save();

      const populatedEntry = await ReadingHistory.findById(existingEntry._id)
        .populate('book', 'title author isbn format category coverImage')
        .populate({
          path: 'book',
          populate: {
            path: 'category',
            select: 'name'
          }
        });

      return res.json({
        success: true,
        message: 'Historique de lecture mis à jour',
        data: { readingHistory: populatedEntry }
      } as ApiResponse);
    }

    // Create new reading history entry
    const readingHistoryEntry = new ReadingHistory({
      user: user?._id,
      book: bookId,
      source,
      borrowingId,
      readingListId,
      progress,
      lastPage,
      readDate: new Date()
    });

    await readingHistoryEntry.save();

    const populatedEntry = await ReadingHistory.findById(readingHistoryEntry._id)
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
      message: 'Livre ajouté à l\'historique de lecture',
      data: { readingHistory: populatedEntry }
    } as ApiResponse);
  } catch (error) {
    console.error('Add to reading history error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout à l\'historique de lecture'
    } as ApiResponse);
  }
};

// Helper function to add reading history from other controllers
export const addReadingHistoryEntry = async (
  userId: string, 
  bookId: string, 
  source: 'borrowing' | 'reading_list' | 'manual',
  borrowingId?: string,
  readingListId?: string
) => {
  try {
    // Check if entry already exists for this source
    const existingEntry = await ReadingHistory.findOne({
      user: userId,
      book: bookId,
      source
    });

    if (existingEntry) {
      // Update the read date
      existingEntry.readDate = new Date();
      await existingEntry.save();
      return existingEntry;
    }

    // Create new reading history entry
    const readingHistoryEntry = new ReadingHistory({
      user: userId,
      book: bookId,
      source,
      borrowingId,
      readingListId,
      readDate: new Date()
    });

    await readingHistoryEntry.save();
    return readingHistoryEntry;
  } catch (error) {
    console.error('Add reading history entry error:', error);
    return null;
  }
};
