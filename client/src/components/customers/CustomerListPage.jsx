import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../services/axios';

export default function CustomerListPage() {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const searchCustomers = async (query) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/customers/search/?query=${query}`);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchCustomers('');
  }, []);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchCustomers(query);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customer Database</h1>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search customers..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Phone</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Company</th>
                <th className="px-6 py-3 text-left">GST/PAN</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr 
                  key={customer.id} 
                  className="border-b hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4">{customer.name}</td>
                  <td className="px-6 py-4">{customer.phone_number}</td>
                  <td className="px-6 py-4">{customer.email}</td>
                  <td className="px-6 py-4">{customer.company_name || '-'}</td>
                  <td className="px-6 py-4">
                    {customer.gst_number || customer.pan_number || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/customers/${customer.id}`)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No customers found
            </div>
          )}
        </div>
      )}
    </div>
  );
} 