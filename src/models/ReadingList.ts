import { Schema, model, Document, Types } from 'mongoose';

export interface IReadingList extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  book: Types.ObjectId;
  status: 'to-read' | 'reading' | 'completed';
  progress?: number;
  addedDate: Date;
  lastReadDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const readingListSchema = new Schema<IReadingList>({
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
  status: {
    type: String,
    enum: ['to-read', 'reading', 'completed'],
    default: 'to-read'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  addedDate: {
    type: Date,
    default: Date.now
  },
  lastReadDate: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Ensure a user can only have one entry per book in their reading list
readingListSchema.index({ user: 1, book: 1 }, { unique: true });

export const ReadingList = model<IReadingList>('ReadingList', readingListSchema);
