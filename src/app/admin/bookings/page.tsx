'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminHeader } from '@/components/AdminHeader';
import { format } from 'date-fns';
import Link from 'next/link';

interface Booking {
  _id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  groupId?: string;
  room: {
    _id: string;
    name: string;
    number: string;
    building: string;
  };
  user: {
    _id: string;
    name: string;
    email: string;
  };
}

// Component that uses useSearchParams needs to be wrapped in Suspense
function BookingsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('status') || 'all';
  
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    initialTab as 'all' | 'pending' | 'approved' | 'rejected'
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Fetch bookings based on active tab
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        
        const url = activeTab === 'all' 
          ? '/api/admin/bookings' 
          : `/api/admin/bookings?status=${activeTab}`;
          
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }
        
        const data = await response.json();
        setBookings(data);
      } catch (err: any) {
        console.error('Error fetching bookings:', err);
        setError(err.message || 'An error occurred while fetching bookings');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookings();
  }, [activeTab]);
  
  const handleTabChange = (tab: 'all' | 'pending' | 'approved' | 'rejected') => {
    setActiveTab(tab);
  };
  
  // Handle booking approval or rejection
  const handleStatusChange = async (bookingId: string, newStatus: 'approved' | 'rejected', isGroup: boolean = false) => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus,
          applyToGroup: isGroup 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update booking status');
      }
      
      const result = await response.json();
      
      // If it was a group update, reload the bookings to show all updates
      if (isGroup && result.updatedCount > 1) {
        // Reload bookings with the current active tab
        const fetchUpdatedBookings = async () => {
          try {
            setLoading(true);
            
            const status = activeTab !== 'all' ? activeTab : undefined;
            
            const response = await fetch(`/api/admin/bookings${status ? `?status=${status}` : ''}`);
            if (!response.ok) {
              throw new Error('Failed to fetch bookings');
            }
            
            const data = await response.json();
            setBookings(data);
          } catch (err: any) {
            console.error('Error fetching bookings:', err);
            setError(err.message || 'An error occurred while fetching bookings');
          } finally {
            setLoading(false);
          }
        };
        
        fetchUpdatedBookings();
      } else {
        // Update booking status in the local state
        setBookings(prevBookings => 
          prevBookings.map(booking => 
            booking._id === bookingId 
              ? { ...booking, status: newStatus } 
              : booking
          )
        );
      }
    } catch (err: any) {
      console.error('Error updating booking status:', err);
      alert(err.message || 'An error occurred');
    }
  };
  
  // Add function to handle group status changes
  const handleGroupStatusChange = async (booking: any, newStatus: 'approved' | 'rejected') => {
    // If booking has a groupId and there are recurring instances
    if (booking.groupId) {
      if (confirm(`Do you want to ${newStatus} all recurring instances of this booking?`)) {
        await handleStatusChange(booking._id, newStatus, true);
      } else {
        await handleStatusChange(booking._id, newStatus, false);
      }
    } else {
      await handleStatusChange(booking._id, newStatus, false);
    }
  };
  
  // Format date and time for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  const formatTime = (timeString: string) => {
    return format(new Date(timeString), 'h:mm a');
  };
  
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Booking Management</h1>
        <Link href="/admin/rooms" className="btn-primary">
          Create Booking
        </Link>
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
            All Requests
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
      
      {/* Booking List */}
      {loading ? (
        <div className="text-center py-8">
          <p>Loading bookings...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-8">
          <p>No {activeTab !== 'all' ? activeTab : ''} bookings found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left">Title</th>
                <th className="py-3 px-4 text-left">Room</th>
                <th className="py-3 px-4 text-left">Professor</th>
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-left">Time</th>
                <th className="py-3 px-4 text-left">Created</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking._id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Link href={`/admin/bookings/${booking._id}`} className="font-medium text-blue-600 hover:text-blue-800">
                      {booking.title}
                    </Link>
                    {booking.groupId && (
                      <span className="ml-2 text-xs text-gray-500">(Recurring)</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium">{booking.room.name}</span>
                    <br />
                    <span className="text-xs text-gray-500">
                      Room {booking.room.number}, {booking.room.building}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {booking.user.name}
                    <br />
                    <span className="text-xs text-gray-500">{booking.user.email}</span>
                  </td>
                  <td className="py-3 px-4">{formatDate(booking.date)}</td>
                  <td className="py-3 px-4">
                    {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                  </td>
                  <td className="py-3 px-4">{formatDate(booking.createdAt)}</td>
                  <td className="py-3 px-4">
                    <span className={`
                      px-2 py-1 text-xs rounded-full 
                      ${booking.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                      ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${booking.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {booking.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleGroupStatusChange(booking, 'approved')}
                          className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleGroupStatusChange(booking, 'rejected')}
                          className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    <Link href={`/admin/bookings/${booking._id}`} className="text-xs text-blue-600 hover:text-blue-800 mt-1 block">
                      View/Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function AdminBookingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      <main className="container mx-auto px-4 py-8">
        <Suspense fallback={<div className="text-center py-8">Loading bookings page...</div>}>
          <BookingsContent />
        </Suspense>
      </main>
    </div>
  );
} 