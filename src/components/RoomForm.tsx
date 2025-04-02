'use client';

import { useState, useEffect } from 'react';

interface RoomFeature {
  id: string;
  name: string;
}

interface Room {
  _id?: string;
  name: string;
  number: string;
  building: string;
  capacity: number;
  features: string[];
  description?: string;
}

interface RoomFormProps {
  room?: Room;
  onSubmit: (roomData: any) => Promise<void>;
  isLoading: boolean;
  error?: string;
}

export default function RoomForm({ room, onSubmit, isLoading, error }: RoomFormProps) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [building, setBuilding] = useState('');
  const [capacity, setCapacity] = useState(30);
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [validationError, setValidationError] = useState('');
  
  const isEditing = !!room;

  // Common features for classrooms
  const availableFeatures: RoomFeature[] = [
    { id: 'projector', name: 'Projector' },
    { id: 'whiteboard', name: 'Whiteboard' },
    { id: 'computer', name: 'Computer' },
    { id: 'smartboard', name: 'Smart Board' },
    { id: 'audio_system', name: 'Audio System' },
    { id: 'wheelchair_accessible', name: 'Wheelchair Accessible' },
    { id: 'video_conferencing', name: 'Video Conferencing' },
    { id: 'power_outlets', name: 'Power Outlets' },
    { id: 'lab_equipment', name: 'Lab Equipment' },
  ];

  useEffect(() => {
    if (room) {
      setName(room.name || '');
      setNumber(room.number || '');
      setBuilding(room.building || '');
      setCapacity(room.capacity || 30);
      setDescription(room.description || '');
      setFeatures(room.features || []);
    }
  }, [room]);

  const validateForm = () => {
    setValidationError('');

    if (!name.trim()) {
      setValidationError('Room name is required');
      return false;
    }

    if (!number.trim()) {
      setValidationError('Room number is required');
      return false;
    }

    if (!building.trim()) {
      setValidationError('Building name is required');
      return false;
    }

    if (capacity <= 0) {
      setValidationError('Capacity must be greater than 0');
      return false;
    }

    return true;
  };

  const handleFeatureToggle = (featureId: string) => {
    if (features.includes(featureId)) {
      setFeatures(features.filter(id => id !== featureId));
    } else {
      setFeatures([...features, featureId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const roomData = {
      name,
      number,
      building,
      capacity,
      features,
      description,
    };
    
    if (isEditing && room?._id) {
      // Include the room ID for editing
      Object.assign(roomData, { id: room._id });
    }
    
    await onSubmit(roomData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(error || validationError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error || validationError}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="form-label">Room Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
            placeholder="e.g. Computer Lab"
            disabled={isLoading}
            required
          />
        </div>
        
        <div>
          <label htmlFor="number" className="form-label">Room Number</label>
          <input
            id="number"
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="form-input"
            placeholder="e.g. 101"
            disabled={isLoading}
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="building" className="form-label">Building</label>
          <input
            id="building"
            type="text"
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            className="form-input"
            placeholder="e.g. Science Building"
            disabled={isLoading}
            required
          />
        </div>
        
        <div>
          <label htmlFor="capacity" className="form-label">Capacity</label>
          <input
            id="capacity"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
            className="form-input"
            min="1"
            disabled={isLoading}
            required
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="description" className="form-label">Description (Optional)</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="form-input h-24"
          placeholder="Additional details about this room"
          disabled={isLoading}
        />
      </div>
      
      <div>
        <label className="form-label block mb-2">Features</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {availableFeatures.map((feature) => (
            <div key={feature.id} className="flex items-center">
              <input
                type="checkbox"
                id={`feature-${feature.id}`}
                checked={features.includes(feature.id)}
                onChange={() => handleFeatureToggle(feature.id)}
                className="mr-2 h-4 w-4"
                disabled={isLoading}
              />
              <label htmlFor={`feature-${feature.id}`} className="text-sm text-gray-700">
                {feature.name}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="pt-4">
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : isEditing ? 'Update Room' : 'Create Room'}
        </button>
      </div>
    </form>
  );
} 