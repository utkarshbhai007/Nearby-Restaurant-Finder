import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, LogOut, User, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Navbar() {
  const { user, userType, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <MapPin className="h-6 w-6 text-indigo-600" />
              <span className="font-bold text-xl text-gray-900">RestaurantMap</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/about"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <Info className="h-5 w-5" />
              <span>About</span>
            </Link>
            
            {user ? (
              <>
                {userType === 'restaurant_owner' && (
                  <Link
                    to="/register-restaurant"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Register Restaurant
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                >
                  <User className="h-5 w-5" />
                  <span>Login</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}