import 'next-auth';
import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'professor' | 'admin';
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: 'professor' | 'admin';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'professor' | 'admin';
  }
} 