'use client';

import { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/AdminHeader';
import Link from 'next/link';

interface Room {
  _id: string;
  name: string;
  number: string;
  building: string;
  capacity: number;
  features: string[];
}

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        
        const response = await fetch('/api/rooms');
        
        if (!response.ok) {
          throw new Error('Failed to fetch rooms');
        }
        
        const data = await response.json();
        setRooms(data);
      } catch (err: any) {
        console.error('Error fetching rooms:', err);
        setError(err.message || 'An error occurred while fetching rooms');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRooms();
  }, []);
  
  // Handle room deletion
  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete room');
      }
      
      // Remove the deleted room from the local state
      setRooms(prevRooms => prevRooms.filter(room => room._id !== roomId));
    } catch (err: any) {
      console.error('Error deleting room:', err);
      alert(err.message || 'An error occurred');
    }
  };
  
  // Group rooms by building
  const roomsByBuilding: Record<string, Room[]> = rooms.reduce((acc, room) => {
    const building = room.building;
    if (!acc[building]) {
      acc[building] = [];
    }
    acc[building].push(room);
    return acc;
  }, {} as Record<string, Room[]>);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Room Management</h1>
          <Link href="/admin/rooms/new" className="btn-primary">
            Add New Room
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-8">
            <p>Loading rooms...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-8">
            <p>No rooms found. Create your first room to get started.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(roomsByBuilding).map(([building, buildingRooms]) => (
              <div key={building} className="card">
                <h2 className="text-xl font-semibold mb-4">{building}</h2>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="py-3 px-4 text-left">Room Name</th>
                        <th className="py-3 px-4 text-left">Room Number</th>
                        <th className="py-3 px-4 text-left">Capacity</th>
                        <th className="py-3 px-4 text-left">Features</th>
                        <th className="py-3 px-4 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {buildingRooms.map((room) => (
                        <tr key={room._id} className="hover:bg-gray-50">
                          <td className="py-3 px-4">{room.name}</td>
                          <td className="py-3 px-4">{room.number}</td>
                          <td className="py-3 px-4">{room.capacity} people</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {room.features?.map((feature, index) => (
                                <span 
                                  key={index} 
                                  className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                >
                                  {feature}
                                </span>
                              ))}
                              {(!room.features || room.features.length === 0) && (
                                <span className="text-gray-500">None</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <Link 
                                href={`/admin/rooms/${room._id}/calendar`}
                                className="text-primary hover:text-primary-dark text-sm"
                              >
                                Calendar
                              </Link>
                              <Link 
                                href={`/admin/rooms/${room._id}/edit`}
                                className="text-primary hover:text-primary-dark text-sm"
                              >
                                Edit
                              </Link>
                              <button
                                onClick={() => handleDeleteRoom(room._id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 