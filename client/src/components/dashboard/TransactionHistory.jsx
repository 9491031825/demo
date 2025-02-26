import { useState, useEffect } from 'react';
import axios from '../../services/axios';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTransactions } from '../../store/slices/transactionSlice';
import PaymentInsights from './PaymentInsights';
import PurchaseInsights from './PurchaseInsights';
import TransactionInsights from './TransactionInsights';

export default function TransactionHistory({ customerId }) {
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions', 'purchases' or 'payments'

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