'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminHeader } from '@/components/AdminHeader';
import RoomForm from '@/components/RoomForm';

interface Room {
  _id: string;
  name: string;
  number: string;
  building: string;
  capacity: number;
  features: string[];
  description?: string;
}

export default function EditRoomPage() {
  const router = useRouter();
  const { id } = useParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch room data
  useEffect(() => {
    async function fetchRoom() {
      try {
        setIsLoading(true);
        setError('');

        const response = await fetch(`/api/rooms/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch room');
        }

        setRoom(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching the room');
        console.error('Room fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      fetchRoom();
    }
  }, [id]);

  const handleSubmit = async (roomData: any) => {
    try {
      setIsSubmitting(true);
      setError('');

      const response = await fetch(`/api/rooms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roomData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update room');
      }

      // Redirect to rooms list on success
      router.push('/admin/rooms');
      router.refresh(); // Refresh the page to get updated data
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating the room');
      console.error('Room update error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <AdminHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Edit Room</h1>
          <div className="flex space-x-3">
            <Link
              href={`/admin/rooms/${id}/calendar`}
              className="text-blue-600 hover:underline flex items-center"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              View Calendar
            </Link>
            <Link
              href="/admin/rooms"
              className="btn-secondary"
            >
              Cancel
            </Link>
          </div>
        </div>
        
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading room data...</p>
          </div>
        ) : error && !room ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
            <p className="mt-2">
              <Link href="/admin/rooms" className="text-red-700 underline">
                Return to rooms list
              </Link>
            </p>
          </div>
        ) : room ? (
          <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
            <RoomForm
              room={room}
              onSubmit={handleSubmit}
              isLoading={isSubmitting}
              error={error}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}