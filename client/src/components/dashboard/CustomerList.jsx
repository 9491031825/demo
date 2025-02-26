import React, { useState, useEffect } from 'react';
import axios from '../../services/axios';

export default function CustomerList({ onClose }) {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [customerTransactions, setCustomerTransactions] = useState({});
  const [customerBalances, setCustomerBalances] = useState({});

  // Fetch both customers and their payment transactions
  const fetchCustomerData = async (query) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/customers/search/?query=${query}`);
      const customersData = response.data;
      
      // Fetch payment transactions for each customer
      const transactionsPromises = customersData.map(async (customer) => {
        try {
          const transactionsResponse = await axios.get(`/api/customers/${customer.id}/transactions/`);
          // Filter for bank payments only
          const bankPayments = transactionsResponse.data.results.filter(tx => 
            tx.transaction_type === 'payment' && 
            tx.payment_type === 'bank' &&
            tx.bank_account
          );
          return { customerId: customer.id, transactions: bankPayments };
        } catch (error) {
          console.error(`Error fetching transactions for customer ${customer.id}:`, error);
          return { customerId: customer.id, transactions: [] };
        }
      });

      // Fetch balances for each customer
      const balancePromises = customersData.map(async (customer) => {
        try {
          const balanceResponse = await axios.get(`/api/customers/${customer.id}/balance/`);
          return { customerId: customer.id, balance: balanceResponse.data.net_balance };
        } catch (error) {
          console.error(`Error fetching balance for customer ${customer.id}:`, error);
          return { customerId: customer.id, balance: 0 };
        }
      });

      const [transactionsResults, balanceResults] = await Promise.all([
        Promise.all(transactionsPromises),
        Promise.all(balancePromises)
      ]);

      const transactionsMap = transactionsResults.reduce((acc, { customerId, transactions }) => {
        acc[customerId] = transactions;
        return acc;
      }, {});

      const balancesMap = balanceResults.reduce((acc, { customerId, balance }) => {
        acc[customerId] = balance;
        return acc;
      }, {});

      setCustomers(customersData);
      setCustomerTransactions(transactionsMap);
      setCustomerBalances(balancesMap);
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load of customers (empty search)
    fetchCustomerData('');
  }, []);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    fetchCustomerData(query);
  };

  const renderBankPayments = (customerId) => {
    const transactions = customerTransactions[customerId] || [];
    if (transactions.length === 0) return '-';

    return (
      <div className="space-y-1">
        {transactions.map((tx, index) => (
          <div key={tx.id} className="text-sm">
            <div className="font-medium">{tx.bank_account.bank_name}</div>
            <div className="text-gray-600">
              Acc: {tx.bank_account.account_number.slice(-4)}
            </div>
            <div className="text-gray-600">
              Amount: ₹{tx.amount_paid} 
              {tx.transaction_id && <span className="ml-1">({tx.transaction_id})</span>}
            </div>
            {index < transactions.length - 1 && <hr className="my-1" />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Customer Database</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search customers..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Company</th>
                <th className="px-4 py-2 text-left">GST/PAN</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Pending Amount</th>
                <th className="px-4 py-2 text-left">Bank Payments</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{customer.name}</td>
                  <td className="px-4 py-2">{customer.company_name || '-'}</td>
                  <td className="px-4 py-2">
                    {customer.gst_number || customer.pan_number || '-'}
                  </td>
                  <td className="px-4 py-2">{customer.email}</td>
                  <td className="px-4 py-2">
                    ₹{(customerBalances[customer.id] || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    {renderBankPayments(customer.id)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No customers found
            </div>
          )}
        </div>
      )}
    </div>
  );
} 