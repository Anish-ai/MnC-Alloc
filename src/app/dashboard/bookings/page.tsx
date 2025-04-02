'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { DashboardHeader } from '@/components/DashboardHeader';
import Link from 'next/link';

interface Booking {
  _id: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  room: {
    _id: string;
    name: string;
    number: string;
    building: string;
  };
}

export default function UserBookingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  // Fetch user's bookings
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        
        // Get filtered bookings if a status is selected
        const url = activeTab === 'all' 
          ? '/api/bookings' 
          : `/api/bookings?status=${activeTab}`;
          
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }
        
        const data = await response.json();
        setBookings(data);
      } catch (err: any) {
        console.error('Error fetching bookings:', err);
        setError(err.message || 'An error occurred while fetching your bookings');
      } finally {
        setLoading(false);
      }
    };
    
    if (sessionStatus === 'authenticated') {
      fetchBookings();
    }
  }, [sessionStatus, activeTab]);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  // Format time for display
  const formatTime = (timeString: string) => {
    return format(new Date(timeString), 'h:mm a');
  };
  
  // Get status badge style
  const getStatusBadgeClass = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Handle tab change
  const handleTabChange = (tab: 'all' | 'pending' | 'approved' | 'rejected') => {
    setActiveTab(tab);
  };
  
  // Handle loading state
  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <p>Loading your bookings...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Bookings</h1>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex -mb-px">
            <button
              onClick={() => handleTabChange('all')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'all'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Bookings
            </button>
            <button
              onClick={() => handleTabChange('pending')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'pending'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => handleTabChange('approved')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'approved'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => handleTabChange('rejected')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'rejected'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Rejected
            </button>
          </nav>
        </div>
        
        {bookings.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-gray-500 mb-4">You have no {activeTab !== 'all' ? activeTab : ''} bookings.</p>
            <Link href="/dashboard" className="btn-primary">
              Browse Rooms
            </Link>
          </div>
        ) : (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left">Room</th>
                    <th className="py-3 px-4 text-left">Title</th>
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-left">Time</th>
                    <th className="py-3 px-4 text-left">Status</th>
                    <th className="py-3 px-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <tr key={booking._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{booking.room.name}</p>
                          <p className="text-sm text-gray-500">
                            Room {booking.room.number}, {booking.room.building}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{booking.title}</p>
                          {booking.description && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">{booking.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">{formatDate(booking.date)}</td>
                      <td className="py-3 px-4">
                        {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`
                          px-2 py-1 text-xs rounded-full 
                          ${getStatusBadgeClass(booking.status)}
                        `}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Link 
                            href={`/dashboard/rooms/${booking.room._id}`}
                            className="text-primary hover:text-primary-dark text-sm"
                          >
                            View Room
                          </Link>
                          {booking.status === 'pending' && (
                            <button
                              onClick={async () => {
                                if (confirm('Are you sure you want to cancel this booking?')) {
                                  try {
                                    const response = await fetch(`/api/bookings/${booking._id}`, {
                                      method: 'DELETE'
                                    });
                                    
                                    if (response.ok) {
                                      // Refresh bookings
                                      setBookings(bookings.filter(b => b._id !== booking._id));
                                    } else {
                                      const data = await response.json();
                                      alert(data.message || 'Failed to cancel booking');
                                    }
                                  } catch (err) {
                                    console.error('Error canceling booking:', err);
                                    alert('An error occurred while canceling the booking');
                                  }
                                }
                              }}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 