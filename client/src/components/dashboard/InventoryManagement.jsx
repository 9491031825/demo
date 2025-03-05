import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { formatIndianNumber } from '../../utils/numberUtils';
import CustomerSearch from './CustomerSearch';

export default function InventoryManagement() {
  const [loading, setLoading] = useState(true);
  const [inventoryData, setInventoryData] = useState({
    inventory_items: [],
    summary: {
      total_quantity: 0,
      total_cost: 0,
      quality_summary: {}
    }
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const data = await inventoryAPI.getOverview();
      setInventoryData(data);
    } catch (error) {
      toast.error('Failed to load inventory data');
      console.error('Error fetching inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToCustomerInventory = (customerId) => {
    navigate(`/inventory/${customerId}`);
  };
  
  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Inventory Management</h2>
          <button
            onClick={handleBackToDashboard}
            className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </button>
        </div>

        {/* Use existing CustomerSearch component */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Search Customers</h3>
          <CustomerSearch 
            renderActions={(customer) => (
              <div className="space-x-2">
                <button
                  onClick={() => navigateToCustomerInventory(customer.id)}
                  className="bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 transition-colors text-sm"
                >
                  View Inventory
                </button>
              </div>
            )}
          />
        </div>

        {/* Inventory Summary */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Inventory Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">Total Quantity</p>
              <p className="text-xl font-semibold">{formatIndianNumber(inventoryData.summary.total_quantity)} kg</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">Total Cost</p>
              <p className="text-xl font-semibold">₹{formatIndianNumber(inventoryData.summary.total_cost)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-xl font-semibold">{inventoryData.inventory_items.length}</p>
            </div>
          </div>
        </div>

        {/* Quality Type Summary */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Quality Type Summary</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quality Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Average Cost
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(inventoryData.summary.quality_summary).map(([type, data]) => (
                  <tr key={type}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatIndianNumber(data.total_quantity)} kg</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">₹{formatIndianNumber(data.total_cost)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">₹{formatIndianNumber(data.avg_cost)}/kg</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Inventory */}
        <div>
          <h3 className="text-lg font-medium mb-3">Detailed Inventory</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quality Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Average Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventoryData.inventory_items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.customer_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{item.quality_type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatIndianNumber(item.quantity)} kg</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">₹{formatIndianNumber(item.total_cost)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">₹{formatIndianNumber(item.avg_cost)}/kg</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => navigateToCustomerInventory(item.customer)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 