import React, { useState, useEffect } from 'react';
import axios from '../../services/axios';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { formatIndianNumber } from '../../utils/numberUtils';
import { useNavigate } from 'react-router-dom';

const TIME_FRAMES = [
  { value: 'today', label: "Today's Payments" },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'all', label: 'All Time' }
];

const PAYMENT_TYPES = ['cash', 'bank', 'upi'];

export default function PaymentInsights({ customerId }) {
  const navigate = useNavigate();
  const [timeFrame, setTimeFrame] = useState('today');
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState([]);
  const [insights, setInsights] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');

  const handleBackToDashboard = () => {
    if (customerId) {
      navigate(`/customers/${customerId}`);
    } else {
      navigate('/dashboard');
    }
  };

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Implement proper time frame handling
      params.append('timeFrame', timeFrame);
      params.append('filterType', 'time_frame');
      
      if (timeFrame === 'today') {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        params.append('date', formattedDate);
      }
      
      selectedPaymentTypes.forEach(type => params.append('paymentTypes[]', type));
      if (customerId) {
        params.append('customerId', customerId);
        
        // Fetch customer name if customerId is provided
        try {
          const customerResponse = await axios.get(`/api/customers/${customerId}/`);
          setCustomerName(customerResponse.data.name);
        } catch (error) {
          console.error('Error fetching customer details:', error);
        }
      }
      
      const response = await axios.get(`/api/transactions/payment-insights?${params.toString()}`);
      setInsights(response.data.insights);
      setSummary(response.data.summary);
    } catch (error) {
      toast.error('Failed to fetch payment insights');
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [timeFrame, selectedPaymentTypes, customerId]);

  const handlePaymentTypeChange = (type) => {
    setSelectedPaymentTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackToDashboard}
            className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            {customerId ? 'Back to Customer' : 'Back to Dashboard'}
          </button>
          <h2 className="text-xl font-semibold">
            {customerId && customerName ? `${customerName}'s Payment Insights` : 'Payment Insights'}
          </h2>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="space-x-2">
          {TIME_FRAMES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTimeFrame(value)}
              className={`px-4 py-2 rounded-md ${
                timeFrame === value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        
        <div className="flex gap-2 items-center">
          <span className="text-gray-700">Payment Type:</span>
          {PAYMENT_TYPES.map(type => (
            <label key={type} className="inline-flex items-center">
              <input
                type="checkbox"
                checked={selectedPaymentTypes.includes(type)}
                onChange={() => handlePaymentTypeChange(type)}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
              <span className="ml-2 capitalize">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Summary Cards in a Scrollable Container */}
      <div className="overflow-x-auto mb-6">
        <div className="flex gap-4 min-w-max pb-2">
          <div className="bg-gray-50 p-4 rounded-lg w-64">
            <h3 className="text-sm text-gray-500">Total Payments</h3>
            <p className="text-2xl font-semibold">{summary.total_payments || 0}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg w-64">
            <h3 className="text-sm text-gray-500">Total Amount</h3>
            <p className="text-2xl font-semibold">₹{formatIndianNumber(summary.total_amount || 0)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg w-64">
            <h3 className="text-sm text-gray-500">Average Payment</h3>
            <p className="text-2xl font-semibold">₹{formatIndianNumber(summary.average_payment || 0)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg w-64">
            <h3 className="text-sm text-gray-500">Most Common Payment Type</h3>
            <p className="text-2xl font-semibold capitalize">{summary.most_common_type || '-'}</p>
          </div>
        </div>
      </div>

      {/* Insights Table in a Scrollable Container */}
      <div className="border rounded-lg">
        <div className="max-h-[600px] overflow-auto">
          <table className="min-w-max w-full table-auto">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Customer Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Payment Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Bank Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : insights.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center">
                    No payments found for the selected filters.
                  </td>
                </tr>
              ) : (
                insights.map((insight, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(insight.transaction_date).toLocaleDateString()}
                      <br />
                      <span className="text-sm text-gray-500">
                        {insight.transaction_time}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {insight.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap capitalize">
                      {insight.payment_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {insight.bank_account || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ₹{formatIndianNumber(insight.amount_paid)}
                    </td>
                    <td className="px-6 py-4">
                      {insight.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 