import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { User } from '../models/User.js';
import type { AuthRequest, ApiResponse } from '../types/index.js';
import { config } from '../config/env.js';

const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN
  });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { firstname, lastname, email, password, role, cardNumber, faculty } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Validate required fields
    if (!firstname || !lastname || !email || !password || !cardNumber) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires doivent être remplis'
      } as ApiResponse);
    }

    // Validate card photo upload
    if (!files || !files.cardPhoto || !files.cardPhoto[0]) {
      return res.status(400).json({
        success: false,
        message: 'La photo de carte est requise'
      } as ApiResponse);
    }

    // Validate faculty for students
    if (role === 'student' && !faculty) {
      return res.status(400).json({
        success: false,
        message: 'La faculté est requise pour les étudiants'
      } as ApiResponse);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      } as ApiResponse);
    }

    // Check if card number already exists
    const existingCard = await User.findOne({ cardNumber });
    if (existingCard) {
      return res.status(400).json({
        success: false,
        message: 'Ce numéro de carte est déjà utilisé'
      } as ApiResponse);
    }

    // Handle card photo upload
    let cardPhotoPath = '';
    if (files.cardPhoto && files.cardPhoto[0]) {
      const cardPhotoFile = files.cardPhoto[0];
      const cardPhotoFileName = `${Date.now()}-${cardPhotoFile.originalname}`;
      const cardPhotoDir = path.join(process.cwd(), 'uploads', 'cards');
      
      // Ensure directory exists
      if (!fs.existsSync(cardPhotoDir)) {
        fs.mkdirSync(cardPhotoDir, { recursive: true });
      }
      
      const fullCardPhotoPath = path.join(cardPhotoDir, cardPhotoFileName);
      
      // Save file to disk
      fs.writeFileSync(fullCardPhotoPath, cardPhotoFile.buffer);
      cardPhotoPath = `/uploads/cards/${cardPhotoFileName}`;
      console.log('Card photo saved:', cardPhotoFileName, cardPhotoFile.size, 'bytes');
    }

    // Create new user
    const user = new User({
      firstname,
      lastname,
      email,
      password,
      role: role || 'student',
      cardNumber,
      cardPhoto: cardPhotoPath,
      faculty: role === 'student' ? faculty : undefined,
      isActive: false // Users need staff validation
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès. Votre compte est en attente de validation par le personnel.',
      data: {
        user: user.toJSON(),
        token
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du compte'
    } as ApiResponse);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      } as ApiResponse);
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Compte suspendu. Contactez l\'administration.'
      } as ApiResponse);
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      } as ApiResponse);
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: user.toJSON(),
        token
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion'
    } as ApiResponse);
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      success: true,
      message: 'Profil utilisateur récupéré',
      data: { user: req.user }
    } as ApiResponse);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    } as ApiResponse);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { firstname, lastname } = req.body;
    const userId = req.user?._id;

    const user = await User.findByIdAndUpdate(
      userId,
      { firstname, lastname },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      } as ApiResponse);
    }

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: { user }
    } as ApiResponse);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil'
    } as ApiResponse);
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?._id;

    // Get user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      } as ApiResponse);
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      } as ApiResponse);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    } as ApiResponse);
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe'
    } as ApiResponse);
  }
};
