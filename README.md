# Room Booking System

A modern web application for managing room bookings in educational institutions. This system allows professors to book rooms for classes or events and administrators to manage rooms, bookings, and users.

## Features

### For Professors
- Browse available rooms
- View room details and availability
- Create single and recurring bookings
- Manage booking requests (view, cancel)
- Filter bookings by status (pending, approved, rejected)

### For Administrators
- Comprehensive dashboard with booking statistics
- Manage rooms (add, edit, delete)
- Approve or reject booking requests
- Create bookings on behalf of professors
- Create and manage user accounts
- View booking calendar by room

## Technology Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **Date Handling**: date-fns
- **Form Components**: react-datepicker, react-calendar

## Getting Started

### Prerequisites

- Node.js 18.0 or higher
- MongoDB database

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd room-booking
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with the following variables:
   ```
   # MongoDB Connection
   MONGODB_URI=your_mongodb_connection_string
   
   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   
   # Optional email configuration for notifications
   EMAIL_SERVER_HOST=smtp.example.com
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER=user@example.com
   EMAIL_SERVER_PASSWORD=password
   EMAIL_FROM=noreply@example.com
   ```

4. Run the development server
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
room-booking/
├── public/              # Static files
├── src/
│   ├── app/             # Next.js app directory
│   │   ├── admin/       # Admin dashboard pages
│   │   ├── api/         # API routes
│   │   ├── auth/        # Authentication pages
│   │   ├── dashboard/   # Professor dashboard pages
│   │   └── ...
│   ├── components/      # Reusable React components
│   ├── lib/             # Utility functions and configurations
│   ├── models/          # Mongoose models
│   └── types/           # TypeScript type definitions
├── .env.local           # Environment variables (not in repo)
├── package.json         # Project dependencies
└── README.md            # This file
```

## Usage Guide

### Authentication

- The system supports role-based access:
  - Professors can view rooms and create booking requests
  - Administrators can manage all aspects of the system

### Room Booking

1. Log in with your credentials
2. Browse available rooms from the dashboard
3. Select a room to view its details
4. Choose a date and time for your booking
5. Fill in booking details (title, description)
6. For recurring bookings, select the repeat type and end date
7. Submit your booking request

### Admin Management

1. Log in with administrator credentials
2. Use the admin dashboard to:
   - View booking statistics
   - Manage rooms, users, and bookings
   - Approve or reject booking requests
   - Create bookings on behalf of professors

## API Endpoints

The application provides the following API endpoints:

### Authentication
- `POST /api/auth/[...nextauth]` - Authentication endpoints

### Bookings
- `GET /api/bookings` - Get user's bookings
- `POST /api/bookings` - Create a new booking
- `DELETE /api/bookings/:id` - Cancel a booking

### Rooms
- `GET /api/rooms` - Get all rooms
- `GET /api/rooms/:id` - Get room details

### Admin Endpoints
- `GET /api/admin/bookings` - Get all bookings
- `POST /api/admin/bookings` - Create a booking (admin)
- `PATCH /api/admin/bookings/:id` - Update booking status
- `DELETE /api/admin/bookings` - Delete a booking
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create a user
- `PUT /api/admin/users/:id` - Update a user
- `DELETE /api/admin/users` - Delete a user

## License

This project is licensed under the MIT License.

## Credits

Developed by [Your Organization/Name]