import type { Request, Response } from 'express';
import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { AuthRequest, ApiResponse } from '../types/index.js';

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    
    // Check if user is staff
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut voir tous les utilisateurs'
      } as ApiResponse);
    }

    const { role, isActive, search } = req.query;
    
    let query: any = {};
    
    // Filter by role if specified
    if (role) {
      query.role = role;
    }
    
    // Filter by active status if specified
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Search by name or email if specified
    if (search) {
      query.$or = [
        { firstname: { $regex: search, $options: 'i' } },
        { lastname: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Utilisateurs récupérés avec succès',
      data: { users }
    } as ApiResponse);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs'
    } as ApiResponse);
  }
};

export const getUserStats = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    
    // Check if user is staff
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut voir les statistiques'
      } as ApiResponse);
    }

    const stats = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      User.countDocuments({ role: 'staff' })
    ]);

    const [activeUsers, inactiveUsers, students, teachers, staff] = stats;

    res.json({
      success: true,
      message: 'Statistiques des utilisateurs récupérées avec succès',
      data: {
        stats: {
          total: activeUsers + inactiveUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          students,
          teachers,
          staff
        }
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    } as ApiResponse);
  }
};

// Get user by ID
export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { id } = req.params;
    
    // Check if user is staff or requesting own profile
    if (user?.role !== 'staff' && user?._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Vous ne pouvez voir que votre propre profil'
      } as ApiResponse);
    }

    const targetUser = await User.findById(id).select('-password');
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      } as ApiResponse);
    }

    res.json({
      success: true,
      message: 'Utilisateur récupéré avec succès',
      data: { user: targetUser }
    } as ApiResponse);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'utilisateur'
    } as ApiResponse);
  }
};

// Create user (staff only)
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    
    // Check if user is staff
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut créer des utilisateurs'
      } as ApiResponse);
    }

    const { firstname, lastname, email, password, role } = req.body;

    // Validate required fields
    if (!firstname || !lastname || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
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

    // Validate role
    const validRoles = ['student', 'teacher', 'staff'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rôle invalide'
      } as ApiResponse);
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = new User({
      firstname,
      lastname,
      email,
      password: hashedPassword,
      role,
      isActive: true,
      isEmailVerified: false
    });

    await newUser.save();

    // Remove password from response
    const { password: _, ...userResponse } = newUser.toObject();

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: { user: userResponse }
    } as ApiResponse);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'utilisateur'
    } as ApiResponse);
  }
};

// Update user (staff only)
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { id } = req.params;
    
    // Check if user is staff
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut modifier les utilisateurs'
      } as ApiResponse);
    }

    const { firstname, lastname, email, role, isActive } = req.body;

    // Find target user
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      } as ApiResponse);
    }

    // Check if email is being changed and if it already exists
    if (email && email !== targetUser.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Cette adresse email est déjà utilisée'
        } as ApiResponse);
      }
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['student', 'teacher', 'staff'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Rôle invalide'
        } as ApiResponse);
      }
    }

    // Update user fields
    const updateData: any = {};
    if (firstname) updateData.firstname = firstname;
    if (lastname) updateData.lastname = lastname;
    if (email && email !== targetUser.email) {
      updateData.email = email;
      updateData.isEmailVerified = false; // Reset verification if email changed
    }
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      data: { user: updatedUser }
    } as ApiResponse);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'utilisateur'
    } as ApiResponse);
  }
};

// Delete user (staff only)
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { id } = req.params;
    
    // Check if user is staff
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut supprimer les utilisateurs'
      } as ApiResponse);
    }

    // Prevent self-deletion
    if (user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      } as ApiResponse);
    }

    // Find and delete user
    const deletedUser = await User.findByIdAndDelete(id);
    
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      } as ApiResponse);
    }

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    } as ApiResponse);
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'utilisateur'
    } as ApiResponse);
  }
};

// Update user profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { firstname, lastname, email } = req.body;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Non autorisé'
      } as ApiResponse);
    }

    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Cette adresse email est déjà utilisée'
        } as ApiResponse);
      }
    }

    // Update user fields
    const updateData: any = {};
    if (firstname) updateData.firstname = firstname;
    if (lastname) updateData.lastname = lastname;
    if (email && email !== user.email) {
      updateData.email = email;
      updateData.isEmailVerified = false; // Reset verification status if email changed
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: { user: updatedUser }
    } as ApiResponse);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil'
    } as ApiResponse);
  }
};

// Change password
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { currentPassword, newPassword } = req.body;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Non autorisé'
      } as ApiResponse);
    }

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel et nouveau mot de passe requis'
      } as ApiResponse);
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères'
      } as ApiResponse);
    }

    // Get user with password
    const userWithPassword = await User.findById(user._id).select('+password');
    if (!userWithPassword) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      } as ApiResponse);
    }

    // Verify current password
    const isCurrentPasswordValid = await userWithPassword.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      } as ApiResponse);
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await User.findByIdAndUpdate(user._id, { password: hashedNewPassword });

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

// Send email verification
export const sendEmailVerification = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Non autorisé'
      } as ApiResponse);
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email déjà vérifié'
      } as ApiResponse);
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with verification token
    await User.findByIdAndUpdate(user._id, {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    });

    // TODO: Send verification email using emailService
    console.log(`Verification token for ${user.email}: ${verificationToken}`);

    res.json({
      success: true,
      message: 'Email de vérification envoyé'
    } as ApiResponse);
  } catch (error) {
    console.error('Send email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de l\'email de vérification'
    } as ApiResponse);
  }
};

// Verify email
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token de vérification requis'
      } as ApiResponse);
    }

    // Find user with valid token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token de vérification invalide ou expiré'
      } as ApiResponse);
    }

    // Update user as verified
    await User.findByIdAndUpdate(user._id, {
      isEmailVerified: true,
      $unset: {
        emailVerificationToken: 1,
        emailVerificationExpires: 1
      }
    });

    res.json({
      success: true,
      message: 'Email vérifié avec succès'
    } as ApiResponse);
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification de l\'email'
    } as ApiResponse);
  }
};
