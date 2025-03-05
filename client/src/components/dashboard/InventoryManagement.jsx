import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { formatIndianNumber } from '../../utils/numberUtils';
import InventoryCustomerSearch from './InventoryCustomerSearch';
import BatchProcessingModal from './BatchProcessingModal';

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
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [showBatchProcessing, setShowBatchProcessing] = useState(false);
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

  const handleBatchProcessing = () => {
    if (selectedCustomers.length === 0) {
      toast.error('Please select at least one customer');
      return;
    }
    setShowBatchProcessing(true);
  };

  return (
    <div className="space-y-6 px-2 sm:px-0">
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Inventory Management</h2>
          <div className="flex flex-wrap gap-2">
            {selectedCustomers.length > 0 && (
              <button
                onClick={handleBatchProcessing}
                className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm transition-colors duration-200"
              >
                Process Selected ({selectedCustomers.length})
              </button>
            )}
            <button
              onClick={handleBackToDashboard}
              className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 shadow-sm transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back
            </button>
          </div>
        </div>

        {/* SECTION 1: INSIGHTS - Inventory Summary */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 text-indigo-800 border-b border-indigo-100 pb-1">Inventory Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-md shadow-sm border border-indigo-100">
              <p className="text-sm text-indigo-600 font-medium">Total Quantity</p>
              <p className="text-xl font-semibold text-gray-800">{formatIndianNumber(inventoryData.summary.total_quantity)} kg</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-teal-50 p-4 rounded-md shadow-sm border border-green-100">
              <p className="text-sm text-green-600 font-medium">Total Cost</p>
              <p className="text-xl font-semibold text-gray-800">₹{formatIndianNumber(inventoryData.summary.total_cost)}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-md shadow-sm border border-purple-100 sm:col-span-2 lg:col-span-1">
              <p className="text-sm text-purple-600 font-medium">Total Items</p>
              <p className="text-xl font-semibold text-gray-800">{inventoryData.inventory_items.length}</p>
            </div>
          </div>
        </div>

        {/* SECTION 1: INSIGHTS - Quality Type Summary */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 text-indigo-800 border-b border-indigo-100 pb-1">Quality Type Summary</h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quality Type
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Quantity
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cost
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Average Cost
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(inventoryData.summary.quality_summary)
                    .sort(([typeA], [typeB]) => {
                      // Extract numbers from type names (e.g., "Type 1" -> 1)
                      const numA = parseInt(typeA.replace(/\D/g, '')) || 0;
                      const numB = parseInt(typeB.replace(/\D/g, '')) || 0;
                      return numA - numB;
                    })
                    .map(([type, data], index) => (
                    <tr key={type} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{type}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{formatIndianNumber(data.total_quantity)} kg</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500">₹{formatIndianNumber(data.total_cost)}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500">₹{formatIndianNumber(data.avg_cost)}/kg</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECTION 2: SEARCH BAR */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 text-indigo-800 border-b border-indigo-100 pb-1">Search and Select Customers</h3>
          <InventoryCustomerSearch 
            selectedCustomers={selectedCustomers}
            setSelectedCustomers={setSelectedCustomers}
            inventoryItems={inventoryData.inventory_items}
          />
          {selectedCustomers.length > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleBatchProcessing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm transition-colors duration-200"
              >
                Process Selected ({selectedCustomers.length})
              </button>
            </div>
          )}
        </div>

        {/* SECTION 3: DETAILED INVENTORY */}
        <div>
          <h3 className="text-lg font-medium mb-3 text-indigo-800 border-b border-indigo-100 pb-1">Detailed Inventory</h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quality Type
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cost
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Average Cost
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inventoryData.inventory_items
                    .filter(item => 
                      // Filter out "Processed" items and items with zero quantity
                      item.quality_type !== "Processed" && parseFloat(item.quantity) > 0
                    )
                    .sort((a, b) => {
                      // First sort by customer name
                      if (a.customer_name !== b.customer_name) {
                        return a.customer_name.localeCompare(b.customer_name);
                      }
                      // Then sort by quality type
                      const numA = parseInt(a.quality_type.replace(/\D/g, '')) || 0;
                      const numB = parseInt(b.quality_type.replace(/\D/g, '')) || 0;
                      return numA - numB;
                    })
                    .map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.customer_name}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{item.quality_type}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{formatIndianNumber(item.quantity)} kg</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500">₹{formatIndianNumber(item.total_cost)}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500">₹{formatIndianNumber(item.avg_cost)}/kg</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => navigateToCustomerInventory(item.customer)}
                          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-2 py-1 rounded-md hover:bg-indigo-100 transition-colors duration-200"
                        >
                          View
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

      {showBatchProcessing && (
        <BatchProcessingModal
          selectedCustomers={selectedCustomers.map(customer => customer.id)}
          onClose={() => setShowBatchProcessing(false)}
          onSuccess={() => {
            setShowBatchProcessing(false);
            setSelectedCustomers([]);
            fetchInventoryData();
          }}
          inventoryItems={inventoryData.inventory_items
            .filter(item => 
              selectedCustomers.some(customer => customer.id === item.customer) &&
              item.quality_type !== "Processed" && 
              parseFloat(item.quantity) > 0
            )
          }
        />
      )}
    </div>
  );
} 