import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerSearchWithCheckbox from './CustomerSearchWithCheckbox';
import { toast } from 'react-toastify';

export default function BulkSettlementPage() {
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const navigate = useNavigate();

  const handleSettleUp = () => {
    if (selectedCustomers.length === 0) {
      toast.error('Please select at least one customer');
      return;
    }
    
    // Navigate to settlement page with selected customers
    navigate('/settlement', { state: { selectedCustomers: selectedCustomers } });
  };

  return (
    <div className="p-6">
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Bulk Settlement</h1>
          <button
            onClick={handleSettleUp}
            disabled={selectedCustomers.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 
                       disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Proceed to Settlement ({selectedCustomers.length})
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 mr-2"
          >
            Back to Dashboard
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <div className="min-w-[768px]">
            <CustomerSearchWithCheckbox 
              selectedCustomers={selectedCustomers}
              setSelectedCustomers={setSelectedCustomers}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 