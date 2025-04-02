import NextAuth from 'next-auth';
import { authOptions } from './config';

// Create the handler
const handler = NextAuth(authOptions);

// Export the handler
export { handler as GET, handler as POST }; 