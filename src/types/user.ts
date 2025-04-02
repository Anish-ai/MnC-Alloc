export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'professor';
  department?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface UserWithPassword extends User {
  password: string;
} 