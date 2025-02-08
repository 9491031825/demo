import React, { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash/debounce';
import axios from '../../services/axios';
import TransactionForm from './TransactionForm';
import { useDispatch, useSelector } from 'react-redux';
import { searchCustomers } from '../../store/slices/customerSlice';

export default function CustomerSearch() {
  const dispatch = useDispatch();
  const { searchResults: customers, loading } = useSelector(state => state.customers);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const performSearch = async (query) => {
    if (!query) {
      dispatch(searchCustomers(''));
      return;
    }
    
    dispatch(searchCustomers(query));
  };

  // Create a debounced version of the search function
  const debouncedSearch = useCallback(
    debounce((query) => {
      performSearch(query);
    }, 300),
    [dispatch]
  );

  // Update search when term changes
  useEffect(() => {
    debouncedSearch(searchTerm);
    
    // Cleanup function
    return () => {
      debouncedSearch.cancel?.(); // Use optional chaining
    };
  }, [searchTerm, debouncedSearch]);

  if (selectedCustomer) {
    return <TransactionForm customer={selectedCustomer} onBack={() => setSelectedCustomer(null)} />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Search Customers</h2>
      <div className="relative">
        <input
          type="text"
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Search by name, phone, or email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {loading && (
          <div className="absolute right-3 top-2">
            <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="bg-white p-4 rounded-lg shadow hover:shadow-md cursor-pointer transition-shadow"
            onClick={() => setSelectedCustomer(customer)}
          >
            <h3 className="font-medium text-gray-900">{customer.name}</h3>
            <p className="text-sm text-gray-500">{customer.phone_number}</p>
            <div className="mt-2 text-sm text-gray-600">
              Last Transaction: {customer.last_transaction_date || 'No transactions'}
            </div>
          </div>
        ))}
      </div>

      {searchTerm && customers.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-4">
          No customers found
        </div>
      )}
    </div>
  );
}