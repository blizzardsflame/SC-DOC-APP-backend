import type { Request, Response } from 'express';
import { Borrowing } from '../models/Borrowing.js';
import { Book } from '../models/Book.js';
import { User } from '../models/User.js';
import type { AuthRequest, ApiResponse } from '../types/index.js';
import emailService from '../services/emailService';

// Helper function to update overdue borrowings
const updateOverdueBorrowings = async () => {
  try {
    const result = await Borrowing.updateMany(
      {
        status: 'active',
        dueDate: { $lt: new Date() },
        returnDate: null
      },
      {
        $set: { status: 'overdue' }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`Updated ${result.modifiedCount} borrowings to overdue status`);
    }
    
    return result.modifiedCount;
  } catch (error) {
    console.error('Error updating overdue borrowings:', error);
    return 0;
  }
};

export const getBorrowings = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { status, userId } = req.query;

    // Update overdue borrowings before fetching
    await updateOverdueBorrowings();
    
    let query: any = {};
    
    // If not staff, only show user's own borrowings
    if (user?.role !== 'staff') {
      query.user = user?._id;
    } else if (userId) {
      query.user = userId;
    }

    if (status) {
      query.status = status;
    }

    const borrowings = await Borrowing.find(query)
      .populate('user', 'firstname lastname email cardNumber role')
      .populate('book', 'title author isbn format category coverImage')
      .populate({
        path: 'book',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Emprunts récupérés avec succès',
      data: { borrowings }
    } as ApiResponse);
  } catch (error) {
    console.error('Get borrowings error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des emprunts'
    } as ApiResponse);
  }
};

export const createBorrowing = async (req: AuthRequest, res: Response) => {
  try {
    const { book: bookId, dueDate } = req.body;
    const userId = req.user?._id;

    // Check if book exists and is available
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Livre non trouvé'
      } as ApiResponse);
    }

    if (book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune copie disponible pour ce livre'
      } as ApiResponse);
    }

    // Check if user already has an active borrowing for this book
    const existingBorrowing = await Borrowing.findOne({
      user: userId,
      book: bookId,
      status: 'active'
    });

    if (existingBorrowing) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà emprunté ce livre'
      } as ApiResponse);
    }

    // Check borrowing limit (max 5 active borrowings per user)
    const activeBorrowingsCount = await Borrowing.countDocuments({
      user: userId,
      status: 'active'
    });

    if (activeBorrowingsCount >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Limite d\'emprunts atteinte (5 livres maximum)'
      } as ApiResponse);
    }

    // Create borrowing
    const borrowing = new Borrowing({
      user: userId,
      book: bookId,
      borrowDate: new Date(),
      dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days default
      status: 'active'
    });

    await borrowing.save();

    // Update book availability
    book.availableCopies -= 1;
    await book.save();

    const populatedBorrowing = await Borrowing.findById(borrowing._id)
      .populate('user', 'firstname lastname email cardNumber role')
      .populate('book', 'title author isbn format category')
      .populate({
        path: 'book',
        populate: {
          path: 'category',
          select: 'name'
        }
      });

    res.status(201).json({
      success: true,
      message: 'Emprunt créé avec succès',
      data: { borrowing: populatedBorrowing }
    } as ApiResponse);
  } catch (error) {
    console.error('Create borrowing error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'emprunt'
    } as ApiResponse);
  }
};

export const createBorrowingForUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, book: bookId, dueDate } = req.body;
    const staffUser = req.user;

    // Check if the requesting user is staff
    if (staffUser?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut créer des emprunts pour d\'autres utilisateurs'
      } as ApiResponse);
    }

    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      } as ApiResponse);
    }

    // Check if book exists and is available
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Livre non trouvé'
      } as ApiResponse);
    }

    if (book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune copie disponible pour ce livre'
      } as ApiResponse);
    }

    // Check if user already has an active borrowing for this book
    const existingBorrowing = await Borrowing.findOne({
      user: userId,
      book: bookId,
      status: 'active'
    });

    if (existingBorrowing) {
      return res.status(400).json({
        success: false,
        message: 'Cet utilisateur a déjà emprunté ce livre'
      } as ApiResponse);
    }

    // Check borrowing limit (max 5 active borrowings per user)
    const activeBorrowingsCount = await Borrowing.countDocuments({
      user: userId,
      status: 'active'
    });

    if (activeBorrowingsCount >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Limite d\'emprunts atteinte pour cet utilisateur (5 livres maximum)'
      } as ApiResponse);
    }

    // Create borrowing
    const borrowing = new Borrowing({
      user: userId,
      book: bookId,
      borrowDate: new Date(),
      dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days default
      status: 'active'
    });

    await borrowing.save();

    // Update book availability
    book.availableCopies -= 1;
    await book.save();

    const populatedBorrowing = await Borrowing.findById(borrowing._id)
      .populate('user', 'firstname lastname email cardNumber role')
      .populate('book', 'title author isbn format category')
      .populate({
        path: 'book',
        populate: {
          path: 'category',
          select: 'name'
        }
      });

    res.status(201).json({
      success: true,
      message: 'Emprunt créé avec succès',
      data: { borrowing: populatedBorrowing }
    } as ApiResponse);
  } catch (error) {
    console.error('Create borrowing for user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'emprunt'
    } as ApiResponse);
  }
};

