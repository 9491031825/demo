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
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    delete axios.defaults.headers.common['Authorization'];
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
        <CustomerSearch 
          renderActions={(customer) => (
            <div className="space-x-2">
              <button
                onClick={() => navigate(`/transactions/stock/${customer.id}`)}
                className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                Add Stock
              </button>
              <button
                onClick={() => navigate(`/transactions/payment/${customer.id}`)}
                className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                Add Payment
              </button>
            </div>
          )}
        />
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