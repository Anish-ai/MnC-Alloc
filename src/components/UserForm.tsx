'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types/user';

interface UserFormProps {
  user?: User;
  onSubmit: (userData: any) => Promise<void>;
  isLoading: boolean;
  error?: string;
  mode?: 'create' | 'edit';
}

export default function UserForm({ user, onSubmit, isLoading, error }: UserFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('professor');
  const [department, setDepartment] = useState('');
  const [validationError, setValidationError] = useState('');
  
  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setRole(user.role || 'professor');
      setDepartment(user.department || '');
      // Don't set password in edit mode - it will be optional
    }
  }, [user]);

  const validateForm = () => {
    setValidationError('');

    if (!name.trim()) {
      setValidationError('Name is required');
      return false;
    }

    if (!email.trim()) {
      setValidationError('Email is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError('Please enter a valid email address');
      return false;
    }

    if (!isEditing && !password) {
      setValidationError('Password is required for new users');
      return false;
    }

    if (password && password.length < 6) {
      setValidationError('Password must be at least 6 characters long');
      return false;
    }

    if (password && password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const userData = {
      name,
      email,
      role,
      department,
    };
    
    if (isEditing) {
      // For editing, only include password if it was changed
      if (password) {
        Object.assign(userData, { password });
      }
      
      // Include the user ID
      Object.assign(userData, { id: user._id });
    } else {
      // For new users, always include password
      Object.assign(userData, { password });
    }
    
    await onSubmit(userData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(error || validationError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error || validationError}</span>
        </div>
      )}
      
      <div>
        <label htmlFor="name" className="form-label">Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="form-input"
          placeholder="Full Name"
          disabled={isLoading}
          required
        />
      </div>
      
      <div>
        <label htmlFor="email" className="form-label">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-input"
          placeholder="email@example.com"
          disabled={isLoading}
          required
        />
      </div>
      
      <div>
        <label htmlFor="password" className="form-label">
          {isEditing ? 'New Password (leave blank to keep current)' : 'Password'}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-input"
          placeholder={isEditing ? '••••••••' : 'Create password'}
          disabled={isLoading}
          required={!isEditing}
        />
      </div>
      
      <div>
        <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="form-input"
          placeholder="Confirm password"
          disabled={isLoading || (isEditing && !password)}
          required={!isEditing || (isEditing && !!password)}
        />
      </div>
      
      <div>
        <label htmlFor="role" className="form-label">Role</label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="form-input"
          disabled={isLoading}
        >
          <option value="professor">Professor</option>
          <option value="admin">Administrator</option>
        </select>
      </div>
      
      <div>
        <label htmlFor="department" className="form-label">Department (Optional)</label>
        <input
          id="department"
          type="text"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="form-input"
          placeholder="e.g. Computer Science"
          disabled={isLoading}
        />
      </div>
      
      <div className="pt-4">
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : isEditing ? 'Update User' : 'Create User'}
        </button>
      </div>
    </form>
  );
} 