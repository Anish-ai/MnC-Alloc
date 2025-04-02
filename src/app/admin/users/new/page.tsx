'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {AdminHeader} from '@/components/AdminHeader';
import UserForm from '@/components/UserForm';

export default function NewUserPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (userData: any) => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      // Redirect to users list on success
      router.push('/admin/users');
      router.refresh(); // Refresh the page to get updated data
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the user');
      console.error('User creation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <AdminHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Add New User</h1>
          <Link
            href="/admin/users"
            className="btn-secondary"
          >
            Cancel
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
          <UserForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </main>
    </div>
  );
} 