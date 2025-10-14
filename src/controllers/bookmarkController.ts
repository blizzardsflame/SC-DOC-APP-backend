import type { Response } from 'express';
import Bookmark from '../models/Bookmark.js';
import { Book } from '../models/Book.js';
import type { AuthRequest, ApiResponse } from '../types/index.js';

// Get all bookmarks for the authenticated user
export const getBookmarks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const bookmarks = await Bookmark.find({ user: userId })
      .populate({
        path: 'book',
        select: 'title author coverImage category language format',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .populate('user', 'firstname lastname')
      .sort({ createdAt: -1 });

    const response: ApiResponse<{ bookmarks: typeof bookmarks }> = {
      success: true,
      data: { bookmarks },
      message: 'Bookmarks retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to fetch bookmarks'
    };
    res.status(500).json(response);
  }
};

// Create a new bookmark
export const createBookmark = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { bookId, page, note } = req.body;

    // Validate required fields
    if (!bookId || !page) {
      const response: ApiResponse = {
        success: false,
        message: 'Book ID and page number are required'
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

    // Check if bookmark already exists for this user, book, and page
    const existingBookmark = await Bookmark.findOne({
      user: userId,
      book: bookId,
      page: page
    });

    if (existingBookmark) {
      const response: ApiResponse = {
        success: false,
        message: 'Bookmark already exists for this page'
      };
      return res.status(409).json(response);
    }

    // Create new bookmark
    const bookmark = new Bookmark({
      user: userId,
      book: bookId,
      page: page,
      note: note?.trim() || undefined
    });

    await bookmark.save();

    // Populate the bookmark before returning
    await bookmark.populate([
      {
        path: 'book',
        select: 'title author coverImage category language format',
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

    const response: ApiResponse<{ bookmark: typeof bookmark }> = {
      success: true,
      data: { bookmark },
      message: 'Bookmark created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating bookmark:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to create bookmark'
    };
    res.status(500).json(response);
  }
};

// Update a bookmark (only note can be updated)
export const updateBookmark = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;
    const { note } = req.body;

    // Find bookmark
    const bookmark = await Bookmark.findOne({
      _id: id,
      user: userId
    });

    if (!bookmark) {
      const response: ApiResponse = {
        success: false,
        message: 'Bookmark not found'
      };
      return res.status(404).json(response);
    }

    // Update note
    bookmark.note = note?.trim() || undefined;
    await bookmark.save();

    // Populate the bookmark before returning
    await bookmark.populate([
      {
        path: 'book',
        select: 'title author coverImage category language format',
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

    const response: ApiResponse<{ bookmark: typeof bookmark }> = {
      success: true,
      data: { bookmark },
      message: 'Bookmark updated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating bookmark:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to update bookmark'
    };
    res.status(500).json(response);
  }
};

// Delete a bookmark
export const deleteBookmark = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    // Find and delete bookmark
    const bookmark = await Bookmark.findOneAndDelete({
      _id: id,
      user: userId
    });

    if (!bookmark) {
      const response: ApiResponse = {
        success: false,
        message: 'Bookmark not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Bookmark deleted successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to delete bookmark'
    };
    res.status(500).json(response);
  }
};

// Get bookmarks for a specific book
export const getBookBookmarks = async (req: AuthRequest, res: Response) => {
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

    const bookmarks = await Bookmark.find({
      user: userId,
      book: bookId
    })
      .populate({
        path: 'book',
        select: 'title author coverImage category language format',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .populate('user', 'firstname lastname')
      .sort({ page: 1 }); // Sort by page number

    const response: ApiResponse<{ bookmarks: typeof bookmarks }> = {
      success: true,
      data: { bookmarks },
      message: 'Book bookmarks retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching book bookmarks:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to fetch book bookmarks'
    };
    res.status(500).json(response);
  }
};
