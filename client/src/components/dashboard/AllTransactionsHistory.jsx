import React, { useState, useEffect } from 'react';
import axios from '../../services/axios';
import { toast } from 'react-toastify';

const TIME_FRAMES = [
  { value: 'today', label: "Today's Data" },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'all', label: 'All Time' }
];

const QUALITY_TYPES = ['Type 1', 'Type 2', 'Type 3'];
const PAYMENT_TYPES = ['cash', 'bank', 'upi'];

export default function AllTransactionsHistory({ customerId }) {
  const [timeFrame, setTimeFrame] = useState('today');
  const [selectedQualityTypes, setSelectedQualityTypes] = useState([]);
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState([]);
  const [activeView, setActiveView] = useState('purchases'); // 'purchases' or 'payments'
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('timeFrame', timeFrame);
      
      if (timeFrame === 'today') {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        params.append('date', formattedDate);
      }
      
      if (customerId) {
        params.append('customerId', customerId);
      }

      if (activeView === 'purchases') {
        selectedQualityTypes.forEach(type => params.append('qualityTypes[]', type));
        const response = await axios.get(`/api/transactions/insights?${params.toString()}`);
        setTransactions(response.data.insights.map(t => ({ ...t, type: 'purchase' })));
        setSummary(response.data.summary);
      } else {
        selectedPaymentTypes.forEach(type => params.append('paymentTypes[]', type));
        const response = await axios.get(`/api/transactions/payment-insights?${params.toString()}`);
        setTransactions(response.data.insights.map(t => ({ ...t, type: 'payment' })));
        setSummary(response.data.summary);
      }
    } catch (error) {
      toast.error(`Failed to fetch ${activeView}`);
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [timeFrame, selectedQualityTypes, selectedPaymentTypes, activeView, customerId]);

  const handleQualityTypeChange = (type) => {
    setSelectedQualityTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handlePaymentTypeChange = (type) => {
    setSelectedPaymentTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const renderSummaryCards = () => {
    if (activeView === 'purchases') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500">Total Purchases</h3>
            <p className="text-2xl font-semibold">{summary.total_purchases || 0}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500">Total Amount</h3>
            <p className="text-2xl font-semibold">₹{(summary.total_amount || 0).toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500">Total Quantity</h3>
            <p className="text-2xl font-semibold">{(summary.total_quantity || 0).toFixed(2)}</p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500">Total Payments</h3>
            <p className="text-2xl font-semibold">{summary.total_payments || 0}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500">Total Amount</h3>
            <p className="text-2xl font-semibold">₹{(summary.total_amount || 0).toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500">Most Common Type</h3>
            <p className="text-2xl font-semibold capitalize">{summary.most_common_type || '-'}</p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Transaction History</h2>
        <div className="space-x-4">
          <button
            onClick={() => setActiveView('purchases')}
            className={`px-4 py-2 rounded-md ${
              activeView === 'purchases'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Purchases
          </button>
          <button
            onClick={() => setActiveView('payments')}
            className={`px-4 py-2 rounded-md ${
              activeView === 'payments'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Payments
          </button>
        </div>
      </div>
      
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
      </div>

      <div className="mb-6">
        {activeView === 'purchases' ? (
          <div className="flex gap-2 items-center">
            <span className="text-gray-700">Quality Type:</span>
            {QUALITY_TYPES.map(type => (
              <label key={type} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={selectedQualityTypes.includes(type)}
                  onChange={() => handleQualityTypeChange(type)}
                  className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
                <span className="ml-2">{type}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <span className="text-gray-700">Payment Type:</span>
            {PAYMENT_TYPES.map(type => (
              <label key={type} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={selectedPaymentTypes.includes(type)}
                  onChange={() => handlePaymentTypeChange(type)}
                  className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                />
                <span className="ml-2 capitalize">{type}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {renderSummaryCards()}

      <div className="border rounded-lg">
        <div className="max-h-[600px] overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                {activeView === 'purchases' ? (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={activeView === 'purchases' ? 8 : 7} className="px-6 py-4 text-center">Loading...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={activeView === 'purchases' ? 8 : 7} className="px-6 py-4 text-center">
                    No {activeView} found for the selected filters.
                  </td>
                </tr>
              ) : (
                transactions.map((transaction, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(transaction.transaction_date).toLocaleDateString()}
                      <br />
                      <span className="text-sm text-gray-500">{transaction.transaction_time}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{transaction.customer_name}</td>
                    {activeView === 'purchases' ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">{transaction.quality_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{transaction.quantity?.toFixed(2) || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">₹{transaction.rate?.toFixed(2) || '-'}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap capitalize">{transaction.payment_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{transaction.transaction_id || '-'}</td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      ₹{((activeView === 'purchases' ? transaction.total_amount : transaction.amount_paid) || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {activeView === 'purchases' ? (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          transaction.payment_status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : transaction.payment_status === 'partial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.payment_status}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          completed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">{transaction.notes || '-'}</td>
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
