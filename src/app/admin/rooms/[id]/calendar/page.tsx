'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AdminHeader } from '@/components/AdminHeader';
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import AdminBookingModal from '@/components/AdminBookingModal';

interface Room {
  _id: string;
  name: string;
  number: string;
  building: string;
}

interface Booking {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  user: {
    name: string;
  };
  description?: string;
  repeatType?: 'none' | 'daily' | 'weekly';
  repeatEndDate?: string;
  status: 'approved' | 'pending' | 'rejected'; // Added status property
}

// Generate time slots for the day (8 AM to 9 PM)
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 21; hour++) {
    slots.push({
      hour,
      label: format(new Date().setHours(hour, 0, 0, 0), 'h:00 a')
    });
  }
  return slots;
};

const timeSlots = generateTimeSlots();

export default function RoomCalendarPage() {
  const { id } = useParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<{date: Date, hour: number} | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Fetch room details
  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        setLoading(true);
        
        const roomResponse = await fetch(`/api/rooms/${id}`);
        if (!roomResponse.ok) {
          throw new Error('Failed to fetch room details');
        }
        
        const roomData = await roomResponse.json();
        setRoom(roomData);
        
        // Fetch bookings for the current week
        await fetchWeeklyBookings(currentWeek);
      } catch (err: any) {
        console.error('Error fetching room details:', err);
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchRoomDetails();
    }
  }, [id, currentWeek]);
  
  // Fetch bookings for the whole week
  const fetchWeeklyBookings = async (weekStartDate: Date) => {
    try {
      const start = startOfWeek(weekStartDate, { weekStartsOn: 1 }); // Start on Monday
      const end = endOfWeek(weekStartDate, { weekStartsOn: 1 }); // End on Sunday
      
      const response = await fetch(`/api/admin/bookings/weekly?roomId=${id}&start=${format(start, 'yyyy-MM-dd')}&end=${format(end, 'yyyy-MM-dd')}&status=approved`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      
      const data = await response.json();
      setBookings(data);
    } catch (err: any) {
      console.error('Error fetching weekly bookings:', err);
      // We don't set the main error state here to avoid disrupting the UI
    }
  };
  
  // Move to previous week
  const goToPreviousWeek = () => {
    const prevWeek = new Date(currentWeek);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setCurrentWeek(prevWeek);
  };
  
  // Move to next week
  const goToNextWeek = () => {
    const nextWeek = new Date(currentWeek);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeek(nextWeek);
  };
  // Generate the dates for the current week (Monday to Sunday)
  const weekDates: Date[] = [];
  
  
  const startDate = startOfWeek(currentWeek, { weekStartsOn: 1 });
  
  for (let i = 0; i < 7; i++) {
    const date = addDays(startDate, i);
    weekDates.push(date);
  }
  
  // Generate updated week dates (each day is 1 day ahead of weekDates)
  const updatedWeekDates: Date[] = weekDates.map(date => addDays(date, -1));
  
  const getBookingForSlot = (date: Date, hour: number) => {
    const matchingBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      const bookingStartHour = new Date(booking.startTime).getHours();
      const bookingEndHour = new Date(booking.endTime).getHours();
      
      return (
        isSameDay(bookingDate, date) && 
        (hour >= bookingStartHour && hour < bookingEndHour) &&
        booking.status === 'approved' // Only show approved bookings
      );
    });
    
    return matchingBookings.length > 0 ? matchingBookings[0] : null;
  };
  
  // Handle booking deletion
  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete booking');
      }

      // Refresh bookings
      await fetchWeeklyBookings(currentWeek);
    } catch (err: any) {
      console.error('Error deleting booking:', err);
      alert(err.message || 'Failed to delete booking');
    }
  };
  
  // Handle slot click for booking
  const handleSlotClick = (date: Date, hour: number, booking?: Booking) => {
    if (booking) {
      setSelectedBooking(booking);
    } else {
      setSelectedSlot({ date, hour });
    }
  };
  
  // Handle modal close
  const handleModalClose = () => {
    setSelectedSlot(null);
    setSelectedBooking(null);
  };
  
  // Handle booking completion
  const handleBookingComplete = () => {
    setSelectedSlot(null);
    fetchWeeklyBookings(currentWeek);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <div className="container mx-auto px-4 py-8 flex justify-center items-center">
          <p>Loading calendar...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
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
      <AdminHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{room?.name} Calendar</h1>
          <p className="text-gray-600">Room {room?.number}, {room?.building}</p>
        </div>
        
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={goToPreviousWeek}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Previous Week
          </button>
          
          <h2 className="text-lg font-medium">
            {format(weekDates[0], 'MMMM d')} - {format(weekDates[6], 'MMMM d, yyyy')}
          </h2>
          
          <button 
            onClick={goToNextWeek}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Next Week
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Calendar header */}
            <div className="grid grid-cols-8 border-b border-gray-200">
              <div className="py-2 px-4 font-medium text-gray-500"></div>
              {updatedWeekDates.map((date, index) => (
                <div key={index} className="py-2 px-4 text-center font-medium">
                  <div>{format(date, 'EEE')}</div>
                  <div className="text-gray-500">{format(date, 'MMM d')}</div>
                </div>
              ))}
            </div>
            
            {/* Time slots */}
            {timeSlots.map((slot) => (
              <div key={slot.hour} className="grid grid-cols-8 border-b border-gray-200">
                <div className="py-4 px-4 font-medium text-gray-500">
                  {slot.label}
                </div>
                
                {weekDates.map((date, index) => {
                  const booking = getBookingForSlot(date, slot.hour);
                  
                  return (
                    <div 
                      key={index} 
                      className={`
                        py-4 px-1 border-l border-gray-200 
                        ${booking ? 'bg-blue-50 cursor-pointer hover:bg-blue-100' : 'hover:bg-gray-50 cursor-pointer'}
                      `}
                      onClick={() => handleSlotClick(date, slot.hour, booking || undefined)}
                    >
                      {booking ? (
                        <div className="h-full p-1 relative">
                          <div className="bg-blue-100 text-blue-800 p-2 rounded text-sm h-full">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBooking(booking._id);
                              }}
                              className="absolute top-1 right-1 text-red-600 hover:text-red-800"
                              title="Delete booking"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <p className="font-medium truncate">{booking.title}</p>
                            <p className="text-xs truncate">
                              {format(new Date(booking.startTime), 'h:mm a')} - {format(new Date(booking.endTime), 'h:mm a')}
                            </p>
                            <p className="text-xs truncate">{booking.user.name}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </main>
      
      {/* Booking Modal */}
      {(selectedSlot || selectedBooking) && (
        <AdminBookingModal
          roomId={id as string}
          roomName={room?.name || ''}
          selectedDate={selectedSlot?.date || new Date(selectedBooking!.date)}
          selectedHour={selectedSlot?.hour || new Date(selectedBooking!.startTime).getHours()}
          onClose={handleModalClose}
          onBookingComplete={handleBookingComplete}
          existingBooking={selectedBooking ? {
            _id: selectedBooking._id,
            title: selectedBooking.title,
            description: selectedBooking.description || '', // Ensure description is never undefined
            startTime: new Date(selectedBooking.startTime),
            endTime: new Date(selectedBooking.endTime),
            repeatType: selectedBooking.repeatType,
            repeatEndDate: selectedBooking.repeatEndDate ? new Date(selectedBooking.repeatEndDate) : undefined
          } : undefined}
        />
      )}
    </div>
  );
} 