import mongoose, { Schema } from 'mongoose';
import type { ICategory } from '../types/index.js';

const categorySchema = new Schema<ICategory>({
  name: {
    type: String,
    required: [true, 'Le nom de la catégorie est requis'],
    trim: true,
    maxlength: [100, 'Le nom de la catégorie ne peut pas dépasser 100 caractères']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  parent: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  }
}, {
  timestamps: true
});

// Index for better query performance
categorySchema.index({ parent: 1 });
categorySchema.index({ name: 1, parent: 1 }, { unique: true });

// Prevent circular references
categorySchema.pre('save', async function(next) {
  if (this.parent && this.parent.toString() === this._id.toString()) {
    const error = new Error('Une catégorie ne peut pas être son propre parent');
    return next(error);
  }
  next();
});

// Generate slug from name before saving
categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

export const Category = mongoose.model<ICategory>('Category', categorySchema);
