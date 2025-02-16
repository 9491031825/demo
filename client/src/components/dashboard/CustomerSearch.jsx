import React, { useState, useEffect } from 'react';
import axios from '../../services/axios';
import { toast } from 'react-toastify';

export default function CustomerSearch({ renderActions }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const searchCustomers = async () => {
      if (!searchQuery.trim()) {
        setCustomers([]);
        return;
      }

      try {
        const response = await axios.get(`/api/customers/search/?query=${searchQuery}`);
        setCustomers(response.data);
      } catch (error) {
        console.error('Search failed:', error);
        toast.error('Failed to search customers');
      }
    };

    const timeoutId = setTimeout(searchCustomers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customers..."
          className="flex-1 p-2 border rounded-md"
        />
      </div>

      {customers.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {customer.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {customer.phone_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderActions(customer)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}