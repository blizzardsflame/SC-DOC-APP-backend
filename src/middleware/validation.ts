import type { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import type { ApiResponse } from '../types/index.js';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log('Validation - Request body:', req.body);
    console.log('Validation - Request body keys:', Object.keys(req.body));
    
    const { error } = schema.validate(req.body);
    
    if (error) {
      console.log('Validation error details:', error.details);
      console.log('Full validation error:', error);
      return res.status(400).json({
        success: false,
        message: 'Données de validation invalides',
        error: error.details[0].message,
        field: error.details[0].path,
        value: error.details[0].context?.value
      } as ApiResponse);
    }
    
    next();
  };
};

// User validation schemas
export const registerSchema = Joi.object({
  firstname: Joi.string().trim().min(2).max(50).required()
    .messages({
      'string.empty': 'Le prénom est requis',
      'string.min': 'Le prénom doit contenir au moins 2 caractères',
      'string.max': 'Le prénom ne peut pas dépasser 50 caractères'
    }),
  lastname: Joi.string().trim().min(2).max(50).required()
    .messages({
      'string.empty': 'Le nom de famille est requis',
      'string.min': 'Le nom de famille doit contenir au moins 2 caractères',
      'string.max': 'Le nom de famille ne peut pas dépasser 50 caractères'
    }),
  email: Joi.string().email().lowercase().required()
    .messages({
      'string.email': 'Veuillez fournir une adresse email valide',
      'string.empty': 'L\'email est requis'
    }),
  password: Joi.string().min(6).required()
    .messages({
      'string.min': 'Le mot de passe doit contenir au moins 6 caractères',
      'string.empty': 'Le mot de passe est requis'
    }),
  role: Joi.string().valid('student', 'teacher', 'staff').default('student')
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required()
    .messages({
      'string.email': 'Veuillez fournir une adresse email valide',
      'string.empty': 'L\'email est requis'
    }),
  password: Joi.string().required()
    .messages({
      'string.empty': 'Le mot de passe est requis'
    })
});

// Book validation schemas
export const bookSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required()
    .messages({
      'string.empty': 'Le titre est requis',
      'string.max': 'Le titre ne peut pas dépasser 200 caractères'
    }),
  author: Joi.string().trim().min(1).max(100).required()
    .messages({
      'string.empty': 'L\'auteur est requis',
      'string.max': 'Le nom de l\'auteur ne peut pas dépasser 100 caractères'
    }),
  isbn: Joi.string().pattern(/^(?:\d{9}[\dX]|\d{13})$/).optional().allow('')
    .messages({
      'string.pattern.base': 'ISBN invalide'
    }),
  description: Joi.string().trim().max(2000).optional().allow(''),
  category: Joi.string().required()
    .messages({
      'string.empty': 'La catégorie est requise'
    }),
  subcategory: Joi.string().optional().allow(''),
  language: Joi.string().valid('fr', 'ar', 'en').required()
    .messages({
      'any.only': 'La langue doit être français (fr), arabe (ar) ou anglais (en)'
    }),
  publicationYear: Joi.number().integer().min(1000).max(new Date().getFullYear()).optional(),
  publisher: Joi.string().trim().max(100).optional().allow(''),
  format: Joi.string().valid('pdf', 'epub').required()
    .messages({
      'any.only': 'Le format doit être PDF ou EPUB'
    }),
  isDownloadable: Joi.boolean().default(false),
  physicalCopies: Joi.number().integer().min(0).default(0),
  availableCopies: Joi.number().integer().min(0).default(0),
  tags: Joi.alternatives().try(
    Joi.string().optional().allow(''),
    Joi.array().items(Joi.string()).optional(),
    Joi.string().custom((value, helpers) => {
      // Handle JSON stringified arrays from FormData
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        return value;
      } catch {
        return value;
      }
    })
  ).optional(), // Allow tags as string, array, or JSON stringified array
  // Allow file fields to pass through validation
  coverImage: Joi.any().optional(),
  bookFile: Joi.any().optional()
}).unknown(true); // Allow unknown fields to pass through

// Category validation schemas
export const categorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required()
    .messages({
      'string.empty': 'Le nom de la catégorie est requis',
      'string.max': 'Le nom ne peut pas dépasser 100 caractères'
    }),
  parent: Joi.string().optional(),
  description: Joi.string().trim().max(500).optional()
});

// Borrowing validation schemas
export const borrowingSchema = Joi.object({
  book: Joi.string().required()
    .messages({
      'string.empty': 'L\'ID du livre est requis'
    }),
  dueDate: Joi.date().greater('now').optional()
});
