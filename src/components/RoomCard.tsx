'use client';

import Link from 'next/link';

interface Room {
  _id: string;
  name: string;
  number: string;
  building: string;
  capacity: number;
  features?: string[];
}

interface RoomCardProps {
  room: Room;
  href: string;
}

export default function RoomCard({ room, href }: RoomCardProps) {
  return (
    <Link href={href} className="block">
      <div className="card hover:shadow-lg transition-shadow">
        <h3 className="text-lg font-semibold mb-2">{room.name}</h3>
        <div className="text-gray-600 mb-4">
          <p>Room {room.number}, {room.building}</p>
          <p>Capacity: {room.capacity} people</p>
        </div>
        
        {room.features && room.features.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-gray-500 mb-1">Features:</p>
            <div className="flex flex-wrap gap-1">
              {room.features.map((feature, index) => (
                <span 
                  key={index} 
                  className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-4 flex justify-end">
          <span className="text-primary text-sm font-medium">
            View availability →
          </span>
        </div>
      </div>
    </Link>
  );
} 