export const returnBook = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const borrowing = await Borrowing.findById(id).populate('book');
    if (!borrowing) {
      return res.status(404).json({
        success: false,
        message: 'Emprunt non trouvé'
      } as ApiResponse);
    }

    // Check permissions
    if (user?.role !== 'staff' && borrowing.user.toString() !== user?._id?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      } as ApiResponse);
    }

    if (borrowing.status !== 'active' && borrowing.status !== 'overdue') {
      return res.status(400).json({
        success: false,
        message: 'Ce livre a déjà été retourné'
      } as ApiResponse);
    }

    // Update borrowing
    borrowing.status = 'returned';
    borrowing.returnDate = new Date();
    await borrowing.save();

    // Update book availability
    const book = await Book.findById(borrowing.book);
    if (book) {
      book.availableCopies += 1;
      await book.save();
    }

    const populatedBorrowing = await Borrowing.findById(borrowing._id)
      .populate('user', 'firstname lastname email cardNumber role')
      .populate('book', 'title author isbn format category')
      .populate({
        path: 'book',
        populate: {
          path: 'category',
          select: 'name'
        }
      });

    res.json({
      success: true,
      message: 'Livre retourné avec succès',
      data: { borrowing: populatedBorrowing }
    } as ApiResponse);
  } catch (error) {
    console.error('Return book error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du retour du livre'
    } as ApiResponse);
  }
};

export const renewBorrowing = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const borrowing = await Borrowing.findById(id);
    if (!borrowing) {
      return res.status(404).json({
        success: false,
        message: 'Emprunt non trouvé'
      } as ApiResponse);
    }

    // Check permissions
    if (user?.role !== 'staff' && borrowing.user.toString() !== user?._id?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      } as ApiResponse);
    }

    if (borrowing.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de renouveler cet emprunt'
      } as ApiResponse);
    }

    if (borrowing.renewalCount >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Limite de renouvellements atteinte (3 maximum)'
      } as ApiResponse);
    }

    // Renew borrowing (extend due date by 14 days)
    borrowing.dueDate = new Date(borrowing.dueDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    borrowing.renewalCount += 1;
    await borrowing.save();

    const populatedBorrowing = await Borrowing.findById(borrowing._id)
      .populate('user', 'firstname lastname email cardNumber role')
      .populate('book', 'title author isbn format category coverImage')
      .populate({
        path: 'book',
        populate: {
          path: 'category',
          select: 'name'
        }
      });

    res.json({
      success: true,
      message: 'Emprunt renouvelé avec succès',
      data: { borrowing: populatedBorrowing }
    } as ApiResponse);
  } catch (error) {
    console.error('Renew borrowing error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du renouvellement de l\'emprunt'
    } as ApiResponse);
  }
};

