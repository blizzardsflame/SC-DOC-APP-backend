import mongoose, { Schema } from 'mongoose';
import type { IBook } from '../types/index.js';

const bookSchema = new Schema<IBook>({
  title: {
    type: String,
    required: [true, 'Le titre du livre est requis'],
    trim: true,
    maxlength: [200, 'Le titre ne peut pas dépasser 200 caractères']
  },
  author: {
    type: String,
    required: [true, 'L\'auteur est requis'],
    trim: true,
    maxlength: [100, 'Le nom de l\'auteur ne peut pas dépasser 100 caractères']
  },
  isbn: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    match: [/^(?:\d{9}[\dX]|\d{13})$/, 'ISBN invalide']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'La description ne peut pas dépasser 2000 caractères']
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'La catégorie est requise']
  },
  subcategory: {
    type: Schema.Types.ObjectId,
    ref: 'Category'
  },
  language: {
    type: String,
    required: [true, 'La langue est requise'],
    enum: {
      values: ['fr', 'ar', 'en'],
      message: 'La langue doit être français (fr), arabe (ar) ou anglais (en)'
    }
  },
  publicationYear: {
    type: Number,
    min: [1000, 'L\'année de publication doit être valide'],
    max: [new Date().getFullYear(), 'L\'année de publication ne peut pas être dans le futur']
  },
  format: {
    type: String,
    required: [true, 'Le format est requis'],
    enum: {
      values: ['pdf', 'epub'],
      message: 'Le format doit être PDF ou EPUB'
    }
  },
  filePath: {
    type: String,
    default: null
  },
  coverImage: {
    type: String,
    default: null
  },
  isDownloadable: {
    type: Boolean,
    default: false
  },
  physicalCopies: {
    type: Number,
    default: 0,
    min: [0, 'Le nombre de copies physiques ne peut pas être négatif']
  },
  availableCopies: {
    type: Number,
    default: 0,
    min: [0, 'Le nombre de copies disponibles ne peut pas être négatif']
  }
}, {
  timestamps: true
});

// Indexes for better query performance
bookSchema.index({ title: 'text', author: 'text', isbn: 'text', description: 'text' });
bookSchema.index({ category: 1, subcategory: 1 });
bookSchema.index({ language: 1, format: 1 });
bookSchema.index({ publicationYear: 1 });
bookSchema.index({ isDownloadable: 1, availableCopies: 1 });

// Validate that availableCopies doesn't exceed physicalCopies
bookSchema.pre('save', function(next) {
  if (this.availableCopies > this.physicalCopies) {
    this.availableCopies = this.physicalCopies;
  }
  next();
});

export const Book = mongoose.model<IBook>('Book', bookSchema);
