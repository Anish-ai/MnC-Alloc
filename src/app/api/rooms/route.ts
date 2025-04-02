import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Room from '@/models/room';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    // Connect to database
    await connectToDatabase();
    
    // Check authentication (optional, middleware should handle most auth)
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all rooms
    const rooms = await Room.find({}).sort({ building: 1, number: 1 });
    
    return NextResponse.json(rooms);
  } catch (error: any) {
    console.error('Error fetching rooms:', error);
    
    return NextResponse.json(
      { message: error.message || 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Connect to database
    await connectToDatabase();
    
    // Check if user is admin
    const session = await getServerSession(authOptions as any) as any;
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Only administrators can create rooms' },
        { status: 403 }
      );
    }

    // Get room data
    const roomData = await req.json();
    
    // Validate required fields
    if (!roomData.name || !roomData.number || !roomData.building) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new room
    const room = await Room.create(roomData);
    
    return NextResponse.json(
      { message: 'Room created successfully', room },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating room:', error);
    
    // Check for duplicate key error (e.g., building+number unique constraint)
    if (error.code === 11000) {
      return NextResponse.json(
        { message: 'A room with the same building and number already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { message: error.message || 'Failed to create room' },
      { status: 500 }
    );
  }
} 