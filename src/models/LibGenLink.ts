import mongoose, { Document, Schema } from 'mongoose';

export interface ILibGenLink extends Document {
  name: string;
  url: string;
  type: 'search' | 'download';
  isActive: boolean;
  priority: number; // Lower number = higher priority
  lastChecked?: Date;
  isWorking?: boolean;
  responseTime?: number; // in milliseconds
  createdAt: Date;
  updatedAt: Date;
}

const libGenLinkSchema = new Schema<ILibGenLink>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'URL must be a valid HTTP or HTTPS URL'
    }
  },
  type: {
    type: String,
    enum: ['search', 'download'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0,
    min: 0
  },
  lastChecked: {
    type: Date
  },
  isWorking: {
    type: Boolean,
    default: true
  },
  responseTime: {
    type: Number,
    min: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
libGenLinkSchema.index({ type: 1, isActive: 1, priority: 1 });
libGenLinkSchema.index({ url: 1, type: 1 }); // Allow same URL for different types

export const LibGenLink = mongoose.model<ILibGenLink>('LibGenLink', libGenLinkSchema);
