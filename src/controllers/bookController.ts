import type { Request, Response } from 'express';
import { Book } from '../models/Book.js';
import { Category } from '../models/Category.js';
import type { AuthRequest, ApiResponse, BookSearchQuery, PaginatedResponse } from '../types/index.js';
import fs from 'fs';
import path from 'path';

export const getBooks = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      category,
      subcategory,
      language,
      format,
      publicationYear,
      isDownloadable,
      availability,
      sort = 'createdAt',
      order = 'desc'
    } = req.query as BookSearchQuery;

    // Build search query
    const query: any = {};

    // Text search - flexible search across title, author, and ISBN
    if (search) {
      const searchRegex = new RegExp(search, 'i'); // Case-insensitive regex
      query.$or = [
        { title: searchRegex },
        { author: searchRegex },
        { isbn: searchRegex }
      ];
    }

    // Category filters
    if (category) {
      query.category = category;
    }
    if (subcategory) {
      query.subcategory = subcategory;
    }

    // Other filters
    if (language) {
      query.language = language;
    }
    if (format) {
      query.format = format;
    }
    if (publicationYear) {
      query.publicationYear = publicationYear;
    }
    if (isDownloadable !== undefined) {
      query.isDownloadable = isDownloadable === true || isDownloadable === 'true';
    }
    if (availability) {
      if (availability === 'available') {
        query.availableCopies = { $gt: 0 };
      } else if (availability === 'unavailable') {
        query.availableCopies = 0;
      }
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj: any = {};
    sortObj[sort as string] = sortOrder;

    // Execute query with population
    const books = await Book.find(query)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit));

    const totalBooks = await Book.countDocuments(query);
    const totalPages = Math.ceil(totalBooks / Number(limit));

    const response: PaginatedResponse<typeof books[0]> = {
      data: books,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems: totalBooks,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    };

    res.json({
      success: true,
      message: 'Livres récupérés avec succès',
      data: response
    } as ApiResponse);
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des livres'
    } as ApiResponse);
  }
};

export const getBook = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const book = await Book.findById(id)
      .populate('category', 'name description')
      .populate('subcategory', 'name description');

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Livre non trouvé'
      } as ApiResponse);
    }

    res.json({
      success: true,
      message: 'Livre récupéré avec succès',
      data: { book }
    } as ApiResponse);
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du livre'
    } as ApiResponse);
  }
};

export const createBook = async (req: AuthRequest, res: Response) => {
  try {
    const bookData = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Verify category exists
    const category = await Category.findById(bookData.category);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Catégorie non trouvée'
      } as ApiResponse);
    }

    // Verify subcategory exists if provided
    if (bookData.subcategory) {
      const subcategory = await Category.findById(bookData.subcategory);
      if (!subcategory) {
        return res.status(400).json({
          success: false,
          message: 'Sous-catégorie non trouvée'
        } as ApiResponse);
      }
    }

    // Handle file uploads
    if (files) {
      // Handle cover image upload
      if (files.coverImage && files.coverImage[0]) {
        const coverFile = files.coverImage[0];
        const coverFileName = `${Date.now()}-${coverFile.originalname}`;
        const coverPath = path.join('uploads', 'covers', coverFileName);
        const fullCoverPath = path.join(process.cwd(), coverPath);
        
        // Save file to disk
        fs.writeFileSync(fullCoverPath, coverFile.buffer);
        bookData.coverImage = `/uploads/covers/${coverFileName}`;
        console.log('Cover image saved:', coverFileName, coverFile.size, 'bytes');
      }

      // Handle book file upload
      if (files.bookFile && files.bookFile[0]) {
        const bookFile = files.bookFile[0];
        const bookFileName = `${Date.now()}-${bookFile.originalname}`;
        const bookPath = path.join('uploads', 'books', bookFileName);
        const fullBookPath = path.join(process.cwd(), bookPath);
        
        // Save file to disk
        fs.writeFileSync(fullBookPath, bookFile.buffer);
        bookData.filePath = `/uploads/books/${bookFileName}`;
        console.log('Book file saved:', bookFileName, bookFile.size, 'bytes');
      }
    }

    // Parse tags if it's a JSON string or comma-separated string
    if (bookData.tags && typeof bookData.tags === 'string') {
      try {
        bookData.tags = JSON.parse(bookData.tags);
      } catch (e) {
        bookData.tags = bookData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);
      }
    }

    // Clean empty string values for ObjectId fields
    if (bookData.subcategory === '') {
      delete bookData.subcategory;
    }

    // Convert string numbers to actual numbers
    if (bookData.publicationYear) {
      bookData.publicationYear = parseInt(bookData.publicationYear);
    }
    if (bookData.physicalCopies) {
      bookData.physicalCopies = parseInt(bookData.physicalCopies);
    }
    if (bookData.availableCopies) {
      bookData.availableCopies = parseInt(bookData.availableCopies);
    }
    if (bookData.isDownloadable) {
      bookData.isDownloadable = bookData.isDownloadable === 'true';
    }

    const book = new Book(bookData);
    await book.save();

    const populatedBook = await Book.findById(book._id)
      .populate('category', 'name')
      .populate('subcategory', 'name');

    res.status(201).json({
      success: true,
      message: 'Livre créé avec succès',
      data: { book: populatedBook }
    } as ApiResponse);
  } catch (error) {
    console.error('Create book error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du livre'
    } as ApiResponse);
  }
};

