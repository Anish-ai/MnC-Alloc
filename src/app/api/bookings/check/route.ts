import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/booking';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    
    const { 
      room,
      startTime,
      endTime,
      date,
      repeatType = 'none',
      repeatEndDate,
      weeklySchedule
    } = body;

    // Basic validation
    if (!room || !startTime || !endTime || !date) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const checkConflicts = async (checkDate: Date, start: Date, end: Date) => {
      const startDateTime = new Date(checkDate);
      startDateTime.setHours(start.getHours(), start.getMinutes(), 0, 0);
      
      const endDateTime = new Date(checkDate);
      endDateTime.setHours(end.getHours(), end.getMinutes(), 0, 0);

      return Booking.findOne({
        room: new ObjectId(room),
        date: { $eq: new Date(checkDate.setHours(0, 0, 0, 0)) },
        status: { $ne: 'rejected' },
        $or: [
          { startTime: { $lt: endDateTime }, endTime: { $gt: startDateTime } },
          { startTime: { $gte: startDateTime }, endTime: { $lte: endDateTime } }
        ]
      });
    };

    // Handle different repeat types
    const conflicts = [];
    const baseDate = new Date(date);
    const baseStart = new Date(startTime);
    const baseEnd = new Date(endTime);

    if (repeatType === 'none') {
      const conflict = await checkConflicts(baseDate, baseStart, baseEnd);
      if (conflict) conflicts.push(conflict.date);
    } 
    else if (repeatType === 'daily' && repeatEndDate) {
      let currentDate = new Date(baseDate);
      const endDate = new Date(repeatEndDate);
      
      while (currentDate <= endDate) {
        const conflict = await checkConflicts(new Date(currentDate), baseStart, baseEnd);
        if (conflict) conflicts.push(conflict.date);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    else if (repeatType === 'weekly' && repeatEndDate) {
      let currentDate = new Date(baseDate);
      const endDate = new Date(repeatEndDate);
      const dayOfWeek = baseDate.getDay();

      while (currentDate <= endDate) {
        if (currentDate.getDay() === dayOfWeek) {
          const conflict = await checkConflicts(new Date(currentDate), baseStart, baseEnd);
          if (conflict) conflicts.push(conflict.date);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return NextResponse.json({ conflicts });
  } catch (error: any) {
    console.error('Conflict check error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to check availability' },
      { status: 500 }
    );
  }
}