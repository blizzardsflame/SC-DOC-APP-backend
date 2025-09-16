import cron from 'node-cron';
import { Borrowing } from '../models/Borrowing.js';
import emailService from './emailService.js';

interface OverdueBorrowing {
  _id: string;
  user: {
    _id: string;
    firstname: string;
    lastname: string;
    email: string;
  };
  book: {
    _id: string;
    title: string;
    author: string;
  };
  dueDate: Date;
  notifications: Array<{
    sentAt: Date;
    type: 'overdue_reminder' | 'final_notice';
    method: 'system' | 'email';
  }>;
  notificationCount: number;
}

class NotificationScheduler {
  private isRunning = false;

  constructor() {
    // Schedule daily check at 9:00 AM
    cron.schedule('0 9 * * *', () => {
      this.processOverdueNotifications();
    });

    console.log('📅 Notification scheduler initialized - Daily checks at 9:00 AM');
  }

  async processOverdueNotifications() {
    if (this.isRunning) {
      console.log('⏳ Notification processing already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starting automatic overdue notification processing...');

    try {
      const overdueBorrowings = await this.getOverdueBorrowings();
      console.log(`📊 Found ${overdueBorrowings.length} overdue borrowings to process`);

      for (const borrowing of overdueBorrowings) {
        await this.processIndividualBorrowing(borrowing);
      }

      console.log('✅ Automatic notification processing completed');
    } catch (error) {
      console.error('❌ Error in automatic notification processing:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async getOverdueBorrowings(): Promise<OverdueBorrowing[]> {
    const currentDate = new Date();
    
    const borrowings = await Borrowing.find({
      status: 'overdue',
      dueDate: { $lt: currentDate }
    })
    .populate('user', 'firstname lastname email')
    .populate('book', 'title author')
    .lean();

    return borrowings as OverdueBorrowing[];
  }

  private async processIndividualBorrowing(borrowing: OverdueBorrowing) {
    const currentDate = new Date();
    const dueDate = new Date(borrowing.dueDate);
    const overdueDays = Math.ceil((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    // Determine if notification should be sent based on business rules
    const shouldSendNotification = this.shouldSendNotification(borrowing, overdueDays);
    
    if (!shouldSendNotification.send) {
      console.log(`⏭️  Skipping ${borrowing.user.firstname} ${borrowing.user.lastname} - ${shouldSendNotification.reason}`);
      return;
    }

    const notificationType = shouldSendNotification.type;
    
    try {
      // Send both system and email notifications
      await this.sendDualNotification(borrowing, notificationType, overdueDays);
      
      console.log(`✉️  Sent ${notificationType} to ${borrowing.user.firstname} ${borrowing.user.lastname} (${overdueDays} days overdue)`);
    } catch (error) {
      console.error(`❌ Failed to send notification to ${borrowing.user.email}:`, error);
    }
  }

  private shouldSendNotification(borrowing: OverdueBorrowing, overdueDays: number): {
    send: boolean;
    type?: 'overdue_reminder' | 'final_notice';
    reason?: string;
  } {
    const reminderNotifications = borrowing.notifications.filter(n => n.type === 'overdue_reminder');
    const finalNotices = borrowing.notifications.filter(n => n.type === 'final_notice');
    const lastNotification = borrowing.notifications[borrowing.notifications.length - 1];

    // Check if we've already sent a final notice
    if (finalNotices.length > 0) {
      return { send: false, reason: 'Final notice already sent' };
    }

    // Check minimum time between notifications (3 days)
    if (lastNotification) {
      const daysSinceLastNotification = Math.ceil((new Date().getTime() - lastNotification.sentAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastNotification < 3) {
        return { send: false, reason: `Last notification sent ${daysSinceLastNotification} days ago` };
      }
    }

    // Business logic for when to send notifications:
    
    // Final notice: 21+ days overdue OR 3+ reminders sent
    if (overdueDays >= 21 || reminderNotifications.length >= 3) {
      return { send: true, type: 'final_notice' };
    }

    // First reminder: 1+ days overdue, no previous notifications
    if (overdueDays >= 1 && borrowing.notifications.length === 0) {
      return { send: true, type: 'overdue_reminder' };
    }

    // Second reminder: 7+ days overdue, 1 previous reminder
    if (overdueDays >= 7 && reminderNotifications.length === 1) {
      return { send: true, type: 'overdue_reminder' };
    }

    // Third reminder: 14+ days overdue, 2 previous reminders
    if (overdueDays >= 14 && reminderNotifications.length === 2) {
      return { send: true, type: 'overdue_reminder' };
    }

    return { send: false, reason: 'No notification rule matched' };
  }

  private async sendDualNotification(
    borrowing: OverdueBorrowing, 
    notificationType: 'overdue_reminder' | 'final_notice',
    overdueDays: number
  ) {
    // Prepare email data
    const emailData = {
      userEmail: borrowing.user.email,
      userName: `${borrowing.user.firstname} ${borrowing.user.lastname}`,
      bookTitle: borrowing.book.title,
      bookAuthor: borrowing.book.author,
      dueDate: new Date(borrowing.dueDate),
      overdueDays: overdueDays,
      notificationType: notificationType,
      notificationCount: borrowing.notificationCount + 1
    };

    // Send email notification
    const emailSent = await emailService.sendOverdueNotification(emailData);

    // Update borrowing record with notifications
    const borrowingDoc = await Borrowing.findById(borrowing._id);
    if (borrowingDoc) {
      // Add system notification
      borrowingDoc.notifications.push({
        sentAt: new Date(),
        type: notificationType,
        method: 'system'
      });

      // Add email notification if successful
      if (emailSent) {
        borrowingDoc.notifications.push({
          sentAt: new Date(),
          type: notificationType,
          method: 'email'
        });
      }

      borrowingDoc.notificationCount += 1;
      await borrowingDoc.save();
    }

    return { emailSent, systemSent: true };
  }

  // Manual trigger for testing
  async triggerManualCheck() {
    console.log('🔧 Manual notification check triggered');
    await this.processOverdueNotifications();
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: '9:00 AM daily',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
}

export default new NotificationScheduler();
