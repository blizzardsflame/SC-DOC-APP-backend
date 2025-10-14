import mongoose, { Document, Schema } from 'mongoose';

export interface IFavorite extends Document {
  user: mongoose.Types.ObjectId;
  book: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FavoriteSchema: Schema = new Schema(
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
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one favorite per user per book
FavoriteSchema.index({ user: 1, book: 1 }, { unique: true });

// Index for efficient queries
FavoriteSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<IFavorite>('Favorite', FavoriteSchema);
