import type{ Request, Response, NextFunction } from 'express';
import type{ ApiResponse } from '../types/index.js';
import { config } from '../config/env.js';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let message = 'Erreur interne du serveur';
  let statusCode = 500;

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(error.errors).map((val: any) => val.message).join(', ');
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    statusCode = 400;
    const field = Object.keys(error.keyValue)[0];
    message = `${field} existe déjà`;
  }

  // Mongoose cast error
  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'ID invalide';
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token invalide';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expiré';
  }

  // Multer file upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'Fichier trop volumineux';
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Type de fichier non autorisé';
  }

  console.error('Error:', error);

  const response: ApiResponse = {
    success: false,
    message,
    ...(config.NODE_ENV === 'development' && { error: error.stack })
  };

  res.status(statusCode).json(response);
};

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} non trouvée`
  } as ApiResponse);
};
