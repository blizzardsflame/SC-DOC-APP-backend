import { Schema, model, Document, Types } from 'mongoose';

export interface IReadingHistory extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  book: Types.ObjectId;
  readDate: Date;
  source: 'borrowing' | 'reading_list' | 'manual';
  borrowingId?: Types.ObjectId;
  readingListId?: Types.ObjectId;
  progress?: number;
  lastPage?: number;
  createdAt: Date;
  updatedAt: Date;
}

const readingHistorySchema = new Schema<IReadingHistory>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  book: {
    type: Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  readDate: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    enum: ['borrowing', 'reading_list', 'manual'],
    required: true
  },
  borrowingId: {
    type: Schema.Types.ObjectId,
    ref: 'Borrowing',
    required: false
  },
  readingListId: {
    type: Schema.Types.ObjectId,
    ref: 'ReadingList',
    required: false
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  lastPage: {
    type: Number,
    min: 1,
    default: 1
  }
}, {
  timestamps: true
});

// Ensure a user can only have one reading history entry per book per source
readingHistorySchema.index({ user: 1, book: 1, source: 1 }, { unique: true });

// Index for efficient queries
readingHistorySchema.index({ user: 1, readDate: -1 });

export const ReadingHistory = model<IReadingHistory>('ReadingHistory', readingHistorySchema);
