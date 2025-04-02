import mongoose, { Schema, Document } from 'mongoose';
import { UserDocument } from './user';
import { BookingDocument } from './booking';

export interface NotificationDocument extends Document {
  recipient: UserDocument['_id'];
  sender?: UserDocument['_id'];
  type: 'booking_request' | 'booking_approved' | 'booking_rejected' | 'room_update' | 'system';
  title: string;
  message: string;
  relatedBooking?: BookingDocument['_id'];
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['booking_request', 'booking_approved', 'booking_rejected', 'room_update', 'system'],
      required: [true, 'Notification type is required'],
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      maxlength: [500, 'Message cannot be more than 500 characters'],
    },
    relatedBooking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create index for faster queries
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model<NotificationDocument>('Notification', NotificationSchema); 