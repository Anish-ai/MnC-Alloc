import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import { ObjectId, Db } from 'mongodb';
import { isBefore, format, addDays } from 'date-fns';

interface WeeklySchedule {
  [key: string]: {
    startTime: string;
    endTime: string;
    enabled: boolean;
  };
}

interface BookingRequest {
  room: string;
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  repeatType?: 'none' | 'daily' | 'weekly';
  repeatEndDate?: string;
  weeklySchedule?: WeeklySchedule;
}

interface SessionUser {
  id: string;
  role: string;
  [key: string]: any;
}

interface Session {
  user?: SessionUser;
  expires: string;
}

// Helper function to get database connection
async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  if (!db) {
    throw new Error('Database connection failed');
  }
  return db;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any) as Session;
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const roomId = searchParams.get('room');
    const date = searchParams.get('date');
    const week = searchParams.get('week');

    const db = await getDb();
    
    // Build query based on parameters
    const query: any = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (roomId) {
      query.room = new ObjectId(roomId);
    }
    
    if (date) {
      const dateObj = new Date(date);
      query.date = dateObj;
    }
    
    if (week) {
      const weekStart = new Date(week);
      const weekEnd = new Date(week);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      query.date = {
        $gte: weekStart,
        $lte: weekEnd
      };
    }
    
    // Get all bookings with populated room and user data
    const bookings = await db
      .collection('bookings')
      .aggregate([
        { $match: query },
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
        { $sort: { createdAt: -1, date: 1, startTime: 1 } }
      ])
      .toArray();

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error in GET /api/admin/bookings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any) as any;
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as BookingRequest;
    const { 
      room: roomId, 
      title, 
      description, 
      date,
      startTime, 
      endTime, 
      status = 'approved',
      repeatType = 'none',
      repeatEndDate,
      weeklySchedule
    } = body;

    if (!roomId || !title || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate times based on repeat type
    if (repeatType !== 'weekly') {
      if (!startTime || !endTime) {
        return NextResponse.json(
          { error: 'Start time and end time are required for non-weekly bookings' },
          { status: 400 }
        );
      }

      // Validate times
      if (endTime <= startTime) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }
    } else {
      if (!weeklySchedule) {
        return NextResponse.json(
          { error: 'Weekly schedule is required for weekly bookings' },
          { status: 400 }
        );
      }

      // Validate weekly schedule
      let hasEnabledDay = false;
      for (const [day, schedule] of Object.entries(weeklySchedule)) {
        if (schedule.enabled) {
          hasEnabledDay = true;
          
          // Simple hour comparison
          const startDate = new Date(schedule.startTime);
          const endDate = new Date(schedule.endTime);
          
          const startHour = startDate.getHours();
          const endHour = endDate.getHours();
          
          if (endHour <= startHour) {
            return NextResponse.json(
              { error: `End time must be after start time for ${day}` },
              { status: 400 }
            );
          }
        }
      }

      if (!hasEnabledDay) {
        return NextResponse.json(
          { error: 'Please enable at least one day in the weekly schedule' },
          { status: 400 }
        );
      }
    }

    const { db } = await connectToDatabase() as { db: any };
    
    // Check if room exists
    const roomExists = await db
      .collection('rooms')
      .findOne({ _id: new ObjectId(roomId) });
      
    if (!roomExists) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }
    
    // Validate times
    if (startTime && endTime) {
      // Simple hour comparison
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      
      const startHour = startDate.getHours();
      const endHour = endDate.getHours();
      
      if (endHour <= startHour) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }
    }
    
    // Create array of bookings based on repeat type
    const bookingsToCreate = [];
    
    // Function to check booking conflicts
    const checkConflicts = async (date: Date, start: Date, end: Date) => {
      // Set the hours/minutes from start and end to the date
      const startDateTime = new Date(date);
      startDateTime.setHours(start.getHours(), start.getMinutes(), 0, 0);
      
      const endDateTime = new Date(date);
      endDateTime.setHours(end.getHours(), end.getMinutes(), 0, 0);
      
      // Check for conflicts
      const conflicts = await db.collection('bookings').findOne({
        room: new ObjectId(roomId),
        date: {
          $eq: new Date(date.setHours(0, 0, 0, 0))
        },
        status: { $ne: 'rejected' },
        $or: [
          {
            // New booking starts during an existing booking
            startTime: { $lt: endDateTime },
            endTime: { $gt: startDateTime }
          },
          {
            // New booking contains an existing booking
            startTime: { $gte: startDateTime },
            endTime: { $lte: endDateTime }
          }
        ]
      });
      
      return conflicts;
    };
    
    // Initial booking
    const baseBooking = {
      room: new ObjectId(roomId),
      user: new ObjectId(session.user.id),
      title,
      description: description || '',
      date: new Date(date),
      status,
      createdAt: new Date(),
      createdBy: 'admin',
    };
    
    // For non-repeating bookings, add the initial booking
    if (startTime && endTime) {
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      const bookingDateObj = new Date(date);
      
      bookingsToCreate.push({
        ...baseBooking,
        startTime: new Date(
          bookingDateObj.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0)
        ),
        endTime: new Date(
          bookingDateObj.setHours(endDate.getHours(), endDate.getMinutes(), 0, 0)
        ),
      });
    }
    
    // Handle repeating bookings
    if (repeatType !== 'none' && repeatEndDate) {
      const endRepeatDate = new Date(repeatEndDate);
      let currentDate = new Date(date);
      
      console.log(`Creating repeating bookings from ${new Date(date)} to ${endRepeatDate}, type: ${repeatType}`);
      
      if (repeatType === 'daily' && startTime && endTime) {
        const startTimeObj = new Date(startTime);
        const endTimeObj = new Date(endTime);
        
        // Additional validation for hour comparison in daily bookings
        const startHour = startTimeObj.getHours();
        const endHour = endTimeObj.getHours();
        
        if (endHour <= startHour) {
          return NextResponse.json(
            { error: 'End time must be after start time for daily bookings' },
            { status: 400 }
          );
        }
        
        // Add daily bookings from the day after the initial booking until the repeat end date
        currentDate = addDays(currentDate, 1);
        
        console.log(`Creating daily bookings starting from ${currentDate} until ${endRepeatDate}`);
        console.log(`Time: ${startTimeObj.getHours()}:${startTimeObj.getMinutes()} to ${endTimeObj.getHours()}:${endTimeObj.getMinutes()}`);
        
        while (isBefore(currentDate, endRepeatDate)) {
          const dayBookingDate = new Date(currentDate);
          console.log(`Creating booking for date: ${dayBookingDate}`);
          
          const repeatedBooking = {
            ...baseBooking,
            date: new Date(dayBookingDate.setHours(0, 0, 0, 0)),
            startTime: new Date(
              new Date(dayBookingDate).setHours(startTimeObj.getHours(), startTimeObj.getMinutes(), 0, 0)
            ),
            endTime: new Date(
              new Date(dayBookingDate).setHours(endTimeObj.getHours(), endTimeObj.getMinutes(), 0, 0)
            ),
          };
          
          bookingsToCreate.push(repeatedBooking);
          currentDate = addDays(currentDate, 1);
        }
      } else if (repeatType === 'weekly' && weeklySchedule) {
        // Add bookings for each enabled day in the weekly schedule
        while (isBefore(currentDate, endRepeatDate)) {
          const dayOfWeek = currentDate.getDay();
          const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
          const daySchedule = weeklySchedule[dayName];
          
          if (daySchedule && daySchedule.enabled && daySchedule.startTime && daySchedule.endTime) {
            const startTimeDate = new Date(daySchedule.startTime);
            const endTimeDate = new Date(daySchedule.endTime);
            
            const repeatedBooking = {
              ...baseBooking,
              date: new Date(currentDate.setHours(0, 0, 0, 0)),
              startTime: new Date(
                currentDate.setHours(
                  startTimeDate.getHours(),
                  startTimeDate.getMinutes(),
                  0,
                  0
                )
              ),
              endTime: new Date(
                currentDate.setHours(
                  endTimeDate.getHours(),
                  endTimeDate.getMinutes(),
                  0,
                  0
                )
              ),
            };
            
            bookingsToCreate.push(repeatedBooking);
          }
          
          currentDate = addDays(currentDate, 1);
        }
      }
    }
    
    // Check for conflicts with all bookings
    for (const booking of bookingsToCreate) {
      const conflict = await checkConflicts(
        booking.date,
        booking.startTime,
        booking.endTime
      );
      
      if (conflict) {
        const conflictDate = format(conflict.date, 'MMM d, yyyy');
        const conflictStart = format(conflict.startTime, 'h:mm a');
        const conflictEnd = format(conflict.endTime, 'h:mm a');
        
        return NextResponse.json({
          error: `Booking conflict on ${conflictDate} between ${conflictStart} and ${conflictEnd}`
        }, { status: 409 });
      }
    }
    
    // Insert all bookings
    const result = await db.collection('bookings').insertMany(bookingsToCreate);
    
    if (!result.acknowledged) {
      throw new Error('Failed to create bookings');
    }
    
    // Create notification for room booking
    const roomName = roomExists.name || roomExists.number;
    
    await db.collection('notifications').insertOne({
      title: 'Room Booking Created',
      message: `Admin created a booking for ${roomName}: ${title}`,
      type: 'booking_created',
      user: new ObjectId(session.user.id),
      createdAt: new Date(),
      read: false,
    });
    
    return NextResponse.json({
      message: 'Booking(s) created successfully',
      bookingIds: result.insertedIds,
      repeatCount: bookingsToCreate.length
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/bookings:', error);
    return NextResponse.json({
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any) as any;
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, notifyUser = true } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase() as { db: any };
    
    // Get booking to verify it exists and get details
    const booking = await db
      .collection('bookings')
      .findOne({ _id: new ObjectId(id) });
      
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Update booking status
    const result = await db
      .collection('bookings')
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { status, updatedAt: new Date() } }
      );
      
    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to update booking status' },
        { status: 500 }
      );
    }
    
    // Get room details for notification
    const room = await db
      .collection('rooms')
      .findOne({ _id: booking.room });
      
    // Create notification for user if required
    if (notifyUser && booking.user) {
      const roomName = room ? (room.name || room.number) : 'a room';
      const statusText = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'updated';
      
      await db.collection('notifications').insertOne({
        title: `Booking ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
        message: `Your booking for ${roomName} (${booking.title}) has been ${statusText}`,
        type: `booking_${status}`,
        user: booking.user,
        createdAt: new Date(),
        read: false,
        relatedBooking: booking._id
      });
    }
    
    return NextResponse.json({
      message: 'Booking status updated successfully',
      status
    });
  } catch (error) {
    console.error('Error in PATCH /api/admin/bookings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any) as any;
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing booking ID' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase() as { db: any };
    
    // Get booking to verify it exists and get details
    const booking = await db
      .collection('bookings')
      .findOne({ _id: new ObjectId(id) });
      
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Delete booking
    const result = await db
      .collection('bookings')
      .deleteOne({ _id: new ObjectId(id) });
      
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to delete booking' },
        { status: 500 }
      );
    }
    
    // Get room details for notification
    const room = await db
      .collection('rooms')
      .findOne({ _id: booking.room });
      
    // Create notification for user
    if (booking.user && booking.user.toString() !== session.user.id) {
      const roomName = room ? (room.name || room.number) : 'a room';
      
      await db.collection('notifications').insertOne({
        title: 'Booking Cancelled',
        message: `Your booking for ${roomName} (${booking.title}) has been cancelled by an administrator`,
        type: 'booking_cancelled',
        user: booking.user,
        createdAt: new Date(),
        read: false
      });
    }
    
    return NextResponse.json({
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/bookings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 