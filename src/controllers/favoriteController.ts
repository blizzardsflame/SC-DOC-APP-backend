import type { Response } from 'express';
import Favorite from '../models/Favorite.js';
import { Book } from '../models/Book.js';
import type { AuthRequest, ApiResponse } from '../types/index.js';

// Get all favorites for the authenticated user
export const getFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const favorites = await Favorite.find({ user: userId })
      .populate({
        path: 'book',
        select: 'title author coverImage category subcategory language format publicationYear description',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .populate('user', 'firstname lastname')
      .sort({ createdAt: -1 });

    const response: ApiResponse<{ favorites: typeof favorites }> = {
      success: true,
      data: { favorites },
      message: 'Favorites retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to fetch favorites'
    };
    res.status(500).json(response);
  }
};

// Add a book to favorites
export const addToFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { bookId } = req.body;

    // Validate required fields
    if (!bookId) {
      const response: ApiResponse = {
        success: false,
        message: 'Book ID is required'
      };
      return res.status(400).json(response);
    }

    // Check if book exists
    const book = await Book.findById(bookId);
    if (!book) {
      const response: ApiResponse = {
        success: false,
        message: 'Book not found'
      };
      return res.status(404).json(response);
    }

    // Check if already in favorites
    const existingFavorite = await Favorite.findOne({
      user: userId,
      book: bookId
    });

    if (existingFavorite) {
      const response: ApiResponse = {
        success: false,
        message: 'Book is already in favorites'
      };
      return res.status(409).json(response);
    }

    // Create new favorite
    const favorite = new Favorite({
      user: userId,
      book: bookId
    });

    await favorite.save();

    // Populate the favorite before returning
    await favorite.populate([
      {
        path: 'book',
        select: 'title author coverImage category subcategory language format publicationYear description',
        populate: {
          path: 'category',
          select: 'name'
        }
      },
      {
        path: 'user',
        select: 'firstname lastname'
      }
    ]);

    const response: ApiResponse<{ favorite: typeof favorite }> = {
      success: true,
      data: { favorite },
      message: 'Book added to favorites successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error adding to favorites:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to add book to favorites'
    };
    res.status(500).json(response);
  }
};

// Remove a book from favorites
export const removeFromFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { bookId } = req.params;

    // Find and delete favorite
    const favorite = await Favorite.findOneAndDelete({
      user: userId,
      book: bookId
    });

    if (!favorite) {
      const response: ApiResponse = {
        success: false,
        message: 'Book not found in favorites'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Book removed from favorites successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error removing from favorites:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to remove book from favorites'
    };
    res.status(500).json(response);
  }
};

// Check if a book is in user's favorites
export const checkIsFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { bookId } = req.params;

    // Check if book exists
    const book = await Book.findById(bookId);
    if (!book) {
      const response: ApiResponse = {
        success: false,
        message: 'Book not found'
      };
      return res.status(404).json(response);
    }

    // Check if in favorites
    const favorite = await Favorite.findOne({
      user: userId,
      book: bookId
    });

    const response: ApiResponse<{ isFavorite: boolean }> = {
      success: true,
      data: { isFavorite: !!favorite },
      message: 'Favorite status retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error checking favorite status:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to check favorite status'
    };
    res.status(500).json(response);
  }
};