export const getOverdueBooks = async (req: Request, res: Response) => {
  try {
    const overdueBooks = await Borrowing.find({
      status: 'active',
      dueDate: { $lt: new Date() }
    })
      .populate('user', 'firstname lastname email cardNumber role')
      .populate('book', 'title author isbn category')
      .populate({
        path: 'book',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .sort({ dueDate: 1 });

    // Update status to overdue
    await Borrowing.updateMany(
      {
        status: 'active',
        dueDate: { $lt: new Date() }
      },
      { status: 'overdue' }
    );

    res.json({
      success: true,
      message: 'Livres en retard récupérés avec succès',
      data: { borrowings: overdueBooks }
    } as ApiResponse);
  } catch (error) {
    console.error('Get overdue books error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des livres en retard'
    } as ApiResponse);
  }
};

export const getBorrowingStats = async (req: Request, res: Response) => {
  try {
    const stats = await Promise.all([
      Borrowing.countDocuments({ status: 'active' }),
      Borrowing.countDocuments({ status: 'overdue' }),
      Borrowing.countDocuments({ status: 'returned' }),
      Borrowing.countDocuments({
        status: 'active',
        dueDate: { $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) } // Due in 3 days
      })
    ]);

    const [active, overdue, returned, dueSoon] = stats;

    res.json({
      success: true,
      message: 'Statistiques des emprunts récupérées avec succès',
      data: {
        stats: {
          active,
          overdue,
          returned,
          dueSoon,
          total: active + overdue + returned
        }
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Get borrowing stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    } as ApiResponse);
  }
};

export const sendOverdueNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { id } = req.params;
    let { type } = req.body;
    
    // Check if user is staff
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut envoyer des notifications'
      } as ApiResponse);
    }

    // Find the borrowing
    const borrowing = await Borrowing.findById(id)
      .populate('user', 'firstname lastname email cardNumber role')
      .populate('book', 'title author category')
      .populate({
        path: 'book',
        populate: {
          path: 'category',
          select: 'name'
        }
      });

    if (!borrowing) {
      return res.status(404).json({
        success: false,
        message: 'Emprunt non trouvé'
      } as ApiResponse);
    }

    // Check if borrowing is overdue
    if (borrowing.status !== 'overdue') {
      return res.status(400).json({
        success: false,
        message: 'Seuls les emprunts en retard peuvent recevoir des notifications'
      } as ApiResponse);
    }

    // Calculate overdue days
    const currentDate = new Date();
    const dueDate = new Date(borrowing.dueDate);
    const overdueDays = Math.ceil((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    // Smart notification logic: determine notification type if not specified
    if (!type) {
      const reminderCount = borrowing.notifications.filter(n => n.type === 'overdue_reminder').length;
      
      if (overdueDays >= 21 || reminderCount >= 3) {
        type = 'final_notice';
      } else {
        type = 'overdue_reminder';
      }
    }

    // Check if we should send this notification based on timing rules
    const lastNotification = borrowing.notifications[borrowing.notifications.length - 1];
    if (lastNotification) {
      const daysSinceLastNotification = Math.ceil((currentDate.getTime() - lastNotification.sentAt.getTime()) / (1000 * 60 * 60 * 24));
      
      // Prevent spam: don't send notifications too frequently
      if (daysSinceLastNotification < 3) {
        return res.status(400).json({
          success: false,
          message: `Dernière notification envoyée il y a ${daysSinceLastNotification} jour(s). Attendez au moins 3 jours entre les notifications.`
        } as ApiResponse);
      }
    }

    // Add system notification to the borrowing
    const systemNotification = {
      sentAt: new Date(),
      type: type as 'overdue_reminder' | 'final_notice',
      method: 'system' as const
    };
    
    borrowing.notifications.push(systemNotification);
    borrowing.notificationCount += 1;

    // Prepare email data
    const emailData = {
      userEmail: borrowing.user.email,
      userName: `${borrowing.user.firstname} ${borrowing.user.lastname}`,
      bookTitle: borrowing.book.title,
      bookAuthor: borrowing.book.author,
      dueDate: dueDate,
      overdueDays: overdueDays,
      notificationType: type as 'overdue_reminder' | 'final_notice',
      notificationCount: borrowing.notificationCount
    };

    // Send email notification
    const emailSent = await emailService.sendOverdueNotification(emailData);
    
    // Add email notification record if email was sent successfully
    if (emailSent) {
      borrowing.notifications.push({
        sentAt: new Date(),
        type: type as 'overdue_reminder' | 'final_notice',
        method: 'email' as const
      });
    }

    // Save borrowing with notifications
    await borrowing.save();

    // Log notification details
    console.log(`Notification sent to ${borrowing.user.email} for overdue book: ${borrowing.book.title}`);
    console.log(`Type: ${type}, Overdue days: ${overdueDays}, Email sent: ${emailSent}`);

    // Determine response message based on notification type and success
    let message = '';
    if (type === 'final_notice') {
      message = emailSent 
        ? `Avis final envoyé à ${borrowing.user.firstname} ${borrowing.user.lastname} (système + email)`
        : `Avis final envoyé à ${borrowing.user.firstname} ${borrowing.user.lastname} (système uniquement - échec email)`;
    } else {
      message = emailSent 
        ? `Rappel ${borrowing.notificationCount} envoyé à ${borrowing.user.firstname} ${borrowing.user.lastname} (système + email)`
        : `Rappel ${borrowing.notificationCount} envoyé à ${borrowing.user.firstname} ${borrowing.user.lastname} (système uniquement - échec email)`;
    }

    res.json({
      success: true,
      message,
      data: { 
        borrowing,
        notificationCount: borrowing.notificationCount,
        overdueDays,
        notificationType: type,
        emailSent,
        systemNotificationSent: true
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de la notification'
    } as ApiResponse);
  }
};

export const updateBorrowing = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    const { id } = req.params;
    const { dueDate, renewalCount } = req.body;
    
    // Check if user is staff
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Seul le personnel peut modifier les emprunts'
      } as ApiResponse);
    }

    // Find the borrowing
    const borrowing = await Borrowing.findById(id);
    if (!borrowing) {
      return res.status(404).json({
        success: false,
        message: 'Emprunt non trouvé'
      } as ApiResponse);
    }

    // Update fields if provided
    if (dueDate) {
      borrowing.dueDate = new Date(dueDate);
    }
    
    if (renewalCount !== undefined) {
      borrowing.renewalCount = Math.max(0, Math.min(3, renewalCount));
    }

    await borrowing.save();

    const updatedBorrowing = await Borrowing.findById(id)
      .populate('user', 'firstname lastname email cardNumber role')
      .populate('book', 'title author isbn format category')
      .populate({
        path: 'book',
        populate: {
          path: 'category',
          select: 'name'
        }
      });

    res.json({
      success: true,
      message: 'Emprunt mis à jour avec succès',
      data: { borrowing: updatedBorrowing }
    } as ApiResponse);
  } catch (error) {
    console.error('Update borrowing error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'emprunt'
    } as ApiResponse);
  }
};
