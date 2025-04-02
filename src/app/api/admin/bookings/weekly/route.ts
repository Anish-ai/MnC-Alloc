import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any) as any;
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    if (!roomId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: roomId, start, and end dates are required' },
        { status: 400 }
      );
    }

    // Check if roomId is a valid MongoDB ObjectId
    if (!ObjectId.isValid(roomId)) {
      return NextResponse.json(
        { error: 'Invalid room ID format' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase() as { db: any };
    
    // Parse dates as Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set time to beginning/end of day
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    // Get all bookings with populated room and user data
    const bookings = await db
      .collection('bookings')
      .aggregate([
        { 
          $match: { 
            room: new ObjectId(roomId),
            date: {
              $gte: start,
              $lte: end
            }
          } 
        },
        {
          $lookup: {
            from: 'rooms',
            localField: 'room',
            foreignField: '_id',
            as: 'roomData'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userData'
          }
        },
        {
          $unwind: {
            path: '$roomData',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$userData',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            date: 1,
            startTime: 1,
            endTime: 1,
            status: 1,
            createdAt: 1,
            room: '$roomData',
            user: {
              _id: '$userData._id',
              name: '$userData.name',
              email: '$userData.email',
              role: '$userData.role',
              department: '$userData.department'
            }
          }
        },
        { $sort: { date: 1, startTime: 1 } }
      ])
      .toArray();

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error in GET /api/admin/bookings/weekly:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 