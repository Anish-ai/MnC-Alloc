import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { authOptions } from '@/app/api/auth/[...nextauth]/config';
import { ObjectId, Db } from 'mongodb';
import { format } from 'date-fns';

// Type definitions
interface Params {
  id: string;
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

interface Booking {
  _id: ObjectId;
  groupId?: string;
  user?: ObjectId;
  room: ObjectId;
  title: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  status: string;
  // Add other booking properties as needed
}

// Helper function for authentication
async function authenticateAdmin() {
  const session = await getServerSession(authOptions as any) as Session;
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    );
  }
  return session.user;
}

// Helper function to get database connection
async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  if (!db) {
    throw new Error('Database connection failed');
  }
  return db;
}

// PATCH handler using URL param instead of route param
export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticateAdmin();
    if (user instanceof NextResponse) return user;

    // Get ID from URL or URL params
    const segments = request.url.split('/');
    const bookingId = segments[segments.length - 1];
    
    if (!bookingId || !ObjectId.isValid(bookingId)) {
      return NextResponse.json(
        { error: 'Invalid booking ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, notifyUser = true, applyToGroup = true } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Missing required status field' },
        { status: 400 }
      );
    }

    const db = await getDb();
    
    const booking = await db.collection<Booking>('bookings').findOne({ 
      _id: new ObjectId(bookingId) 
    });
      
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    let updatedCount = 0;
    let affectedBookings: Booking[] = [booking];
    
    if (booking.groupId && applyToGroup) {
      const result = await db.collection<Booking>('bookings').updateMany(
        { groupId: booking.groupId },
        { $set: { status, updatedAt: new Date() } }
      );
      
      updatedCount = result.modifiedCount;
      affectedBookings = await db.collection<Booking>('bookings')
        .find({ groupId: booking.groupId })
        .toArray();
    } else {
      const result = await db.collection<Booking>('bookings').updateOne(
        { _id: new ObjectId(bookingId) },
        { $set: { status, updatedAt: new Date() } }
      );
      updatedCount = result.modifiedCount;
    }
    
    if (updatedCount === 0) {
      return NextResponse.json(
        { error: 'No bookings were updated' },
        { status: 404 }
      );
    }
    
    const room = await db.collection('rooms').findOne({ 
      _id: booking.room 
    });
    
    if (notifyUser && booking.user) {
      const roomName = room?.name || room?.number || 'a room';
      const statusText = status === 'approved' ? 'approved' : 
                        status === 'rejected' ? 'rejected' : 'updated';
      
      let message = '';
      if (affectedBookings.length > 1) {
        const firstDate = format(affectedBookings[0].date, 'MMM d, yyyy');
        const lastDate = format(affectedBookings[affectedBookings.length - 1].date, 'MMM d, yyyy');
        message = `Your ${affectedBookings.length} recurring bookings for ${roomName} (${booking.title}) from ${firstDate} to ${lastDate} have been ${statusText}`;
      } else {
        message = `Your booking for ${roomName} (${booking.title}) on ${
          format(booking.date, 'MMM d, yyyy')} has been ${statusText}`;
      }
      
      await db.collection('notifications').insertOne({
        title: `Booking ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
        message,
        type: `booking_${status}`,
        user: booking.user,
        createdAt: new Date(),
        read: false,
        relatedBooking: booking._id,
        ...(booking.groupId && { bookingGroupId: booking.groupId })
      });
    }
    
    return NextResponse.json({
      message: affectedBookings.length > 1 
        ? `${affectedBookings.length} bookings updated` 
        : 'Booking updated',
      status,
      updatedCount
    });
  } catch (error) {
    console.error('PATCH Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateAdmin();
    if (user instanceof NextResponse) return user;

    // Get ID from URL or URL params
    const segments = request.url.split('/');
    const bookingId = segments[segments.length - 1];
    
    if (!bookingId || !ObjectId.isValid(bookingId)) {
      return NextResponse.json(
        { error: 'Invalid booking ID format' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deleteGroup = searchParams.get('deleteGroup') === 'true';

    const db = await getDb();
    
    const booking = await db.collection<Booking>('bookings').findOne({ 
      _id: new ObjectId(bookingId) 
    });
      
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    let deletedCount = 0;
    let affectedBookings: Booking[] = [booking];
    
    if (booking.groupId && deleteGroup) {
      affectedBookings = await db.collection<Booking>('bookings')
        .find({ groupId: booking.groupId })
        .toArray();
      
      const result = await db.collection<Booking>('bookings').deleteMany({ 
        groupId: booking.groupId 
      });
      deletedCount = result.deletedCount;
    } else {
      const result = await db.collection<Booking>('bookings').deleteOne({ 
        _id: new ObjectId(bookingId) 
      });
      deletedCount = result.deletedCount;
    }
    
    if (deletedCount === 0) {
      return NextResponse.json(
        { error: 'No bookings deleted' },
        { status: 404 }
      );
    }
    
    const room = await db.collection('rooms').findOne({ 
      _id: booking.room 
    });
      
    if (booking.user && booking.user.toString() !== user.id) {
      const roomName = room?.name || room?.number || 'a room';
      
      let message = '';
      if (affectedBookings.length > 1) {
        const firstDate = format(affectedBookings[0].date, 'MMM d, yyyy');
        const lastDate = format(affectedBookings[affectedBookings.length - 1].date, 'MMM d, yyyy');
        message = `Your ${affectedBookings.length} recurring bookings for ${roomName} (${booking.title}) from ${firstDate} to ${lastDate} have been cancelled`;
      } else {
        message = `Your booking for ${roomName} (${booking.title}) on ${
          format(booking.date, 'MMM d, yyyy')} has been cancelled`;
      }
      
      await db.collection('notifications').insertOne({
        title: 'Booking Cancelled',
        message,
        type: 'booking_cancelled',
        user: booking.user,
        createdAt: new Date(),
        read: false,
        ...(booking.groupId && { bookingGroupId: booking.groupId })
      });
    }
    
    return NextResponse.json({
      message: affectedBookings.length > 1 
        ? `${affectedBookings.length} bookings deleted` 
        : 'Booking deleted',
      deletedCount
    });
  } catch (error) {
    console.error('DELETE Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await authenticateAdmin();
    if (user instanceof NextResponse) return user;

    // Get ID from URL or URL params
    const segments = request.url.split('/');
    const bookingId = segments[segments.length - 1];
    
    if (!bookingId || !ObjectId.isValid(bookingId)) {
      return NextResponse.json(
        { error: 'Invalid booking ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { 
      title, 
      description, 
      startTime, 
      endTime,
      repeatType = 'none',
      repeatEndDate
    } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDb();
    
    const existingBooking = await db.collection<Booking>('bookings').findOne({ 
      _id: new ObjectId(bookingId) 
    });
      
    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (end <= start) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }
    
    const conflicts = await db.collection<Booking>('bookings').find({
      _id: { $ne: new ObjectId(bookingId) },
      room: existingBooking.room,
      date: existingBooking.date,
      status: { $ne: 'rejected' },
      $or: [
        { startTime: { $lt: end }, endTime: { $gt: start } },
        { startTime: { $gte: start }, endTime: { $lte: end } }
      ]
    }).toArray();

    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      return NextResponse.json({
        error: `Conflict with booking ${format(conflict.date, 'MMM d, yyyy')} ${
          format(conflict.startTime, 'h:mm a')}-${
          format(conflict.endTime, 'h:mm a')}`
      }, { status: 409 });
    }
    
    const updateResult = await db.collection<Booking>('bookings').updateOne(
      { _id: new ObjectId(bookingId) },
      { 
        $set: { 
          title,
          description: description || '',
          startTime: start,
          endTime: end,
          repeatType,
          ...(repeatType !== 'none' && { 
            repeatEndDate: new Date(repeatEndDate) 
          }),
          updatedAt: new Date()
        }
      }
    );
      
    if (updateResult.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'No changes made' },
        { status: 304 }
      );
    }
    
    const room = await db.collection('rooms').findOne({ 
      _id: existingBooking.room 
    });
      
    if (existingBooking.user?.toString() !== user.id) {
      const roomName = room?.name || room?.number || 'a room';
      
      await db.collection('notifications').insertOne({
        title: 'Booking Updated',
        message: `Your booking for ${roomName} (${title}) was updated`,
        type: 'booking_updated',
        user: existingBooking.user,
        createdAt: new Date(),
        read: false,
        relatedBooking: existingBooking._id
      });
    }
    
    return NextResponse.json({
      message: 'Booking updated successfully'
    });
  } catch (error) {
    console.error('PUT Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}