import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/booking';
import Notification from '@/models/notification';
import User from '@/models/user';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addDays, addWeeks, format } from 'date-fns';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
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

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const userId = session.user.id;
    
    // Set up base query
    const query: any = { user: userId };
    
    // Filter by status if provided
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }
    
    // Fetch user's bookings
    const bookings = await Booking.find(query)
      .populate('room', 'name number building')
      .sort({ date: 1, startTime: 1 });
    
    return NextResponse.json(bookings);
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    
    return NextResponse.json(
      { message: error.message || 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    // Get booking data
    const bookingData = await req.json();
    
    // Validate booking data
    if (!bookingData.room || !bookingData.title || !bookingData.startTime || !bookingData.endTime || !bookingData.date) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const userId = session.user.id;
    const repeatType = bookingData.repeatType || 'none';
    
    // Check time constraints (8:00 AM - 9:00 PM)
    const startTime = new Date(bookingData.startTime);
    const endTime = new Date(bookingData.endTime);
    const startHour = startTime.getHours();
    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();
    
    if (startHour < 8 || (endHour > 21 || (endHour === 21 && endMinute > 0))) {
      return NextResponse.json(
        { message: 'Bookings must be between 8:00 AM and 9:00 PM' },
        { status: 400 }
      );
    }
    
    // Validate end time is after start time
    if (endTime <= startTime) {
      return NextResponse.json(
        { message: 'End time must be after start time' },
        { status: 400 }
      );
    }
    
    // For admin users, auto-approve the booking
    const isAdmin = session.user.role === 'admin';
    const status = isAdmin ? 'approved' : 'pending';
    
    // Create bookings based on repeat type
    const bookings = [];
    
    // Generate a group ID for repeating bookings
    const groupId = repeatType !== 'none' ? new ObjectId() : null;
    
    // Common booking data
    const baseBookingData = {
      ...bookingData,
      user: userId,
      status,
      ...(groupId && { groupId }), // Add groupId if it's a recurring booking
    };
    
    // Function to check for booking conflicts
    const checkConflicts = async (date: Date, start: Date, end: Date) => {
      // Set the hours/minutes from start and end to the date
      const startDateTime = new Date(date);
      startDateTime.setHours(start.getHours(), start.getMinutes(), 0, 0);
      
      const endDateTime = new Date(date);
      endDateTime.setHours(end.getHours(), end.getMinutes(), 0, 0);
      
      // Find any existing bookings for the same room that overlap with the proposed time
      const existingBooking = await Booking.findOne({
        room: new ObjectId(bookingData.room),
        date: {
          $eq: new Date(date.setHours(0, 0, 0, 0))
        },
        status: { $ne: 'rejected' },
        $or: [
          // New booking starts during an existing booking
          {
            startTime: { $lt: endDateTime },
            endTime: { $gt: startDateTime }
          },
          // New booking contains an existing booking
          {
            startTime: { $gte: startDateTime },
            endTime: { $lte: endDateTime }
          }
        ]
      });
      
      return existingBooking;
    };
    
    // Handle non-repeating booking
    if (repeatType === 'none') {
      // Check for conflicts before creating the booking
      const bookingDate = new Date(bookingData.date);
      const conflict = await checkConflicts(bookingDate, startTime, endTime);
      
      if (conflict) {
        return NextResponse.json(
          { message: 'This time slot conflicts with an existing booking' },
          { status: 409 }
        );
      }
      
      const booking = await Booking.create(baseBookingData);
      bookings.push(booking);
    } 
    // Handle daily repeat
    else if (repeatType === 'daily' && bookingData.repeatEndDate) {
      const startDate = new Date(bookingData.date);
      const endDate = new Date(bookingData.repeatEndDate);
      
      let currentDate = startDate;
      // Check for conflicts for all dates before creating any bookings
      while (currentDate <= endDate) {
        const conflict = await checkConflicts(new Date(currentDate), startTime, endTime);
        
        if (conflict) {
          const conflictDate = format(conflict.date, 'MMM d, yyyy');
          return NextResponse.json(
            { message: `Booking conflict on ${conflictDate}. Please check existing bookings.` },
            { status: 409 }
          );
        }
        
        currentDate = addDays(currentDate, 1);
      }
      
      // Now create the bookings since no conflicts were found
      currentDate = startDate;
      while (currentDate <= endDate) {
        const booking = await Booking.create({
          ...baseBookingData,
          date: new Date(currentDate),
        });
        
        bookings.push(booking);
        currentDate = addDays(currentDate, 1);
      }
    } 
    // Handle weekly repeat
    else if (repeatType === 'weekly' && bookingData.repeatEndDate) {
      const startDate = new Date(bookingData.date);
      const endDate = new Date(bookingData.repeatEndDate);
      
      let currentDate = startDate;
      // Check for conflicts for all dates before creating any bookings
      while (currentDate <= endDate) {
        const conflict = await checkConflicts(new Date(currentDate), startTime, endTime);
        
        if (conflict) {
          const conflictDate = format(conflict.date, 'MMM d, yyyy');
          return NextResponse.json(
            { message: `Booking conflict on ${conflictDate}. Please check existing bookings.` },
            { status: 409 }
          );
        }
        
        currentDate = addWeeks(currentDate, 1);
      }
      
      // Now create the bookings since no conflicts were found
      currentDate = startDate;
      while (currentDate <= endDate) {
        const booking = await Booking.create({
          ...baseBookingData,
          date: new Date(currentDate),
        });
        
        bookings.push(booking);
        currentDate = addWeeks(currentDate, 1);
      }
    }
    
    // Create notification for admin if booking is pending
    if (status === 'pending') {
      // Find admin users
      const adminUsers = await User.find({ role: 'admin' });
      
      // Create a single notification for the entire booking group
      for (const admin of adminUsers) {
        const notificationText = repeatType !== 'none' 
          ? `${session.user.name} has requested ${bookings.length} recurring bookings from ${format(new Date(bookingData.date), 'MMM d, yyyy')} to ${format(new Date(bookingData.repeatEndDate), 'MMM d, yyyy')}`
          : `${session.user.name} has requested to book a room on ${format(new Date(bookingData.date), 'MMM d, yyyy')}`;
          
        await Notification.create({
          recipient: admin._id,
          sender: userId,
          type: 'booking_request',
          title: 'New Booking Request',
          message: notificationText,
          relatedBooking: bookings[0]._id,
          ...(groupId && { bookingGroupId: groupId }),
        });
      }
    }
    
    return NextResponse.json(
      { 
        message: 'Booking(s) created successfully', 
        bookings,
        status
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating booking:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    
    // Handle booking conflicts (this is now redundant with our explicit check)
    if (error.message && error.message.includes('booking conflict')) {
      return NextResponse.json(
        { message: 'This time slot conflicts with an existing booking' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { message: error.message || 'Failed to create booking' },
      { status: 500 }
    );
  }
}