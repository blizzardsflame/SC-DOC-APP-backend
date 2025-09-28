import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { User } from '../models/User.js';
import type { AuthRequest, ApiResponse } from '../types/index.js';
import emailService from '../services/emailService.js';
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

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

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
      isActive: false, // Users need staff validation
      isEmailVerified: false, // Email needs verification
      emailVerificationToken,
      emailVerificationExpires
    });

    await user.save();

    // Send verification email
    try {
      const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email/${emailVerificationToken}`;
      
      await emailService.sendVerificationEmail({
        userEmail: email,
        userName: `${firstname} ${lastname}`,
        verificationToken: emailVerificationToken,
        verificationUrl
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails, just log it
    }

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès. Veuillez vérifier votre email pour activer votre compte. Votre compte est également en attente de validation par le personnel.',
      data: {
        user: {
          id: user._id,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isActive: user.isActive
        },
        requiresEmailVerification: true
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

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        message: 'Veuillez vérifier votre email avant de vous connecter. Vérifiez votre boîte de réception.',
        requiresEmailVerification: true
      } as ApiResponse);
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Compte en attente de validation par le personnel.'
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

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'L\'adresse email est requise'
      } as ApiResponse);
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({
        success: true,
        message: 'Si cette adresse email existe, vous recevrez un lien de réinitialisation'
      } as ApiResponse);
    }

    // Check cooldown (5 minutes between password reset emails)
    const now = new Date();
    if (user.lastPasswordResetEmailSent) {
      const timeSinceLastEmail = now.getTime() - user.lastPasswordResetEmailSent.getTime();
      const cooldownTime = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      if (timeSinceLastEmail < cooldownTime) {
        const remainingSeconds = Math.ceil((cooldownTime - timeSinceLastEmail) / 1000);
        return res.status(429).json({
          success: false,
          message: `Veuillez attendre ${Math.ceil(remainingSeconds / 60)} minutes avant de demander un nouveau lien`,
          remainingSeconds
        } as ApiResponse);
      }
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with reset token
    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
      lastPasswordResetEmailSent: now
    });

    // Send password reset email
    try {
      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
      
      await emailService.sendPasswordResetEmail({
        userEmail: email,
        userName: `${user.firstname} ${user.lastname}`,
        resetToken,
        resetUrl
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Reset the token if email fails
      await User.findByIdAndUpdate(user._id, {
        $unset: {
          passwordResetToken: 1,
          passwordResetExpires: 1,
          lastPasswordResetEmailSent: 1
        }
      });
      
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'envoi de l\'email'
      } as ApiResponse);
    }

    res.status(200).json({
      success: true,
      message: 'Un lien de réinitialisation a été envoyé à votre adresse email'
    } as ApiResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la demande de réinitialisation'
    } as ApiResponse);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe est requis'
      } as ApiResponse);
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      } as ApiResponse);
    }

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token invalide ou expiré'
      } as ApiResponse);
    }

    // Update password and clear reset token
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      $unset: {
        passwordResetToken: 1,
        passwordResetExpires: 1,
        lastPasswordResetEmailSent: 1
      }
    });

    res.status(200).json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    } as ApiResponse);
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réinitialisation du mot de passe'
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
