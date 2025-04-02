
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminHeader } from '@/components/AdminHeader';
import UserForm from '@/components/UserForm';
import { User } from '@/types/user';

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [originalUser, setOriginalUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch user data
  useEffect(() => {
    async function fetchUser() {
      try {
        setIsLoading(true);
        setError('');

        const response = await fetch(`/api/admin/users?id=${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch user');
        }

        // filter the data to get the user with the matching id
        const filteredData = data.filter((user: User) => user._id === id)[0];
        if (!filteredData) {
          throw new Error('User not found');
        }
        setUser(filteredData);
        setOriginalUser(filteredData); // Store the original user data
        console.log('Fetched user:', data);
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching the user');
        console.error('User fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      fetchUser();
    }
  }, [id]);

  const handleSubmit = async (formData: any) => {
    try {
      setIsSubmitting(true);
      setError('');

      // Merge formData with original data to preserve fields that weren't changed
      // Only include non-empty values from the form
      
      const mergedData = {
        id: id,
        name: formData.name || originalUser?.name,
        email: formData.email || originalUser?.email,
        role: formData.role || originalUser?.role,
        department: formData.department || originalUser?.department,
        // Only include password if it's provided and not empty
        ...(formData.password ? { password: formData.password } : {})
      };

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mergedData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      // Redirect to users list on success
      router.push('/admin/users');
      router.refresh(); // Refresh the page to get updated data
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating the user');
      console.error('User update error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <AdminHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Edit User</h1>
          <Link
            href="/admin/users"
            className="btn-secondary"
          >
            Cancel
          </Link>
        </div>
        
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading user data...</p>
          </div>
        ) : error && !user ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
            <p className="mt-2">
              <Link href="/admin/users" className="text-red-700 underline">
                Return to users list
              </Link>
            </p>
          </div>
        ) : user ? (
          <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
            <UserForm
              user={user}
              onSubmit={handleSubmit}
              isLoading={isSubmitting}
              error={error}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}