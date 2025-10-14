import mongoose, { Document, Schema } from 'mongoose';

export interface IBookmark extends Document {
  user: mongoose.Types.ObjectId;
  book: mongoose.Types.ObjectId;
  page: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookmarkSchema: Schema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
      index: true,
    },
    page: {
      type: Number,
      required: true,
      min: 1,
    },
    note: {
      type: String,
      maxlength: 500,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one bookmark per user per book per page
BookmarkSchema.index({ user: 1, book: 1, page: 1 }, { unique: true });

// Index for efficient queries
BookmarkSchema.index({ user: 1, createdAt: -1 });
BookmarkSchema.index({ book: 1 });

export default mongoose.model<IBookmark>('Bookmark', BookmarkSchema);
