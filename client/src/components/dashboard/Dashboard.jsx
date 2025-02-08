import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerSearch from './CustomerSearch';
import NewCustomerForm from './NewCustomerForm';
import axios from '../../services/axios';

export default function Dashboard() {
  const navigate = useNavigate();

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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CustomerSearch />
        <NewCustomerForm />
      </div>
    </div>
  );
}