'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export function DashboardHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link href="/dashboard" className="font-bold text-xl text-primary">
              Room Booking
            </Link>
            
            <nav className="hidden md:flex ml-8 space-x-6">
              <Link 
                href="/dashboard" 
                className={`${isActive('/dashboard') && !isActive('/dashboard/rooms') ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary'}`}
              >
                Dashboard
              </Link>
              <Link 
                href="/dashboard/rooms" 
                className={`${isActive('/dashboard/rooms') ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary'}`}
              >
                Rooms
              </Link>
              <Link 
                href="/dashboard/bookings" 
                className={`${isActive('/dashboard/bookings') ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary'}`}
              >
                My Bookings
              </Link>
            </nav>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 focus:outline-none"
            >
              <span className="text-sm">{session?.user?.name}</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-5 w-5 text-gray-500 transform transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 py-2 bg-white rounded-md shadow-lg z-10">
                <div className="px-4 py-2 text-sm text-gray-500 border-b">
                  {session?.user?.email}
                </div>
                
                <Link 
                  href="/dashboard/profile" 
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setDropdownOpen(false)}
                >
                  Profile
                </Link>
                
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile navigation */}
      <div className="md:hidden border-t">
        <div className="container mx-auto px-4">
          <nav className="flex justify-between py-3">
            <Link 
              href="/dashboard" 
              className={`text-sm ${isActive('/dashboard') && !isActive('/dashboard/rooms') ? 'text-primary font-medium' : 'text-gray-600'}`}
            >
              Dashboard
            </Link>
            <Link 
              href="/dashboard/rooms" 
              className={`text-sm ${isActive('/dashboard/rooms') ? 'text-primary font-medium' : 'text-gray-600'}`}
            >
              Rooms
            </Link>
            <Link 
              href="/dashboard/bookings" 
              className={`text-sm ${isActive('/dashboard/bookings') ? 'text-primary font-medium' : 'text-gray-600'}`}
            >
              My Bookings
            </Link>
            <Link 
              href="/dashboard/profile" 
              className={`text-sm ${isActive('/dashboard/profile') ? 'text-primary font-medium' : 'text-gray-600'}`}
            >
              Profile
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
} 