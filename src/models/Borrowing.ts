import mongoose, { Schema } from 'mongoose';
import type { IBorrowing } from '../types/index.js';

const borrowingSchema = new Schema<IBorrowing>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisateur est requis']
  },
  book: {
    type: Schema.Types.ObjectId,
    ref: 'Book',
    required: [true, 'Le livre est requis']
  },
  borrowDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  dueDate: {
    type: Date,
    required: [true, 'La date d\'échéance est requise']
  },
  returnDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'returned', 'overdue'],
      message: 'Le statut doit être actif, retourné ou en retard'
    },
    default: 'active'
  },
  renewalCount: {
    type: Number,
    default: 0,
    min: [0, 'Le nombre de renouvellements ne peut pas être négatif'],
    max: [3, 'Maximum 3 renouvellements autorisés']
  },
  notifications: [{
    sentAt: {
      type: Date,
      required: true
    },
    type: {
      type: String,
      enum: ['overdue_reminder', 'final_notice'],
      required: true
    },
    method: {
      type: String,
      enum: ['email', 'system'],
      default: 'system'
    }
  }],
  notificationCount: {
    type: Number,
    default: 0,
    min: [0, 'Le nombre de notifications ne peut pas être négatif']
  }
}, {
  timestamps: true
});

// Indexes for better query performance
borrowingSchema.index({ user: 1, status: 1 });
borrowingSchema.index({ book: 1, status: 1 });
borrowingSchema.index({ dueDate: 1, status: 1 });

// Compound unique index to prevent duplicate active borrowings
borrowingSchema.index(
  { user: 1, book: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: 'active' }
  }
);

// Set due date to 14 days from borrow date if not specified
borrowingSchema.pre('save', function(next) {
  if (!this.dueDate && this.borrowDate) {
    this.dueDate = new Date(this.borrowDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  }
  next();
});

// Update status based on due date
borrowingSchema.pre('save', function(next) {
  if (this.status === 'active' && this.dueDate < new Date() && !this.returnDate) {
    this.status = 'overdue';
  }
  next();
});

export const Borrowing = mongoose.model<IBorrowing>('Borrowing', borrowingSchema);
