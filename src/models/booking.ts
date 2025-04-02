import mongoose, { Schema, Document } from 'mongoose';
import { UserDocument } from './user';
import { RoomDocument } from './room';

export interface BookingDocument extends Document {
  room: RoomDocument['_id'];
  user: UserDocument['_id'];
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  date: Date;
  repeatType: 'none' | 'daily' | 'weekly';
  repeatEndDate?: Date;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room is required'],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    title: {
      type: String,
      required: [true, 'Please provide a booking title'],
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
      validate: {
        validator: function(this: BookingDocument, endTime: Date) {
          return endTime > this.startTime;
        },
        message: 'End time must be after start time',
      },
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    repeatType: {
      type: String,
      enum: ['none', 'daily', 'weekly'],
      default: 'none',
    },
    repeatEndDate: {
      type: Date,
      validate: {
        validator: function(this: BookingDocument, endDate: Date) {
          return this.repeatType !== 'none' ? endDate > this.date : true;
        },
        message: 'Repeat end date must be after the booking date',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Create index for faster queries
BookingSchema.index({ room: 1, date: 1, status: 1 });
BookingSchema.index({ user: 1, status: 1 });

// Validate booking conflicts
BookingSchema.pre('save', async function(next) {
  // Only check for conflicts if booking is being approved or is already approved
  if (this.status !== 'approved' && this.isModified('status') && this.get('status') !== 'approved') {
    return next();
  }

  // Check for overlapping bookings
  const Booking = mongoose.model('Booking');
  const overlappingBookings = await Booking.find({
    room: this.room,
    status: 'approved',
    _id: { $ne: this._id }, // Exclude current booking
    $or: [
      // Case 1: New booking starts during an existing booking
      {
        date: this.date,
        startTime: { $lte: this.endTime },
        endTime: { $gte: this.startTime }
      }
    ]
  });

  if (overlappingBookings.length > 0) {
    next(new Error('There is a booking conflict with an existing approved booking'));
  } else {
    next();
  }
});

export default mongoose.models.Booking || mongoose.model<BookingDocument>('Booking', BookingSchema); 