import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerSearch from './CustomerSearch';
import NewCustomerForm from './NewCustomerForm';
import Modal from '../common/Modal';
import axios from '../../services/axios';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Verify token validity
        const response = await axios.get('/api/auth/verify/');
        if (!response.data.isValid) {
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        navigate('/login');
      }
    };

    verifyAuth();
  }, [navigate]);

  const handleLogout = () => {
    // Clear all tokens and auth data
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    
    // Remove Authorization header
    delete axios.defaults.headers.common['Authorization'];
    
    // Redirect to login page
    navigate('/login');
  };


  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="space-x-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            Add New Customer
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
          <button
            onClick={() => navigate('/transactions/history')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            View All Transactions
          </button>
        </div>
      </div>
      
      <div className="w-full">
        <CustomerSearch />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Customer"
      >
        <NewCustomerForm onSuccess={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
}