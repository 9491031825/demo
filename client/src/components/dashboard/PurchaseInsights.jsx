import React, { useState, useEffect } from 'react';
import axios from '../../services/axios';
import { toast } from 'react-toastify';

const TIME_FRAMES = [
  { value: 'today', label: "Today's Stock" },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'all', label: 'All Time' }
];

const QUALITY_TYPES = ['Type 1', 'Type 2', 'Type 3'];

export default function PurchaseInsights() {
  const [timeFrame, setTimeFrame] = useState('today');
  const [selectedQualityTypes, setSelectedQualityTypes] = useState([]);
  const [insights, setInsights] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('timeFrame', timeFrame);
      selectedQualityTypes.forEach(type => params.append('qualityTypes[]', type));
      
      const response = await axios.get(`/api/transactions/insights?${params.toString()}`);
      setInsights(response.data.insights);
      setSummary(response.data.summary);
    } catch (error) {
      toast.error('Failed to fetch purchase insights');
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [timeFrame, selectedQualityTypes]);

  const handleQualityTypeChange = (type) => {
    setSelectedQualityTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
      <h2 className="text-xl font-semibold mb-4">Purchase Insights</h2>
      
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
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
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

      {/* Insights Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quality Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : insights.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center">
                  No purchases found for the selected filters.
                </td>
              </tr>
            ) : (
              insights.map((insight, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(insight.transaction_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {insight.quality_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {insight.total_quantity.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ₹{insight.total_amount.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 