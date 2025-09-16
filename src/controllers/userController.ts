import type { Request, Response } from 'express';
import { User } from '../models/User.js';
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
