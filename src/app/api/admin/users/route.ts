import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any) as any;
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    
    const { db } = await connectToDatabase() as { db: any };
    
    // Build query based on parameters
    const query: any = {};
    
    if (role) {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await db
      .collection('users')
      .find(query)
      .project({
        password: 0 // Exclude password from results
      })
      .sort({ createdAt: -1 })
      .toArray();
      
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any) as any;
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password, role, department } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase() as { db: any };
    
    // Check if user with this email already exists
    const existingUser = await db
      .collection('users')
      .findOne({ email: email.toLowerCase() });
      
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const result = await db.collection('users').insertOne({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'professor', // Default to professor if not specified
      department: department || '',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    if (!result.acknowledged) {
      throw new Error('Failed to create user');
    }
    
    // Create notification for new user
    await db.collection('notifications').insertOne({
      title: 'New User Registered',
      message: `Admin created a new user account for ${name} (${email})`,
      type: 'user_registered',
      forAdmin: true,
      createdAt: new Date(),
      read: false
    });
    
    return NextResponse.json({
      message: 'User created successfully',
      userId: result.insertedId
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/users:', error);
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
    const { id, name, email, role, department, password } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing user ID' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase() as { db: any };
    
    // Check if user exists
    const existingUser = await db
      .collection('users')
      .findOne({ _id: new ObjectId(id) });
      
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Prevent updating the last admin if changing role from admin
    if (existingUser.role === 'admin' && role !== 'admin') {
      const adminCount = await db
        .collection('users')
        .countDocuments({ role: 'admin' });
        
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot change role of the last administrator' },
          { status: 400 }
        );
      }
    }
    
    // Build update object
    const updateObject: any = {
      updatedAt: new Date()
    };
    
    if (name) updateObject.name = name;
    if (email) updateObject.email = email.toLowerCase();
    if (role) updateObject.role = role;
    if (department !== undefined) updateObject.department = department;
    
    // If password is provided, hash it
    if (password) {
      updateObject.password = await bcrypt.hash(password, 10);
    }
    
    // Update user
    const result = await db
      .collection('users')
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: updateObject }
      );
      
    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'No changes were made to the user' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error in PATCH /api/admin/users:', error);
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
        { error: 'Missing user ID' },
        { status: 400 }
      );
    }
    
    // Don't allow deleting yourself
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase() as { db: any };
    
    // Check if user exists and is not the last admin
    const user = await db
      .collection('users')
      .findOne({ _id: new ObjectId(id) });
      
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await db
        .collection('users')
        .countDocuments({ role: 'admin' });
        
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last administrator account' },
          { status: 400 }
        );
      }
    }
    
    // Delete user's bookings
    await db
      .collection('bookings')
      .deleteMany({ user: new ObjectId(id) });
      
    // Delete user's notifications
    await db
      .collection('notifications')
      .deleteMany({ user: new ObjectId(id) });
    
    // Delete user
    const result = await db
      .collection('users')
      .deleteOne({ _id: new ObjectId(id) });
      
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'User and associated data deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 