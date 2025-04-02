import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">College Room Booking System</h1>
          <div className="space-x-4">
            <Link href="/auth/login" className="btn-primary">
              Login
            </Link>
            <Link href="/auth/register" className="btn-secondary">
              Register
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold text-gray-800 mb-6">Efficient Classroom Booking</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
              A streamlined platform for professors to book classrooms and for administrators to manage room availability.
            </p>
            <Link href="/auth/register" className="btn-primary text-lg px-8 py-3">
              Get Started
            </Link>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="card text-center">
                <div className="text-4xl text-primary mb-4">📆</div>
                <h3 className="text-xl font-semibold mb-3">Easy Room Booking</h3>
                <p className="text-gray-600">
                  Book rooms with just a few clicks. Select dates, times, and repetition patterns.
                </p>
              </div>
              
              <div className="card text-center">
                <div className="text-4xl text-primary mb-4">👩‍🏫</div>
                <h3 className="text-xl font-semibold mb-3">Professor Dashboard</h3>
                <p className="text-gray-600">
                  View room availability and manage your bookings from a user-friendly dashboard.
                </p>
              </div>
              
              <div className="card text-center">
                <div className="text-4xl text-primary mb-4">👨‍💼</div>
                <h3 className="text-xl font-semibold mb-3">Admin Controls</h3>
                <p className="text-gray-600">
                  Administrators can manage users, rooms, and booking requests with powerful tools.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} College Room Booking System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
