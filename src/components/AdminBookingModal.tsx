'use client';

import { useState, useEffect } from 'react';
import { format, addDays, addWeeks } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Modal from './Modal';
import TimePicker from './TimePicker';

interface AdminBookingModalProps {
  roomId: string;
  roomName: string;
  selectedDate: Date;
  selectedHour: number;
  onClose: () => void;
  onBookingComplete: () => void;
  existingBooking?: {
    _id: string;
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    repeatType?: 'none' | 'daily' | 'weekly';
    repeatEndDate?: Date;
    weeklySchedule?: {
      [key: string]: {
        startTime: Date;
        endTime: Date;
      };
    };
  };
}

interface WeeklySchedule {
  [key: string]: {
    startTime: Date;
    endTime: Date;
    enabled: boolean;
  };
}

export default function AdminBookingModal({
  roomId,
  onClose,
  onBookingComplete,
  existingBooking,
  selectedDate
}: AdminBookingModalProps) {
  const [title, setTitle] = useState(existingBooking?.title || '');
  const [description, setDescription] = useState(existingBooking?.description || '');
  const [startTime, setStartTime] = useState<Date>(() => {
    if (existingBooking?.startTime) {
      return existingBooking.startTime;
    }
    const defaultStart = new Date(selectedDate);
    defaultStart.setHours(8, 0, 0, 0);
    return defaultStart;
  });
  
  const [endTime, setEndTime] = useState<Date>(() => {
    if (existingBooking?.endTime) {
      return existingBooking.endTime;
    }
    const defaultEnd = new Date(selectedDate);
    defaultEnd.setHours(9, 0, 0, 0);
    return defaultEnd;
  });
  
  const [repeatType, setRepeatType] = useState<'none' | 'daily' | 'weekly'>(
    existingBooking?.repeatType || 'none'
  );
  const [repeatEndDate, setRepeatEndDate] = useState<Date | undefined>(
    existingBooking?.repeatEndDate
  );
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(() => {
    if (existingBooking?.weeklySchedule) {
      // Ensure each day has the enabled property
      const schedule: WeeklySchedule = {} as WeeklySchedule;
      for (const [day, times] of Object.entries(existingBooking.weeklySchedule)) {
        schedule[day] = {
          startTime: times.startTime,
          endTime: times.endTime,
          enabled: true
        };
      }
      console.log(schedule);
      return schedule;
    }
    console.log(new Date());
    
    // Create fixed date objects with 8 AM and 9 AM
    const defaultStart = new Date(selectedDate);
    defaultStart.setHours(8, 0, 0, 0);
    
    const defaultEnd = new Date(selectedDate);
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

  // Generate time options for the dropdown
  const generateTimeOptions = () => {
    const options = [];
    const baseDate = new Date(selectedDate);
    for (let hour = 8; hour <= 21; hour++) {
      const time = new Date(baseDate);
      time.setHours(hour, 0, 0, 0);
      options.push({
        value: time.toISOString(),
        label: format(time, 'h:mm a')
      });
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Log current time values for debugging
      console.log("Submitting with times:", {
        repeatType,
        startTime,
        endTime,
        repeatEndDate,
        startHour: startTime.getHours(),
        endHour: endTime.getHours()
      });
      
      // Simple validation - just check if end time is after start time
      if (repeatType === 'weekly') {
        // For weekly schedule, validate each enabled day's times
        let hasEnabledDay = false;
        for (const [day, schedule] of Object.entries(weeklySchedule)) {
          if (schedule.enabled) {
            hasEnabledDay = true;
            
            // Simple hour comparison - get the hour value directly from the date objects
            const startHour = schedule.startTime.getHours();
            const endHour = schedule.endTime.getHours();
            
            if (endHour <= startHour) {
              throw new Error(`End time must be after start time for ${day}`);
            }
          }
        }
        if (!hasEnabledDay) {
          throw new Error('Please enable at least one day in the weekly schedule');
        }
      } else {
        // For non-weekly bookings (none or daily), validate main booking times
        // Simple hour comparison
        const startHour = startTime.getHours();
        const endHour = endTime.getHours();
        
        if (endHour <= startHour) {
          throw new Error('End time must be after start time');
        }
        
        // Additional check for daily repeating bookings
        if (repeatType === 'daily' && !repeatEndDate) {
          console.log("Missing end date for daily booking");
          throw new Error('Please select an end date for daily repeating bookings');
        }
      }

      const requestData = {
        room: roomId,
        title,
        description,
        date: selectedDate,
        startTime: repeatType === 'weekly' ? undefined : startTime,
        endTime: repeatType === 'weekly' ? undefined : endTime,
        repeatType,
        repeatEndDate: repeatEndDate ? new Date(repeatEndDate) : undefined,
        weeklySchedule: repeatType === 'weekly' ? weeklySchedule : undefined
      };
      
      // Log the request payload
      console.log("Request payload:", requestData);

      const url = existingBooking
        ? `/api/admin/bookings/${existingBooking._id}`
        : '/api/admin/bookings';
      
      const method = existingBooking ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save booking');
      }

      onBookingComplete();
      onClose();
    } catch (err: any) {
      console.error('Error saving booking:', err);
      alert(err.message || 'Failed to save booking');
    }
  };

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
    // Preserve the selectedDate when setting weekly schedule times
    const selectedTimeValue = new Date(value);
    const newTime = new Date(selectedDate);
    newTime.setHours(selectedTimeValue.getHours(), selectedTimeValue.getMinutes(), 0, 0);
    
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: newTime
      }
    }));
    console.log(weeklySchedule);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {existingBooking ? 'Edit Booking' : 'Create Booking'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Repeat</label>
              <select
                value={repeatType}
                onChange={(e) => setRepeatType(e.target.value as 'none' | 'daily' | 'weekly')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="none">No Repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            {repeatType !== 'none' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  value={repeatEndDate ? format(repeatEndDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => {
                    const selectedDate = e.target.value ? new Date(e.target.value) : undefined;
                    // Ensure the date is set to end of day to include the full end date
                    if (selectedDate) {
                      selectedDate.setHours(23, 59, 59, 999);
                    }
                    console.log("Setting end date:", selectedDate);
                    setRepeatEndDate(selectedDate);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min={format(addDays(selectedDate, 1), 'yyyy-MM-dd')}
                  required
                />
              </div>
            )}

            {repeatType !== 'weekly' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <select
                    value={startTime.toISOString()}
                    onChange={(e) => {
                      const selectedTimeValue = new Date(e.target.value);
                      const newTime = new Date(selectedDate);
                      newTime.setHours(selectedTimeValue.getHours(), selectedTimeValue.getMinutes(), 0, 0);
                      console.log("Selected start time:", newTime);
                      setStartTime(newTime);
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    {timeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <select
                    value={endTime.toISOString()}
                    onChange={(e) => {
                      const selectedTimeValue = new Date(e.target.value);
                      const newTime = new Date(selectedDate);
                      newTime.setHours(selectedTimeValue.getHours(), selectedTimeValue.getMinutes(), 0, 0);
                      console.log("Selected end time:", newTime);
                      setEndTime(newTime);
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    {timeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
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
                      />
                      <span className="text-sm font-medium capitalize">{day}</span>
                    </label>
                    
                    {schedule.enabled && (
                      <div className="flex space-x-4">
                        <select
                          value={schedule.startTime.toISOString()}
                          onChange={(e) => handleDayTimeChange(day, 'startTime', e.target.value)}
                          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {existingBooking ? 'Update Booking' : 'Create Booking'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 