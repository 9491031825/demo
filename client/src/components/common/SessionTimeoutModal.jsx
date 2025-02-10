import React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../services/axios';

export default function SessionTimeoutModal({ isOpen, onClose, countdown }) {
  const navigate = useNavigate();

  const handleLogin = () => {
    // Clear all storage and auth headers
    localStorage.clear();
    delete axios.defaults.headers.common['Authorization'];
    
    onClose();
    navigate('/login');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Session Expired</h3>
          <div className="mt-2 px-7 py-3">
            <p className="text-sm text-gray-500">
              Your session has expired due to inactivity. You will be redirected to login page in {countdown} seconds.
            </p>
          </div>
          <div className="items-center px-4 py-3">
            <button
              onClick={handleLogin}
              className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Login Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}