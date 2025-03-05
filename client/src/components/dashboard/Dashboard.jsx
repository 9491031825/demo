import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerSearch from './CustomerSearch';
import NewCustomerForm from './NewCustomerForm';
import CustomerList from './CustomerList';
import Modal from '../common/Modal';
import axios from '../../services/axios';
import AddBankAccountForm from './AddBankAccountForm';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomerListOpen, setIsCustomerListOpen] = useState(false);
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const navigationItems = [
    { label: 'Customer Database', path: '/customers', icon: '📋' },
    { label: 'Add New Customer', onClick: () => setIsModalOpen(true), icon: '➕' },
    { label: 'View All Transactions', path: '/transactions/history', icon: '📊' },
    { label: 'Inventory Management', path: '/inventory', icon: '📦' },
    { label: 'Bulk Settlement', path: '/bulk-settlement', icon: '💰' },
    { label: 'Purchase Insights', path: '/insights/purchases', icon: '📈' },
    { label: 'Payment Insights', path: '/insights/payments', icon: '💵' },
    { label: 'Logout', onClick: handleLogout, icon: '🚪' },
  ];

  const renderNavigationItems = () => (
    <ul className="space-y-2">
      {navigationItems.map((item, index) => (
        <li key={index}>
          <button
            onClick={item.onClick || (() => navigate(item.path))}
            className="w-full text-left px-4 py-2 rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex h-screen">
      {/* Sidebar - visible on large screens */}
      <aside className="hidden lg:block w-64 bg-gray-800 text-white p-4">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        {renderNavigationItems()}
      </aside>

      {/* Hamburger menu - visible on mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-gray-800 text-white p-4 z-50">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white p-2"
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
        
        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-gray-800 p-4">
            {renderNavigationItems()}
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 lg:p-8 overflow-auto mt-16 lg:mt-0">
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
                <button
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setIsAddBankModalOpen(true);
                  }}
                  className="bg-purple-600 text-white px-3 py-1 rounded-md hover:bg-purple-700 transition-colors text-sm"
                >
                  Add Bank Account
                </button>
                <button
                  onClick={() => navigate(`/insights/purchases/${customer.id}`)}
                  className="bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 transition-colors text-sm"
                >
                  Purchase Insights
                </button>
                <button
                  onClick={() => navigate(`/insights/payments/${customer.id}`)}
                  className="bg-pink-600 text-white px-3 py-1 rounded-md hover:bg-pink-700 transition-colors text-sm"
                >
                  Payment Insights
                </button>
              </div>
            )}
          />
        </div>

        {/* Add quick access cards for insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Purchase Insights</h2>
            <p className="text-gray-600 mb-4">View detailed insights about purchases, including quality types, quantities, and amounts.</p>
            <button
              onClick={() => navigate('/insights/purchases')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              View Purchase Insights
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Payment Insights</h2>
            <p className="text-gray-600 mb-4">View detailed insights about payments, including payment types, amounts, and trends.</p>
            <button
              onClick={() => navigate('/insights/payments')}
              className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition-colors"
            >
              View Payment Insights
            </button>
          </div>
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add New Customer"
        >
          <NewCustomerForm onSuccess={() => setIsModalOpen(false)} />
        </Modal>

        <Modal
          isOpen={isCustomerListOpen}
          onClose={() => setIsCustomerListOpen(false)}
          title="Customer Database"
        >
          <CustomerList onClose={() => setIsCustomerListOpen(false)} />
        </Modal>

        <Modal
          isOpen={isAddBankModalOpen}
          onClose={() => {
            setIsAddBankModalOpen(false);
            setSelectedCustomer(null);
          }}
          title="Add Bank Account"
        >
          <AddBankAccountForm 
            customerId={selectedCustomer?.id}
            onSuccess={() => {
              setIsAddBankModalOpen(false);
              setSelectedCustomer(null);
            }}
          />
        </Modal>
      </main>
    </div>
  );
}