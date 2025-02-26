import React, { useState, useEffect } from 'react';
import axios from '../../services/axios';
import { toast } from 'react-toastify';

const TIME_FRAMES = [
  { value: 'today', label: "Today's Transactions" },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'all', label: 'All Time' }
];

export default function TransactionInsights({ customerId }) {
  const [timeFrame, setTimeFrame] = useState('today');
  const [insights, setInsights] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
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
      
      let response;
      if (customerId) {
        response = await axios.get(`/api/customers/${customerId}/transactions/?${params.toString()}`);
      } else {
        response = await axios.get(`/api/transactions/?${params.toString()}`);
      }
      
      setInsights(response.data.results || []);
      setSummary(response.data.summary || {});
    } catch (error) {
      toast.error('Failed to fetch transaction insights');
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [timeFrame, customerId]);

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
      <h2 className="text-xl font-semibold mb-4">Transaction Insights</h2>
      
      {/* Time Frame Filters */}
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

      {/* Summary Cards */}
      <div className="overflow-x-auto mb-6">
        <div className="flex gap-4 min-w-max pb-2">
          <div className="bg-gray-50 p-4 rounded-lg w-64">
            <h3 className="text-sm text-gray-500">Total Transactions</h3>
            <p className="text-2xl font-semibold">{summary.total_transactions || 0}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg w-64">
            <h3 className="text-sm text-gray-500">Total Amount</h3>
            <p className="text-2xl font-semibold">₹{(summary.total_amount || 0).toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg w-64">
            <h3 className="text-sm text-gray-500">Pending Amount</h3>
            <p className="text-2xl font-semibold">₹{(summary.pending_amount || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="border rounded-lg">
        <div className="max-h-[600px] overflow-auto">
          <table className="min-w-max w-full table-auto">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                    No transactions found for the selected filters.
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
                    <td className="px-6 py-4 whitespace-nowrap capitalize">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        insight.transaction_type === 'stock' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {insight.transaction_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {insight.transaction_type === 'stock' ? (
                        <div>
                          <p className="font-medium">{insight.quality_type}</p>
                          <p className="text-sm text-gray-500">
                            Qty: {insight.quantity} @ ₹{insight.rate}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium capitalize">{insight.payment_type}</p>
                          {insight.bank_account && (
                            <p className="text-sm text-gray-500">
                              {insight.bank_account.bank_name} - {insight.bank_account.account_number}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ₹{insight.amount ? insight.amount.toFixed(2) : (insight.total || 0).toFixed(2)}
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