import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET() {
  try {
    const session = await getServerSession(authOptions as any) as any;
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase() as { db: any };
    
    // Get total users count
    const totalUsers = await db.collection('users').countDocuments();
    
    // Get total rooms count
    const totalRooms = await db.collection('rooms').countDocuments();
    
    // Get pending bookings count
    const pendingBookings = await db.collection('bookings').countDocuments({
      status: 'pending'
    });
    
    // Get today's bookings count
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    
    const todayBookings = await db.collection('bookings').countDocuments({
      date: {
        $gte: todayStart,
        $lte: todayEnd
      }
    });
    
    // Get bookings by status (for chart)
    const bookingsByStatus = await db.collection('bookings').aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    // Get rooms by building (for chart)
    const roomsByBuilding = await db.collection('rooms').aggregate([
      {
        $group: {
          _id: '$building',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();
    
    // Get bookings by day of week (for chart)
    const bookingsByDay = await db.collection('bookings').aggregate([
      {
        $addFields: {
          dayOfWeek: { $dayOfWeek: '$date' }
        }
      },
      {
        $group: {
          _id: '$dayOfWeek',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]).toArray();
    
    // Map day numbers to day names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bookingsByDayFormatted = bookingsByDay.map((item: { _id: number; count: number }) => ({
      day: dayNames[item._id - 1],
      count: item.count
    }));
    return NextResponse.json({
      totalUsers,
      totalRooms,
      pendingBookings,
      todayBookings,
      charts: {
        bookingsByStatus,
        roomsByBuilding,
        bookingsByDay: bookingsByDayFormatted
      }
    });
  } catch (error) {
    console.error('Error in GET /api/admin/stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 