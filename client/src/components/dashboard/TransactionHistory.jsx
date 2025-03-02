import { useState, useEffect, useMemo } from 'react';
import axios from '../../services/axios';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTransactions } from '../../store/slices/transactionSlice';
import PaymentInsights from './PaymentInsights';
import PurchaseInsights from './PurchaseInsights';
import TransactionInsights from './TransactionInsights';
import { formatIndianNumber } from '../../utils/numberUtils';

const QUALITY_TYPES = ['Type 1', 'Type 2', 'Type 3', 'Type 4'];

export default function TransactionHistory({ customerId }) {
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions', 'purchases' or 'payments'
  const [stockData, setStockData] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch current stock data for all quality types
  useEffect(() => {
    const fetchStockData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/inventory/current-stock');
        setStockData(response.data || {});
      } catch (error) {
        console.error('Error fetching stock data:', error);
      } finally {
        setLoading(false);
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
    }
    
    return stockMap;
  }, [stockData]);

  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'transactions'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            All Transactions
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'purchases'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Purchase History
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'payments'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Payment History
          </button>
        </nav>
      </div>

      {/* Current Stock Summary */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-3">Current Stock</h3>
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-2">
            {QUALITY_TYPES.map(type => (
              <div key={type} className="bg-gray-50 p-4 rounded-lg w-64">
                <h3 className="text-sm text-gray-500">Current Stock ({type})</h3>
                <p className="text-2xl font-semibold">
                  {loading ? 'Loading...' : formatIndianNumber(stockByQualityType[type] || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        {activeTab === 'transactions' ? (
          <TransactionInsights customerId={customerId} />
        ) : activeTab === 'purchases' ? (
          <PurchaseInsights customerId={customerId} />
        ) : (
          <PaymentInsights customerId={customerId} />
        )}
      </div>
    </div>
  );
}