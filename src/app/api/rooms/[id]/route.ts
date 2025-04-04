import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Room from '@/models/room';
import Booking from '@/models/booking';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    // Connect to database
    await connectToDatabase();
    
    // Check authentication
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get ID from URL
    const segments = request.url.split('/');
    const roomId = segments[segments.length - 1].split('?')[0];
    
    let room;
    
    // Check if ID is a valid MongoDB ObjectId
    if (ObjectId.isValid(roomId)) {
      // If it's a valid ObjectId, find by _id
      room = await Room.findById(roomId);
    } else {
      // If it's not a valid ObjectId, try to find by room number
      // Assuming the 'number' field in Room model contains the room number
      room = await Room.findOne({ number: roomId });
    }
    
    if (!room) {
      return NextResponse.json(
        { message: 'Room not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(room);
  } catch (error: any) {
    console.error('Error fetching room:', error);
    
    return NextResponse.json(
      { message: error.message || 'Failed to fetch room' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Connect to database
    await connectToDatabase();
    
    // Check if user is admin
    const session = await getServerSession(authOptions as any) as any;
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Only administrators can update rooms' },
        { status: 403 }
      );
    }

    // Get ID from URL
    const segments = request.url.split('/');
    const roomIdParam = segments[segments.length - 1].split('?')[0];
    
    let roomId = roomIdParam;
    let room;
    
    // If not a valid ObjectId, try to find room by number
    if (!ObjectId.isValid(roomIdParam)) {
      room = await Room.findOne({ number: roomIdParam });
      if (!room) {
        return NextResponse.json(
          { message: 'Room not found' },
          { status: 404 }
        );
      }
      roomId = room._id;
    }
    
    const updateData = await request.json();
    
    // Find and update room (if we haven't already found it)
    if (!room) {
      room = await Room.findByIdAndUpdate(
        roomId,
        updateData,
        { new: true, runValidators: true }
      );
    } else {
      // If we already found the room (by number), update it
      Object.assign(room, updateData);
      await room.save();
    }
    
    if (!room) {
      return NextResponse.json(
        { message: 'Room not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { message: 'Room updated successfully', room }
    );
  } catch (error: any) {
    console.error('Error updating room:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { message: 'A room with the same building and number already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { message: error.message || 'Failed to update room' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Connect to database
    await connectToDatabase();
    
    // Check if user is admin
    const session = await getServerSession(authOptions as any) as any;
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Only administrators can delete rooms' },
        { status: 403 }
      );
    }

    // Get ID from URL
    const segments = request.url.split('/');
    const roomIdParam = segments[segments.length - 1].split('?')[0];
    
    let roomId = roomIdParam;
    
    // If not a valid ObjectId, try to find room by number
    if (!ObjectId.isValid(roomIdParam)) {
      const room = await Room.findOne({ number: roomIdParam });
      if (!room) {
        return NextResponse.json(
          { message: 'Room not found' },
          { status: 404 }
        );
      }
      roomId = room._id;
    }
    
    // Find the room to ensure it exists before deleting related bookings
    const room = await Room.findById(roomId);
    if (!room) {
      return NextResponse.json(
        { message: 'Room not found' },
        { status: 404 }
      );
    }
    
    // Delete all bookings associated with this room - using the Booking model directly
    const bookingDeleteResult = await Booking.deleteMany({ room: roomId });
    const deletedBookingsCount = bookingDeleteResult.deletedCount || 0;
    
    // Delete room
    const result = await Room.findByIdAndDelete(roomId);
    
    if (!result) {
      return NextResponse.json(
        { message: 'Room not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: `Room deleted successfully with ${deletedBookingsCount} associated bookings`
    });
  } catch (error: any) {
    console.error('Error deleting room:', error);
    
    return NextResponse.json(
      { message: error.message || 'Failed to delete room' },
      { status: 500 }
    );
  }
} 