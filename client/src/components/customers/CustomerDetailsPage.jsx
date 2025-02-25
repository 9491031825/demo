import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../services/axios';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

export default function CustomerDetailsPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [showBankDetails, setShowBankDetails] = useState(false);

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        setLoading(true);
        const [customerResponse, transactionsResponse, balanceResponse, bankAccountsResponse] = await Promise.all([
          axios.get(`/api/customers/${customerId}/`),
          axios.get(`/api/customers/${customerId}/transactions/`),
          axios.get(`/api/customers/${customerId}/balance/`),
          axios.get(`/api/customers/${customerId}/bank-accounts/`)
        ]);

        setCustomer(customerResponse.data);
        setTransactions(transactionsResponse.data.results);
        setBalance(balanceResponse.data);
        setBankAccounts(bankAccountsResponse.data);
      } catch (error) {
        console.error('Error fetching customer data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [customerId]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const handleDateFilter = () => {
    if (!startDate || !endDate) return;
    
    const filtered = transactions.filter(transaction => {
      const txDate = new Date(transaction.transaction_date);
      return txDate >= startDate && txDate <= endDate;
    });
    
    setFilteredTransactions(filtered);
  };

  const prepareExportData = (transactions) => {
    return transactions.map(tx => ({
      date: formatDate(tx.transaction_date),
      time: new Date(tx.transaction_date + 'T' + tx.transaction_time).toLocaleTimeString(),
      type: tx.transaction_type === 'stock' ? 'Stock Purchase' : 'Payment',
      details: tx.transaction_type === 'stock' ? 
        `${tx.quality_type} - Qty: ${tx.quantity} @ ₹${tx.rate}` : 
        `Payment via ${tx.payment_type}`,
      bank_account: tx.bank_account ? 
        `${tx.bank_account.bank_name} - ${tx.bank_account.account_number}` : 
        '-',
      transaction_id: tx.transaction_id || '-',
      amount: formatCurrency(tx.total),
      status: tx.payment_status,
      balance: formatCurrency(parseFloat(tx.running_balance) || 0),
      notes: tx.notes || '-'
    }));
  };

  const handleExport = (type) => {
    const dataToExport = prepareExportData(filteredTransactions.length > 0 ? filteredTransactions : transactions);
    const fileName = `${customer.name}_transactions_${formatDate(new Date())}`;
    
    if (type === 'excel') {
      exportToExcel(dataToExport, fileName);
    } else {
      exportToPDF(dataToExport, fileName, {
        name: customer.name,
        phone_number: customer.phone_number,
        company_name: customer.company_name,
        dateRange: startDate && endDate ? 
          `${formatDate(startDate)} to ${formatDate(endDate)}` : 
          'All Time'
      });
    }
  };

  const renderBankAccounts = () => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Bank Accounts</h3>
        <button
          onClick={() => setShowBankDetails(!showBankDetails)}
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          {showBankDetails ? 'Hide Details' : 'Show Details'}
          <svg
            className={`w-5 h-5 ml-1 transform ${showBankDetails ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {showBankDetails && (
        <div className="space-y-4">
          {bankAccounts.length > 0 ? (
            bankAccounts.map((account, index) => (
              <div
                key={account.id}
                className={`p-4 border rounded-lg ${
                  account.is_default ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">
                      {account.bank_name}
                      {account.is_default && (
                        <span className="ml-2 text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </p>
                    <p className="text-gray-600">Account Number: {account.account_number}</p>
                    <p className="text-gray-600">IFSC Code: {account.ifsc_code}</p>
                    <p className="text-gray-600">Account Holder: {account.account_holder_name}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    <p>Branch: {account.branch_name}</p>
                    <p>Type: {account.account_type}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center">No bank accounts found</p>
          )}
        </div>
      )}
    </div>
  );

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customer Details</h1>
        <button
          onClick={() => navigate('/customers')}
          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
        >
          Back to Customers
        </button>
      </div>

      {customer && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{customer.name}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><span className="font-semibold">Phone:</span> {customer.phone_number}</p>
              <p><span className="font-semibold">Email:</span> {customer.email}</p>
              <p><span className="font-semibold">Company:</span> {customer.company_name || '-'}</p>
            </div>
            <div>
              <p><span className="font-semibold">GST:</span> {customer.gst_number || '-'}</p>
              <p><span className="font-semibold">PAN:</span> {customer.pan_number || '-'}</p>
              <p><span className="font-semibold">Address:</span> {customer.address || '-'}</p>
            </div>
          </div>
        </div>
      )}

      {customer && renderBankAccounts()}

      {balance && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Balance Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-gray-600">Total Pending</p>
              <p className="text-xl font-semibold text-red-600">₹{balance.total_pending}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">Total Paid</p>
              <p className="text-xl font-semibold text-green-600">₹{balance.total_paid}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">Net Balance</p>
              <p className={`text-xl font-semibold ${balance.net_balance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{Math.abs(balance.net_balance)}
                {balance.is_advance && ' (Advance)'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Transaction History</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <DatePicker
                  selected={startDate}
                  onChange={date => setStartDate(date)}
                  placeholderText="Start Date"
                  className="px-2 py-1 border rounded"
                />
                <DatePicker
                  selected={endDate}
                  onChange={date => setEndDate(date)}
                  placeholderText="End Date"
                  className="px-2 py-1 border rounded"
                />
                <button
                  onClick={handleDateFilter}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Filter
                </button>
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
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Date & Time</th>
                <th className="px-6 py-3 text-left">Type</th>
                <th className="px-6 py-3 text-left">Details</th>
                <th className="px-6 py-3 text-left">Bank Account</th>
                <th className="px-6 py-3 text-left">Transaction ID</th>
                <th className="px-6 py-3 text-left">Amount</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Balance</th>
                <th className="px-6 py-3 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {(filteredTransactions.length > 0 ? filteredTransactions : transactions).map((transaction) => (
                <tr key={transaction.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {formatDate(transaction.transaction_date)}
                    <br />
                    <span className="text-sm text-gray-500">
                      {new Date(transaction.transaction_date + 'T' + transaction.transaction_time).toLocaleTimeString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      transaction.transaction_type === 'stock' ? 
                      'bg-blue-100 text-blue-800' : 
                      'bg-green-100 text-green-800'
                    }`}>
                      {transaction.transaction_type === 'stock' ? 'Stock Purchase' : 'Payment'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {transaction.transaction_type === 'stock' ? (
                      <div>
                        <p className="font-semibold">{transaction.quality_type}</p>
                        <p className="text-sm text-gray-600">
                          Quantity: {transaction.quantity} @ ₹{transaction.rate}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p>Payment via {transaction.payment_type}</p>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {transaction.bank_account ? (
                      <div className="text-sm">
                        <p className="font-medium">{transaction.bank_account.bank_name}</p>
                        <p className="text-gray-600">{transaction.bank_account.account_number}</p>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {transaction.transaction_id || '-'}
                  </td>
                  <td className="px-6 py-4 font-semibold">
                    {formatCurrency(transaction.total)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      transaction.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                      transaction.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {transaction.payment_status}
                    </span>
                    {transaction.payment_status !== 'paid' && (
                      <p className="text-sm text-gray-600 mt-1">
                        Balance: {formatCurrency(transaction.balance)}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {formatCurrency(parseFloat(transaction.running_balance) || 0)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {transaction.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No transactions found
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 