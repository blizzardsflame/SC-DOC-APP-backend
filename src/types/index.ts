import type { Request } from 'express';
import { Document, Types } from 'mongoose';

// User Types
export interface IUser extends Document {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  role: 'student' | 'teacher' | 'staff';
  cardNumber: string; // Numéro de la carte (Bibliothèque)
  cardPhoto: string; // Photo de la carte (Bibliothèque)
  faculty?: string; // Faculté (only for students)
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  lastVerificationEmailSent?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastPasswordResetEmailSent?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface AuthRequest extends Request {
  user?: IUser;
}

// Book Types
export interface IBook extends Document {
  _id: string;
  title: string;
  author: string;
  isbn?: string;
  description?: string;
  category: string;
  subcategory?: string;
  language: string;
  publicationYear?: number;
  format: 'pdf' | 'epub';
  filePath: string;
  coverImage?: string;
  isDownloadable: boolean;
  physicalCopies: number;
  availableCopies: number;
  createdAt: Date;
  updatedAt: Date;
}

// Category Types
export interface ICategory extends Document {
  _id: string;
  name: string;
  slug: string;
  parent?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Borrowing Types
export interface IBorrowing extends Document {
  user: Types.ObjectId;
  book: Types.ObjectId;
  borrowDate: Date;
  dueDate: Date;
  returnDate?: Date;
  status: 'active' | 'returned' | 'overdue';
  renewalCount: number;
  notifications: Array<{
    sentAt: Date;
    type: 'overdue_reminder' | 'final_notice';
    method: 'email' | 'system';
  }>;
  notificationCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Pagination Types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Search and Filter Types
export interface BookSearchQuery extends PaginationQuery {
  search?: string;
  category?: string;
  subcategory?: string;
  language?: string;
  format?: 'pdf' | 'epub';
  publicationYear?: number;
  isDownloadable?: boolean;
  availability?: 'available' | 'unavailable';
}
