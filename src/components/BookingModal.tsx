'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface BookingModalProps {
  roomId: string;
  roomName: string;
  selectedDate: Date;
  onClose: () => void;
  onBookingComplete: () => void;
}

interface WeeklySchedule {
  [key: string]: {
    startTime: Date;
    endTime: Date;
    enabled: boolean;
  };
}

export default function BookingModal({
  roomId,
  roomName,
  selectedDate,
  onClose,
  onBookingComplete,
}: BookingModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(() => {
    const defaultStart = new Date(selectedDate);
    defaultStart.setHours(8, 0, 0, 0);
    return defaultStart;
  });
  const [endTime, setEndTime] = useState<Date | null>(() => {
    const defaultEnd = new Date(selectedDate);
    defaultEnd.setHours(9, 0, 0, 0);
    return defaultEnd;
  });
  const [repeatType, setRepeatType] = useState<'none' | 'daily' | 'weekly'>('none');
  const [repeatEndDate, setRepeatEndDate] = useState<Date | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(() => {
    // Create default times with 8 AM and 9 AM
    const defaultStart = new Date();
    defaultStart.setHours(8, 0, 0, 0);
    
    const defaultEnd = new Date();
    defaultEnd.setHours(9, 0, 0, 0);
    
    return {
      monday: { startTime: new Date(defaultStart), endTime: new Date(defaultEnd), enabled: false },
      tuesday: { startTime: new Date(defaultStart), endTime: new Date(defaultEnd), enabled: false },
      wednesday: { startTime: new Date(defaultStart), endTime: new Date(defaultEnd), enabled: false },
      thursday: { startTime: new Date(defaultStart), endTime: new Date(defaultEnd), enabled: false },
      friday: { startTime: new Date(defaultStart), endTime: new Date(defaultEnd), enabled: false },
      saturday: { startTime: new Date(defaultStart), endTime: new Date(defaultEnd), enabled: false },
      sunday: { startTime: new Date(defaultStart), endTime: new Date(defaultEnd), enabled: false }
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Generate time options
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 8; hour <= 21; hour++) {
      const time = new Date();
      time.setHours(hour, 0, 0, 0);
      options.push({
        value: time.toISOString(),
        label: format(time, 'h:mm a')
      });
    }
    return options;
  };
  
  const timeOptions = generateTimeOptions();

  const handleDayToggle = (day: string) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled
      }
    }));
  };

  const handleDayTimeChange = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: new Date(value)
      }
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !startTime || !endTime) {
      setError('Please fill in all required fields');
      return;
    }
  
    try {
      setLoading(true);
      setError('');
  
      // First check availability
      const checkResponse = await fetch('/api/bookings/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: roomId,
          startTime,
          endTime,
          date: selectedDate,
          repeatType,
          repeatEndDate: repeatType !== 'none' ? repeatEndDate : undefined,
          weeklySchedule: repeatType === 'weekly' ? weeklySchedule : undefined
        }),
      });
  
      if (!checkResponse.ok) {
        const errorData = await checkResponse.json();
        throw new Error(errorData.message || 'Availability check failed');
      }
  
      const checkData = await checkResponse.json();
      if (checkData.conflicts.length > 0) {
        const conflictDates = checkData.conflicts
          .map((d: string) => format(new Date(d), 'MMM d'))
          .join(', ');
        throw new Error(`Conflicts found on: ${conflictDates}`);
      }
  
      // Proceed with booking creation
      const createResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: roomId,
          title,
          description,
          startTime,
          endTime,
          date: selectedDate,
          repeatType,
          repeatEndDate: repeatType !== 'none' ? repeatEndDate : undefined,
          weeklySchedule: repeatType === 'weekly' ? weeklySchedule : undefined
        }),
      });
  
      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.message || 'Failed to create booking');
      }
  
      onBookingComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the booking');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Book {roomName}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="bookingDate" className="form-label">Date</label>
              <input
                id="bookingDate"
                type="text"
                className="form-input bg-gray-100"
                value={format(selectedDate, 'MMMM d, yyyy')}
                disabled
              />
            </div>
            
            <div>
              <label htmlFor="title" className="form-label">Title</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input"
                placeholder="Class name or event title"
                disabled={loading}
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="form-label">Description (Optional)</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input h-20"
                placeholder="Additional details about this booking"
                disabled={loading}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startTime" className="form-label">Start Time</label>
                <select
                  id="startTime"
                  value={startTime?.toISOString() || ''}
                  onChange={(e) => setStartTime(new Date(e.target.value))}
                  className="form-input"
                  disabled={loading}
                  required
                >
                  <option value="">Select time</option>
                  {timeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="endTime" className="form-label">End Time</label>
                <select
                  id="endTime"
                  value={endTime?.toISOString() || ''}
                  onChange={(e) => setEndTime(new Date(e.target.value))}
                  className="form-input"
                  disabled={loading}
                  required
                >
                  <option value="">Select time</option>
                  {timeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="repeatType" className="form-label">Repeat</label>
              <select
                id="repeatType"
                value={repeatType}
                onChange={(e) => setRepeatType(e.target.value as 'none' | 'daily' | 'weekly')}
                className="form-input"
                disabled={loading}
              >
                <option value="none">Do not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            
            {repeatType !== 'none' && (
              <div>
                <label htmlFor="repeatEndDate" className="form-label">Repeat Until</label>
                <input
                  id="repeatEndDate"
                  type="date"
                  value={repeatEndDate ? format(repeatEndDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setRepeatEndDate(e.target.value ? new Date(e.target.value) : null)}
                  className="form-input"
                  min={format(new Date(selectedDate.getTime() + 86400000), 'yyyy-MM-dd')}
                  disabled={loading}
                  required
                />
              </div>
            )}

            {repeatType === 'weekly' && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Weekly Schedule</h3>
                {Object.entries(weeklySchedule).map(([day, schedule]) => (
                  <div key={day} className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={schedule.enabled}
                        onChange={() => handleDayToggle(day)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={loading}
                      />
                      <span className="text-sm font-medium capitalize">{day}</span>
                    </label>
                    
                    {schedule.enabled && (
                      <div className="flex space-x-4">
                        <select
                          value={schedule.startTime.toISOString()}
                          onChange={(e) => handleDayTimeChange(day, 'startTime', e.target.value)}
                          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          disabled={loading}
                        >
                          {timeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-gray-500">to</span>
                        <select
                          value={schedule.endTime.toISOString()}
                          onChange={(e) => handleDayTimeChange(day, 'endTime', e.target.value)}
                          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          disabled={loading}
                        >
                          {timeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 