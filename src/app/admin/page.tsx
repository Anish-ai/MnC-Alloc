'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { AdminHeader } from '@/components/AdminHeader';

interface AdminDashboardStats {
  totalUsers: number;
  totalRooms: number;
  pendingBookings: number;
  todayBookings: number;
  charts?: {
    bookingsByStatus: Array<{ _id: string; count: number }>;
    roomsByBuilding: Array<{ _id: string; count: number }>;
    bookingsByDay: Array<{ day: string; count: number }>;
  };
}

export default function AdminDashboardPage() {
  const { status } = useSession();
  const [stats, setStats] = useState<AdminDashboardStats>({
    totalUsers: 0,
    totalRooms: 0,
    pendingBookings: 0,
    todayBookings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats');
        }
        const data = await response.json();
        setStats(data);
      } catch (err: any) {
        console.error('Error fetching dashboard stats:', err);
        setError(err.message || 'Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchStats();
    }
  }, [status]);

  // Fetch admin notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/admin/notifications');
        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }
        const data = await response.json();
        setNotifications(data);
      } catch (err: any) {
        console.error('Error fetching notifications:', err);
      }
    };

    if (status === 'authenticated') {
      fetchNotifications();
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-gray-500">Please wait while we fetch dashboard data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Welcome to Admin Dashboard</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card bg-white p-6 rounded-lg shadow flex flex-col">
            <h3 className="text-gray-500 text-sm uppercase mb-1">Total Users</h3>
            <p className="text-3xl font-bold text-primary">{stats.totalUsers}</p>
            <div className="mt-auto pt-4">
              <Link href="/admin/users" className="text-sm text-primary hover:text-primary-dark">View all users →</Link>
            </div>
          </div>
          
          <div className="card bg-white p-6 rounded-lg shadow flex flex-col">
            <h3 className="text-gray-500 text-sm uppercase mb-1">Total Rooms</h3>
            <p className="text-3xl font-bold text-primary">{stats.totalRooms}</p>
            <div className="mt-auto pt-4">
              <Link href="/admin/rooms" className="text-sm text-primary hover:text-primary-dark">Manage rooms →</Link>
            </div>
          </div>
          
          <div className="card bg-white p-6 rounded-lg shadow flex flex-col">
            <h3 className="text-gray-500 text-sm uppercase mb-1">Pending Bookings</h3>
            <p className="text-3xl font-bold text-primary">{stats.pendingBookings}</p>
            <div className="mt-auto pt-4">
              <Link href="/admin/bookings?status=pending" className="text-sm text-primary hover:text-primary-dark">View pending →</Link>
            </div>
          </div>
          
          <div className="card bg-white p-6 rounded-lg shadow flex flex-col">
            <h3 className="text-gray-500 text-sm uppercase mb-1">Today's Bookings</h3>
            <p className="text-3xl font-bold text-primary">{stats.todayBookings}</p>
            <div className="mt-auto pt-4">
              <Link href="/admin/bookings" className="text-sm text-primary hover:text-primary-dark">View all bookings →</Link>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Recent Notifications</h2>
            {notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.map((notification: any) => (
                  <div key={notification._id} className="border-b pb-4">
                    <h3 className="font-medium">{notification.title}</h3>
                    <p className="text-gray-600 text-sm">{notification.message}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                      {notification.type === 'booking_request' && (
                        <Link 
                          href={`/admin/bookings?id=${notification.relatedBooking}`}
                          className="text-sm text-primary hover:text-primary-dark"
                        >
                          View request
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No new notifications</p>
            )}
          </div>
          
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-4">
              <Link href="/admin/users/new" className="block p-4 border rounded-lg hover:border-primary hover:bg-blue-50 transition-colors">
                <div className="flex items-center">
                  <div className="mr-4 text-xl">👤</div>
                  <div>
                    <h3 className="font-medium">Add New User</h3>
                    <p className="text-sm text-gray-600">Create a new professor or admin account</p>
                  </div>
                </div>
              </Link>
              
              <Link href="/admin/rooms/new" className="block p-4 border rounded-lg hover:border-primary hover:bg-blue-50 transition-colors">
                <div className="flex items-center">
                  <div className="mr-4 text-xl">🏫</div>
                  <div>
                    <h3 className="font-medium">Add New Room</h3>
                    <p className="text-sm text-gray-600">Create a new classroom in the system</p>
                  </div>
                </div>
              </Link>
              
              <Link href="/admin/bookings/new" className="block p-4 border rounded-lg hover:border-primary hover:bg-blue-50 transition-colors">
                <div className="flex items-center">
                  <div className="mr-4 text-xl">📅</div>
                  <div>
                    <h3 className="font-medium">Create Booking</h3>
                    <p className="text-sm text-gray-600">Book a room directly (admin&apos;s privilege)</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 