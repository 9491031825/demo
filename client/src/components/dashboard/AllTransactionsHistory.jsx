import React, { useState, useEffect, useMemo } from 'react';
import axios from '../../services/axios';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import { formatIndianNumber } from '../../utils/numberUtils';
import { useNavigate } from 'react-router-dom';

const TIME_FRAMES = [
  { value: 'today', label: "Today's Data" },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'all', label: 'All Time' }
];

const QUALITY_TYPES = ['Type 1', 'Type 2', 'Type 3', 'Type 4'];
const PAYMENT_TYPES = ['cash', 'bank', 'upi'];

export default function AllTransactionsHistory({ customerId }) {
  const navigate = useNavigate();
  const [timeFrame, setTimeFrame] = useState('today');
  const [selectedQualityTypes, setSelectedQualityTypes] = useState([]);
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState([]);
  const [activeView, setActiveView] = useState('purchases');
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [stockData, setStockData] = useState({});
  const [stockLoading, setStockLoading] = useState(false);

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // Fetch current stock data for all quality types
  useEffect(() => {
    const fetchStockData = async () => {
      try {
        setStockLoading(true);
        const response = await axios.get('/api/inventory/current-stock');
        setStockData(response.data || {});
      } catch (error) {
        console.error('Error fetching stock data:', error);
      } finally {
        setStockLoading(false);
      }
    };

    fetchStockData();
  }, []);

  // Calculate stock by quality type
  const stockByQualityType = useMemo(() => {
    const stockMap = {};
    
    // Initialize stock for each quality type
    QUALITY_TYPES.forEach(type => {
      stockMap[type] = 0;
    });
    
    // If we have stock data from the API, use it
    if (stockData.by_quality_type) {
      Object.entries(stockData.by_quality_type).forEach(([type, quantity]) => {
        if (QUALITY_TYPES.includes(type)) {
          stockMap[type] = quantity;
        }
      });
    } else {
      // Calculate from transactions if API data not available
      transactions.forEach(transaction => {
        if (transaction.type === 'purchase' && transaction.quality_type && transaction.quantity) {
          stockMap[transaction.quality_type] = (stockMap[transaction.quality_type] || 0) + transaction.quantity;
        }
      });
    }
    
    return stockMap;
  }, [stockData, transactions]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (startDate && endDate) {
        // Format dates for API
        const formatDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        params.append('startDate', formatDate(startDate));
        params.append('endDate', formatDate(endDate));
        params.append('filterType', 'date_range');
      } else {
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
      }
      
      if (customerId) {
        params.append('customerId', customerId);
      }

      if (activeView === 'purchases') {
        selectedQualityTypes.forEach(type => params.append('qualityTypes[]', type));
        const response = await axios.get(`/api/transactions/insights?${params.toString()}`);
        const formattedData = response.data.insights.map(t => ({ 
          ...t, 
          type: 'purchase',
          transaction_date: new Date(t.transaction_date) // Ensure date is properly parsed
        }));
        setTransactions(formattedData);
        setFilteredTransactions([]); // Clear any existing filters
        setSummary(response.data.summary);
      } else {
        selectedPaymentTypes.forEach(type => params.append('paymentTypes[]', type));
        const response = await axios.get(`/api/transactions/payment-insights?${params.toString()}`);
        const formattedData = response.data.insights.map(t => ({ 
          ...t, 
          type: 'payment',
          transaction_date: new Date(t.transaction_date) // Ensure date is properly parsed
        }));
        setTransactions(formattedData);
        setFilteredTransactions([]); // Clear any existing filters
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

  const handleDateFilter = () => {
    if (!startDate || !endDate) {
      toast.warning('Please select both start and end dates');
      return;
    }

    if (endDate < startDate) {
      toast.error('End date cannot be before start date');
      return;
    }

    // Reset timeFrame when using date filter
    setTimeFrame('');
    fetchTransactions();
  };

  const clearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
    setTimeFrame('today'); // Reset to default timeFrame
    setFilteredTransactions([]); // Clear filtered transactions
  };

  const calculateFilteredSummary = (filteredData) => {
    if (activeView === 'purchases') {
      return {
        total_purchases: filteredData.length,
        total_amount: filteredData.reduce((sum, tx) => sum + (tx.total_amount || 0), 0),
        total_quantity: filteredData.reduce((sum, tx) => sum + (tx.quantity || 0), 0)
      };
    } else {
      const paymentTypes = filteredData.map(tx => tx.payment_type);
      const mostCommonType = paymentTypes.length > 0 
        ? paymentTypes.sort((a,b) =>
            paymentTypes.filter(v => v === a).length
            - paymentTypes.filter(v => v === b).length
          ).pop()
        : '-';

      return {
        total_payments: filteredData.length,
        total_amount: filteredData.reduce((sum, tx) => sum + (tx.amount_paid || 0), 0),
        most_common_type: mostCommonType
      };
    }
  };

  // Get the current data to display (filtered or all)
  const getCurrentData = () => {
    if (startDate && endDate) {
      return transactions.filter(transaction => {
        const txDate = new Date(transaction.transaction_date);
        return txDate >= startDate && txDate <= endDate;
      });
    }
    return transactions;
  };

  const currentData = getCurrentData();
  const currentSummary = currentData !== transactions ? calculateFilteredSummary(currentData) : summary;

  const prepareExportData = (transactions) => {
    // Add stock information to export data
    const stockInfo = {};
    QUALITY_TYPES.forEach(type => {
      stockInfo[`Current Stock (${type})`] = formatIndianNumber(stockByQualityType[type] || 0);
    });

    return transactions.map(tx => ({
      Date: new Date(tx.transaction_date).toLocaleDateString(),
      Time: tx.transaction_time,
      'Customer Name': tx.customer_name,
      'Transaction Type': tx.type === 'purchase' ? 'Stock Purchase' : 'Payment',
      ...(tx.type === 'purchase' ? {
        'Quality Type': tx.quality_type,
        'Quantity': tx.quantity,
        'Rate': tx.rate,
        'Total Amount': tx.total_amount,
        'Payment Status': tx.payment_status
      } : {
        'Payment Type': tx.payment_type,
        'Amount Paid': tx.amount_paid
      }),
      'Created By': tx.created_by || '-',
      Notes: tx.notes || '-'
    }));
  };

  const handleExport = (type) => {
    const dataToExport = prepareExportData(currentData);
    const dateStr = startDate && endDate 
      ? `${startDate.toLocaleDateString()}_to_${endDate.toLocaleDateString()}`
      : timeFrame;
    const fileName = `${activeView}_transactions_${dateStr}`;
    
    // Prepare stock information for summary
    const stockSummary = {};
    QUALITY_TYPES.forEach(type => {
      stockSummary[`Current Stock (${type})`] = formatIndianNumber(stockByQualityType[type] || 0);
    });
    
    if (type === 'excel') {
      exportToExcel(dataToExport, fileName);
    } else {
      const summaryData = {
        ...(activeView === 'purchases' ? {
          'Total Purchases': currentSummary.total_purchases || 0,
          'Total Amount': `₹${formatIndianNumber(currentSummary.total_amount || 0)}`,
          'Total Quantity': formatIndianNumber(currentSummary.total_quantity || 0),
          ...stockSummary
        } : {
          'Total Payments': currentSummary.total_payments || 0,
          'Total Amount': `₹${formatIndianNumber(currentSummary.total_amount || 0)}`,
          'Most Common Type': currentSummary.most_common_type || '-',
          ...stockSummary
        })
      };

      exportToPDF(dataToExport, fileName, {
        title: `${activeView.charAt(0).toUpperCase() + activeView.slice(1)} History`,
        dateRange: startDate && endDate ? 
          `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}` : 
          `Time Frame: ${timeFrame}`,
        summary: summaryData
      });
    }
  };

  const renderSummaryCards = () => {
    if (activeView === 'purchases') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500">Total Purchases</h3>
            <p className="text-2xl font-semibold">{currentSummary.total_purchases || 0}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500">Total Amount</h3>
            <p className="text-2xl font-semibold">₹{formatIndianNumber(currentSummary.total_amount || 0)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500">Total Quantity</h3>
            <p className="text-2xl font-semibold">{formatIndianNumber(currentSummary.total_quantity || 0)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500">Avg per kg cost</h3>
            <p className="text-2xl font-semibold">
              ₹{formatIndianNumber(currentSummary.total_amount / (currentSummary.total_quantity || 1))}
            </p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500">Total Payments</h3>
            <p className="text-2xl font-semibold">{currentSummary.total_payments || 0}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500">Total Amount</h3>
            <p className="text-2xl font-semibold">₹{formatIndianNumber(currentSummary.total_amount || 0)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500">Most Common Type</h3>
            <p className="text-2xl font-semibold capitalize">{currentSummary.most_common_type || '-'}</p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackToDashboard}
            className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </button>
          <h2 className="text-xl font-semibold">Transaction History</h2>
        </div>
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
      
      {/* Current Stock Summary */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Current Stock</h3>
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-2">
            {QUALITY_TYPES.map(type => (
              <div key={type} className="bg-gray-50 p-4 rounded-lg w-64">
                <h3 className="text-sm text-gray-500">Current Stock ({type})</h3>
                <p className="text-2xl font-semibold">
                  {stockLoading ? 'Loading...' : formatIndianNumber(stockByQualityType[type] || 0)}
                </p>
              </div>
            ))}
          </div>
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

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <DatePicker
            selected={startDate}
            onChange={date => setStartDate(date)}
            placeholderText="Start Date"
            className="px-2 py-1 border rounded"
            maxDate={endDate || new Date()}
            dateFormat="dd/MM/yyyy"
          />
          <DatePicker
            selected={endDate}
            onChange={date => setEndDate(date)}
            placeholderText="End Date"
            className="px-2 py-1 border rounded"
            minDate={startDate}
            maxDate={new Date()}
            dateFormat="dd/MM/yyyy"
          />
          <button
            onClick={handleDateFilter}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Filter
          </button>
          {(startDate || endDate) && (
            <button
              onClick={clearDateFilter}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handleExport('excel')}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Export Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Export PDF
          </button>
        </div>
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
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={activeView === 'purchases' ? 9 : 7} className="px-6 py-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={activeView === 'purchases' ? 9 : 7} className="px-6 py-4 text-center">
                    No transactions found for the selected filters.
                  </td>
                </tr>
              ) : (
                transactions.map((transaction, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(transaction.transaction_date).toLocaleDateString()}
                      <br />
                      <span className="text-sm text-gray-500">
                        {transaction.transaction_time}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.customer_name}
                    </td>
                    {activeView === 'purchases' ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {transaction.quality_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {transaction.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          ₹{transaction.rate}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap capitalize">
                          {transaction.payment_type}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      ₹{formatIndianNumber((activeView === 'purchases' ? transaction.total_amount : transaction.amount_paid) || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.created_by || '-'}
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
