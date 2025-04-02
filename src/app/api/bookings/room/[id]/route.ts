import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
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

    // Get booking ID from URL
    const segments = request.url.split('/');
    const roomIdParam = segments[segments.length - 1].split('?')[0];
    
    // Get the actual room ID (either directly if it's a valid ObjectId, or by finding the room first)
    let roomId = roomIdParam;
    
    // If not a valid ObjectId, try to find room by number
    if (!ObjectId.isValid(roomIdParam)) {
      const room = await Booking.db.models.Room.findOne({ number: roomIdParam });
      if (!room) {
        return NextResponse.json(
          { message: 'Room not found' },
          { status: 404 }
        );
      }
      roomId = room._id.toString();
    }
    
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json(
        { message: 'Date parameter is required' },
        { status: 400 }
      );
    }
    
    // Parse date string to create date range for the entire day
    const dateObj = new Date(date);
    
    // Use the formatted date for the query
    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Query bookings for the room on the specified date
    const bookings = await Booking.find({
      room: roomId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ startTime: 1 });
    
    return NextResponse.json(bookings);
  } catch (error: any) {
    console.error('Error fetching room bookings:', error);
    
    return NextResponse.json(
      { message: error.message || 'Failed to fetch room bookings' },
      { status: 500 }
    );
  }
} 