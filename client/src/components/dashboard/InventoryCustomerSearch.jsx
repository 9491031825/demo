import React, { useState, useEffect } from 'react';
import { customerAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { formatIndianNumber } from '../../utils/numberUtils';

export default function InventoryCustomerSearch({ selectedCustomers, setSelectedCustomers, inventoryItems }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const searchCustomers = async () => {
      try {
        const data = await customerAPI.search(searchQuery);
        setCustomers(data);
      } catch (error) {
        console.error('Search failed:', error);
        toast.error('Failed to search customers');
      }
    };

    const timeoutId = setTimeout(searchCustomers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleCheckboxChange = (customer) => {
    setSelectedCustomers(prev => {
      const isSelected = prev.some(c => c.id === customer.id);
      if (isSelected) {
        return prev.filter(c => c.id !== customer.id);
      } else {
        return [...prev, customer];
      }
    });
  };

  // Calculate total inventory for a customer
  const getCustomerInventory = (customerId) => {
    if (!inventoryItems || inventoryItems.length === 0) return { totalQuantity: 0, items: [] };
    
    const customerItems = inventoryItems.filter(item => item.customer === customerId);
    const totalQuantity = customerItems.reduce((sum, item) => sum + parseFloat(item.quantity), 0);
    
    return {
      totalQuantity,
      items: customerItems
    };
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customers..."
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
        />
      </div>

      {customers.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 px-3 sm:px-6 py-3">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Available Stock
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer, index) => {
                    const inventory = getCustomerInventory(customer.id);
                    const isSelected = selectedCustomers.some(c => c.id === customer.id);
                    return (
                      <tr 
                        key={customer.id} 
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isSelected ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''} hover:bg-indigo-50 cursor-pointer transition-colors duration-150`}
                        onClick={() => handleCheckboxChange(customer)}
                      >
                        <td className="px-3 sm:px-6 py-3 relative">
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleCheckboxChange(customer);
                              }}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              aria-label={`Select ${customer.name}`}
                            />
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3">
                          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                          {customer.company_name && (
                            <div className="text-xs text-gray-500">{customer.company_name}</div>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3">
                          <div className="text-sm text-gray-500">{customer.phone_number}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-3">
                          {inventory.totalQuantity > 0 ? (
                            <div className="flex items-center">
                              <span className="font-medium text-gray-900">{formatIndianNumber(inventory.totalQuantity)} kg</span>
                              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-800">
                                {inventory.items.length} {inventory.items.length === 1 ? 'type' : 'types'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">No stock</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 