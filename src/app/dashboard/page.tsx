'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RoomCard from '@/components/RoomCard';
import { DashboardHeader } from '@/components/DashboardHeader';

interface Room {
  _id: string;
  name: string;
  number: string;
  building: string;
  capacity: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirect to admin dashboard if user is admin
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'admin') {
      router.push('/admin');
    }
  }, [session, status, router]);

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch('/api/rooms');
        if (!response.ok) {
          throw new Error('Failed to fetch rooms');
        }
        const data = await response.json();
        setRooms(data);
      } catch (err: any) {
        console.error('Error fetching rooms:', err);
        setError(err.message || 'Failed to load rooms');
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchRooms();
    }
  }, [status]);

  // Handle loading state
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-gray-500">Please wait while we fetch your dashboard.</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-red-600">Error</h2>
          <p className="text-gray-700">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Temporary data if no rooms are available yet
  const dummyRooms: Room[] = [
    { _id: '1', name: 'Lecture Hall A', number: '101', building: 'Science Building', capacity: 100 },
    { _id: '2', name: 'Seminar Room B', number: '202', building: 'Engineering Building', capacity: 50 },
    { _id: '3', name: 'Computer Lab C', number: '303', building: 'IT Building', capacity: 30 },
  ];

  const displayRooms = rooms.length > 0 ? rooms : dummyRooms;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Welcome, {session?.user?.name}</h1>
        
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Available Classrooms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayRooms.map((room) => (
              <RoomCard 
                key={room._id} 
                room={room} 
                href={`/dashboard/rooms/${room._id}`} 
              />
            ))}
          </div>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-4">Your Upcoming Bookings</h2>
          <div className="card p-4">
            <p className="text-gray-500">
              You have no upcoming bookings. 
              <Link href="/dashboard/rooms" className="text-blue-600 hover:text-blue-800 ml-1">
                View rooms to make a booking.
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
} 