export const updateBook = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Verify category exists if being updated
    if (updateData.category) {
      const category = await Category.findById(updateData.category);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Catégorie non trouvée'
        } as ApiResponse);
      }
    }

    // Verify subcategory exists if being updated
    if (updateData.subcategory) {
      const subcategory = await Category.findById(updateData.subcategory);
      if (!subcategory) {
        return res.status(400).json({
          success: false,
          message: 'Sous-catégorie non trouvée'
        } as ApiResponse);
      }
    }

    // Handle file uploads
    if (files) {
      // Handle cover image upload
      if (files.coverImage && files.coverImage[0]) {
        const coverFile = files.coverImage[0];
        const coverFileName = `${Date.now()}-${coverFile.originalname}`;
        const coverPath = path.join('uploads', 'covers', coverFileName);
        const fullCoverPath = path.join(process.cwd(), coverPath);
        
        // Save file to disk
        fs.writeFileSync(fullCoverPath, coverFile.buffer);
        updateData.coverImage = `/uploads/covers/${coverFileName}`;
        console.log('Cover image updated:', coverFileName, coverFile.size, 'bytes');
      }

      // Handle book file upload
      if (files.bookFile && files.bookFile[0]) {
        const bookFile = files.bookFile[0];
        const bookFileName = `${Date.now()}-${bookFile.originalname}`;
        const bookPath = path.join('uploads', 'books', bookFileName);
        const fullBookPath = path.join(process.cwd(), bookPath);
        
        // Save file to disk
        fs.writeFileSync(fullBookPath, bookFile.buffer);
        updateData.filePath = `/uploads/books/${bookFileName}`;
        console.log('Book file updated:', bookFileName, bookFile.size, 'bytes');
      }
    }

    // Parse tags if it's a JSON string or comma-separated string
    if (updateData.tags && typeof updateData.tags === 'string') {
      try {
        updateData.tags = JSON.parse(updateData.tags);
      } catch (e) {
        updateData.tags = updateData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);
      }
    }

    // Clean empty string values for ObjectId fields
    if (updateData.subcategory === '') {
      delete updateData.subcategory;
    }

    // Convert string numbers to actual numbers
    if (updateData.publicationYear) {
      updateData.publicationYear = parseInt(updateData.publicationYear);
    }
    if (updateData.physicalCopies) {
      updateData.physicalCopies = parseInt(updateData.physicalCopies);
    }
    if (updateData.availableCopies) {
      updateData.availableCopies = parseInt(updateData.availableCopies);
    }
    if (updateData.isDownloadable) {
      updateData.isDownloadable = updateData.isDownloadable === 'true';
    }

    const book = await Book.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('category', 'name')
      .populate('subcategory', 'name');

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Livre non trouvé'
      } as ApiResponse);
    }

    res.json({
      success: true,
      message: 'Livre mis à jour avec succès',
      data: { book }
    } as ApiResponse);
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du livre'
    } as ApiResponse);
  }
};

export const deleteBook = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const book = await Book.findByIdAndDelete(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Livre non trouvé'
      } as ApiResponse);
    }

    res.json({
      success: true,
      message: 'Livre supprimé avec succès'
    } as ApiResponse);
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du livre'
    } as ApiResponse);
  }
};
