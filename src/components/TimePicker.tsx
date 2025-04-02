'use client';

import React from 'react';
import { format } from 'date-fns';

interface TimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  disabled?: boolean;
  className?: string;
}

const TimePicker: React.FC<TimePickerProps> = ({ 
  value, 
  onChange, 
  disabled = false,
  className = ''
}) => {
  // Generate time options for the dropdown (8am to 9pm)
  const generateTimeOptions = () => {
    const options = [];
    const baseDate = new Date(value);
    
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

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDate = new Date(e.target.value);
    onChange(selectedDate);
  };

  return (
    <select
      value={value.toISOString()}
      onChange={handleChange}
      disabled={disabled}
      className={`block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    >
      {timeOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default TimePicker; 