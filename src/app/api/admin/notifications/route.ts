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
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 10;
    const showAll = searchParams.get('all') === 'true';
    
    const { db } = await connectToDatabase() as { db: any };
    
    // Get admin-related notifications
    // For admins, we want to show booking requests, system notifications, etc.
    const query: any = {
      $or: [
        { forAdmin: true },
        { type: { $in: ['booking_request', 'system', 'user_registered'] } },
      ]
    };
    
    // Only get recent notifications unless showAll is true
    if (!showAll) {
      // Get notifications from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query.createdAt = { $gte: sevenDaysAgo };
    }
    
    const notifications = await db
      .collection('notifications')
      .aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userData'
          }
        },
        {
          $lookup: {
            from: 'bookings',
            localField: 'relatedBooking',
            foreignField: '_id',
            as: 'bookingData'
          }
        },
        {
          $unwind: {
            path: '$userData',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$bookingData',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            title: 1,
            message: 1,
            type: 1,
            createdAt: 1,
            read: 1,
            user: {
              _id: '$userData._id',
              name: '$userData.name',
              email: '$userData.email'
            },
            booking: {
              $cond: {
                if: { $ifNull: ['$bookingData', false] },
                then: {
                  _id: '$bookingData._id',
                  title: '$bookingData.title',
                  status: '$bookingData.status'
                },
                else: null
              }
            }
          }
        },
        { $sort: { createdAt: -1 } },
        { $limit: limit }
      ])
      .toArray();
      
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error in GET /api/admin/notifications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any) as any;
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, read } = body;

    if (!id || read === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase() as { db: any };
    
    // Mark notification as read/unread
    const result = await db
      .collection('notifications')
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { read } }
      );
      
    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to update notification' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: `Notification marked as ${read ? 'read' : 'unread'}`
    });
  } catch (error) {
    console.error('Error in PATCH /api/admin/notifications:', error);
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
    const all = searchParams.get('all') === 'true';

    const { db } = await connectToDatabase() as { db: any };
    
    if (all) {
      // Delete all admin notifications
      const result = await db
        .collection('notifications')
        .deleteMany({
          $or: [
            { forAdmin: true },
            { type: { $in: ['booking_request', 'system', 'user_registered'] } },
          ]
        });
        
      return NextResponse.json({
        message: `${result.deletedCount} notifications deleted`
      });
    } else if (id) {
      // Delete specific notification
      const result = await db
        .collection('notifications')
        .deleteOne({ _id: new ObjectId(id) });
        
      if (result.deletedCount === 0) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        message: 'Notification deleted successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Missing notification ID or all parameter' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in DELETE /api/admin/notifications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 