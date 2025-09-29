import type { Request, Response } from 'express';
import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { AuthRequest, ApiResponse } from '../types/index.js';
import emailService from '../services/emailService';

export const activateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { userId } = req.params;
    
    // Check if user is staff
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut activer les utilisateurs'
      } as ApiResponse);
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      } as ApiResponse);
    }

    // Update user status
    targetUser.isActive = true;
    await targetUser.save();

    res.json({
      success: true,
      message: 'Utilisateur activé avec succès',
      data: { user: targetUser.toJSON() }
    } as ApiResponse);
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'activation de l\'utilisateur'
    } as ApiResponse);
  }
};

export const deactivateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { userId } = req.params;
    
    // Check if user is staff
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut désactiver les utilisateurs'
      } as ApiResponse);
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      } as ApiResponse);
    }

    // Prevent deactivating staff users
    if (targetUser.role === 'staff') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de désactiver un membre du personnel'
      } as ApiResponse);
    }

    // Update user status
    targetUser.isActive = false;
    await targetUser.save();

    res.json({
      success: true,
      message: 'Utilisateur désactivé avec succès',
      data: { user: targetUser.toJSON() }
    } as ApiResponse);
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la désactivation de l\'utilisateur'
    } as ApiResponse);
  }
};

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

// Suspend user (staff only)
export const suspendUser = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { userId } = req.params;
    
    // Check if user is staff
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut suspendre les utilisateurs'
      } as ApiResponse);
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      } as ApiResponse);
    }

    // Prevent suspending staff users
    if (targetUser.role === 'staff') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de suspendre un membre du personnel'
      } as ApiResponse);
    }

    // Update user status
    targetUser.isSuspended = true;
    // Suspended users remain active (they're just restricted)
    // Only pending users have isActive: false
    if (!targetUser.isActive && !targetUser.isBanned) {
      targetUser.isActive = true; // Activate if they were pending
    }
    await targetUser.save();

    res.json({
      success: true,
      message: 'Utilisateur suspendu avec succès',
      data: { user: targetUser.toJSON() }
    } as ApiResponse);
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suspension de l\'utilisateur'
    } as ApiResponse);
  }
};

// Ban user (staff only)
export const banUser = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { userId } = req.params;
    
    // Check if user is staff
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut bannir les utilisateurs'
      } as ApiResponse);
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      } as ApiResponse);
    }

    // Prevent banning staff users
    if (targetUser.role === 'staff') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de bannir un membre du personnel'
      } as ApiResponse);
    }

    // Update user status
    targetUser.isBanned = true;
    targetUser.isSuspended = false; // Clear suspension when banning
    await targetUser.save();

    res.json({
      success: true,
      message: 'Utilisateur banni avec succès',
      data: { user: targetUser.toJSON() }
    } as ApiResponse);
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du bannissement de l\'utilisateur'
    } as ApiResponse);
  }
};

// Lift suspension (staff only)
export const liftSuspension = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { userId } = req.params;
    
    // Check if user is staff
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut lever les suspensions'
      } as ApiResponse);
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      } as ApiResponse);
    }

    // Update user status
    targetUser.isSuspended = false;
    await targetUser.save();

    res.json({
      success: true,
      message: 'Suspension levée avec succès',
      data: { user: targetUser.toJSON() }
    } as ApiResponse);
  } catch (error) {
    console.error('Lift suspension error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la levée de suspension'
    } as ApiResponse);
  }
};

// Unban user (staff only)
export const unbanUser = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { userId } = req.params;
    
    // Check if user is staff
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut débannir les utilisateurs'
      } as ApiResponse);
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      } as ApiResponse);
    }

    // Update user status
    targetUser.isBanned = false;
    await targetUser.save();

    res.json({
      success: true,
      message: 'Utilisateur débanni avec succès',
      data: { user: targetUser.toJSON() }
    } as ApiResponse);
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du débannissement de l\'utilisateur'
    } as ApiResponse);
  }
};

// Promote teacher to staff (staff only)
export const promoteToStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { userId } = req.params;
    
    // Check if user is staff
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut promouvoir des utilisateurs'
      } as ApiResponse);
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      } as ApiResponse);
    }

    // Only teachers can be promoted to staff
    if (targetUser.role !== 'teacher') {
      return res.status(400).json({
        success: false,
        message: 'Seuls les enseignants peuvent être promus au personnel'
      } as ApiResponse);
    }

    // Update user role
    targetUser.role = 'staff';
    targetUser.isActive = true; // Staff users are always active
    targetUser.isSuspended = false; // Clear any suspension
    targetUser.isBanned = false; // Clear any ban
    await targetUser.save();

    res.json({
      success: true,
      message: 'Utilisateur promu au personnel avec succès',
      data: { user: targetUser.toJSON() }
    } as ApiResponse);
  } catch (error) {
    console.error('Promote to staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la promotion de l\'utilisateur'
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

    // Check cooldown (5 minutes = 300000ms)
    if (user.lastVerificationEmailSent) {
      const timeSinceLastEmail = Date.now() - user.lastVerificationEmailSent.getTime();
      const cooldownPeriod = 5 * 60 * 1000; // 5 minutes
      
      if (timeSinceLastEmail < cooldownPeriod) {
        const remainingTime = Math.ceil((cooldownPeriod - timeSinceLastEmail) / 1000);
        return res.status(429).json({
          success: false,
          message: 'Veuillez attendre avant de demander un nouvel email de vérification',
          data: { remainingSeconds: remainingTime }
        } as ApiResponse);
      }
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with verification token and timestamp
    await User.findByIdAndUpdate(user._id, {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      lastVerificationEmailSent: new Date()
    });

    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email`;
    const emailSent = await emailService.sendVerificationEmail({
      userEmail: user.email,
      userName: `${user.firstname} ${user.lastname}`,
      verificationToken,
      verificationUrl
    });

    if (!emailSent) {
      // Even if email fails, don't block the user. Log the error for monitoring.
      console.error(`Failed to send verification email to ${user.email}`);
    }

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
