import mongoose, { Schema, Document } from 'mongoose';

export interface RoomDocument extends Document {
  name: string;
  number: string;
  building: string;
  capacity: number;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a room name'],
      maxlength: [60, 'Name cannot be more than 60 characters'],
    },
    number: {
      type: String,
      required: [true, 'Please provide a room number'],
      maxlength: [20, 'Room number cannot be more than 20 characters'],
    },
    building: {
      type: String,
      required: [true, 'Please provide a building name'],
    },
    capacity: {
      type: Number,
      required: [true, 'Please provide room capacity'],
      min: [1, 'Capacity must be at least 1'],
    },
    features: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Create a unique compound index for building+number to ensure no duplicates
RoomSchema.index({ building: 1, number: 1 }, { unique: true });

export default mongoose.models.Room || mongoose.model<RoomDocument>('Room', RoomSchema); 