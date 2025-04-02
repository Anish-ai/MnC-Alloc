'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DashboardHeader } from '@/components/DashboardHeader';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format } from 'date-fns';
import BookingModal from '@/components/BookingModal';

interface Room {
  _id: string;
  name: string;
  number: string;
  building: string;
  capacity: number;
  features?: string[];
}

interface Booking {
  _id: string;
  startTime: string;
  endTime: string;
  date: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  user: {
    name: string;
  };
}

export default function RoomDetailPage() {
  const params = useParams();
  // Extract the ID properly based on whether it's an array or object
  const roomId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const [room, setRoom] = useState<Room | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  
  // Fetch room details
  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        setLoading(true);
        
        console.log('Fetching room with ID:', roomId);
        
        // Fetch room data
        const roomResponse = await fetch(`/api/rooms/${roomId}`);
        if (!roomResponse.ok) {
          throw new Error('Failed to fetch room details');
        }
        
        const roomData = await roomResponse.json();
        setRoom(roomData);
        
        // Fetch bookings for this room and selected date
        await fetchBookingsForDate(selectedDate);
      } catch (err: any) {
        console.error('Error fetching room details:', err);
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    if (roomId) {
      fetchRoomDetails();
    }
  }, [roomId]);
  
  // Fetch bookings for a selected date
  const fetchBookingsForDate = async (date: Date) => {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const bookingsResponse = await fetch(`/api/bookings/room/${roomId}?date=${formattedDate}`);
      
      if (!bookingsResponse.ok) {
        throw new Error('Failed to fetch bookings');
      }
      
      const bookingsData = await bookingsResponse.json();
      setBookings(bookingsData);
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      // We don't set the main error state here to avoid disrupting the UI
    }
  };
  
  // Handle date change from Calendar
  const handleDateChange = (value: any) => {
    const date = value as Date;
    setSelectedDate(date);
    fetchBookingsForDate(date);
  };
  
  const openBookingModal = () => {
    setIsBookingModalOpen(true);
  };
  
  const closeBookingModal = () => {
    setIsBookingModalOpen(false);
  };
  
  // Format time from ISO string to readable format (e.g., "2:30 PM")
  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  // Dummy room data for preview
  const dummyRoom: Room = {
    _id: roomId as string,
    name: 'Lecture Hall A',
    number: '101',
    building: 'Science Building',
    capacity: 100,
    features: ['Projector', 'Whiteboard', 'Computer']
  };
  
  const displayRoom = room || dummyRoom;
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="container mx-auto px-4 py-8 flex justify-center items-center">
          <p>Loading room details...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="card">
            <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
            <p className="text-gray-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{displayRoom.name}</h1>
          <p className="text-gray-600">Room {displayRoom.number}, {displayRoom.building}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left panel - Calendar */}
          <div className="md:col-span-1">
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Select Date</h2>
              <Calendar
                onChange={handleDateChange}
                value={selectedDate}
                className="w-full border-0"
              />
            </div>
          </div>
          
          {/* Right panel - Bookings for selected date */}
          <div className="md:col-span-2">
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                  Bookings for {format(selectedDate, 'MMMM d, yyyy')}
                </h2>
                <button 
                  onClick={openBookingModal}
                  className="btn-primary"
                >
                  Book Now
                </button>
              </div>
              
              {bookings.length === 0 ? (
                <p className="text-gray-500">No bookings for this date.</p>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div 
                      key={booking._id} 
                      className="border rounded-md p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{booking.title}</h3>
                          <p className="text-gray-600 text-sm">
                            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                          </p>
                          <p className="text-gray-600 text-sm">
                            Booked by: {booking.user.name}
                          </p>
                        </div>
                        <div>
                          <span className={`
                            px-2 py-1 text-xs rounded-full 
                            ${booking.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                            ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${booking.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                          `}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Booking Modal */}
      {isBookingModalOpen && (
        <BookingModal
          roomId={roomId as string}
          roomName={displayRoom.name}
          selectedDate={selectedDate}
          onClose={closeBookingModal}
          onBookingComplete={() => {
            closeBookingModal();
            fetchBookingsForDate(selectedDate);
          }}
        />
      )}
    </div>
  );
} 