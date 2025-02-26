import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../services/axios';
import { customerAPI } from '../../services/api';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { toast } from 'react-toastify';
import DateRangeFilter from '../common/DateRangeFilter';

export default function CustomerDetailsPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [filteredTransactions, setFilteredTransactions] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [paymentAllocations, setPaymentAllocations] = useState({});
  const [expandedPayment, setExpandedPayment] = useState(null);
  const [currentDateRange, setCurrentDateRange] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(25);

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        setLoading(true);
        const [customerResponse, transactionsResponse, balanceResponse, bankAccountsResponse] = await Promise.all([
          axios.get(`/api/customers/${customerId}/`),
          customerAPI.getTransactions(customerId, currentPage, pageSize),
          axios.get(`/api/customers/${customerId}/balance/`),
          axios.get(`/api/customers/${customerId}/bank-accounts/`)
        ]);

        setCustomer(customerResponse.data);
        setTransactions(transactionsResponse.results);
        setTotalPages(Math.ceil(transactionsResponse.count / pageSize));
        setBankAccounts(bankAccountsResponse.data);
        setBalance(balanceResponse.data);
        
        processPaymentAllocations(transactionsResponse.results);
      } catch (error) {
        console.error('Error fetching customer data:', error);
        toast.error('Failed to load customer data');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [customerId, currentPage, pageSize]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const handleFilterApplied = async (dateFilter) => {
    try {
      setLoading(true);
      setCurrentPage(1); // Reset to first page when filter is applied
      
      if (dateFilter) {
        // Format dates for API
        const formatDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        // Prepare filter object for API
        const filters = {
          filterType: 'date_range',
          startDate: formatDate(new Date(dateFilter.startDate)),
          endDate: formatDate(new Date(dateFilter.endDate))
        };
        
        // Use the API service with filters
        const transactionsResponse = await customerAPI.getTransactions(
          customerId, 
          1, 
          pageSize, 
          filters
        );
        
        console.log('Filtered transactions response:', transactionsResponse);
        
        // Set filtered transactions
        setFilteredTransactions(transactionsResponse.results);
        setTotalPages(Math.ceil(transactionsResponse.count / pageSize));
        
        // Process payment allocations for filtered transactions
        processPaymentAllocations(transactionsResponse.results);
        
        // Set current date range for display
        setCurrentDateRange({
          startDate: new Date(dateFilter.startDate).toLocaleDateString('en-IN'),
          endDate: new Date(dateFilter.endDate).toLocaleDateString('en-IN')
        });
        
        if (transactionsResponse.results.length === 0) {
          toast.info(`No transactions found between ${new Date(dateFilter.startDate).toLocaleDateString()} and ${new Date(dateFilter.endDate).toLocaleDateString()}`);
        } else {
          toast.success(`Showing ${transactionsResponse.results.length} transactions between ${new Date(dateFilter.startDate).toLocaleDateString()} and ${new Date(dateFilter.endDate).toLocaleDateString()}`);
        }
      } else {
        // When filter is cleared, fetch all transactions
        const transactionsResponse = await customerAPI.getTransactions(customerId, 1, pageSize);
        setTransactions(transactionsResponse.results);
        setTotalPages(Math.ceil(transactionsResponse.count / pageSize));
        setFilteredTransactions(null);
        setCurrentDateRange(null);
        
        // Re-process payment allocations with all transactions
        processPaymentAllocations(transactionsResponse.results);
        
        toast.info('Date filter cleared');
      }
    } catch (error) {
      console.error('Error fetching filtered transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
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
    const dataToExport = prepareExportData(filteredTransactions !== null ? filteredTransactions : transactions);
    const fileName = `${customer?.name || 'customer'}_transactions_${formatDate(new Date())}`;
    
    if (type === 'excel') {
      exportToExcel(dataToExport, fileName);
    } else {
      // For PDF, include date range info if filtered
      const dateRange = filteredTransactions !== null && filteredTransactions.length > 0 ? 
        `${formatDate(new Date(filteredTransactions[0].transaction_date))} to ${formatDate(new Date(filteredTransactions[filteredTransactions.length - 1].transaction_date))}` : 
        'All Time';
        
      exportToPDF(dataToExport, fileName, {
        name: customer?.name || '',
        phone_number: customer?.phone_number || '',
        company_name: customer?.company_name || '',
        dateRange: dateRange
      });
    }
  };

  // Process transactions to identify which payments were applied to which stock transactions
  const processPaymentAllocations = (transactions) => {
    const stockTransactions = {};
    const paymentAllocationMap = {};
    
    // First, collect all stock transactions
    transactions.forEach(tx => {
      if (tx.transaction_type === 'stock') {
        stockTransactions[tx.id] = tx;
      }
    });
    
    // Then, process payment transactions to find allocations
    transactions.forEach(tx => {
      if (tx.transaction_type === 'payment' && tx.updated_transactions) {
        // Map of stock transactions this payment was applied to
        const allocations = {};
        
        tx.updated_transactions.forEach(update => {
          const stockTx = stockTransactions[update.id];
          if (stockTx) {
            allocations[update.id] = {
              id: update.id,
              quality_type: stockTx.quality_type,
              amount_applied: update.amount_applied,
              new_balance: update.new_balance
            };
          }
        });
        
        if (Object.keys(allocations).length > 0) {
          paymentAllocationMap[tx.id] = allocations;
        }
      }
    });
    
    setPaymentAllocations(paymentAllocationMap);
  };

  // Toggle expanded payment details
  const togglePaymentDetails = (paymentId) => {
    if (expandedPayment === paymentId) {
      setExpandedPayment(null);
    } else {
      setExpandedPayment(paymentId);
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
                  <div className="flex flex-col space-y-2">
                    <div className="text-sm text-gray-500">
                      <p>Branch: {account.branch_name}</p>
                      <p>Type: {account.account_type}</p>
                    </div>
                    {!account.is_default && (
                      <button
                        onClick={async () => {
                          try {
                            await customerAPI.setDefaultBankAccount(customerId, account.id);
                            // Refresh bank accounts after setting new default
                            const updatedAccounts = await customerAPI.getBankAccounts(customerId);
                            setBankAccounts(updatedAccounts);
                            toast.success('Default bank account updated successfully');
                          } catch (error) {
                            console.error('Error setting default bank account:', error);
                            toast.error('Failed to update default bank account');
                          }
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors"
                      >
                        Set as Default
                      </button>
                    )}
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

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-center items-center space-x-2 py-4 bg-white border-t">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded ${
            currentPage === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          Previous
        </button>
        
        <span className="text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded ${
            currentPage === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          Next
        </button>
      </div>
    );
  };

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
              <p><span className="font-semibold">Company:</span> {customer.company_name || '-'}</p>
              <p><span className="font-semibold">Email:</span> {customer.email}</p>
              <p><span className="font-semibold">Phone:</span> {customer.phone_number}</p>
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
              {balance.is_advance ? (
                <p className="text-xl font-semibold text-yellow-500">
                  ₹{balance.advance_amount} (Advance)
                </p>
              ) : (
                <p className="text-xl font-semibold text-red-600">
                  ₹{Math.abs(balance.net_balance)}
                </p>
              )}
            </div>

          </div>
          {balance.is_advance && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-700">
                <span className="font-semibold">Note:</span> This customer has an advance payment of ₹{balance.advance_amount}. 
                New stock transactions will automatically use this advance payment.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">Transaction History</h3>
              {currentDateRange && (
                <p className="text-sm text-gray-600 mt-1">
                  Showing transactions from {currentDateRange.startDate} to {currentDateRange.endDate}
                </p>
              )}
              {!currentDateRange && transactions.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  Showing all transactions
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <DateRangeFilter onApplyFilter={handleFilterApplied} />
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
                <th className="px-6 py-3 text-left">Balance</th>
                <th className="px-6 py-3 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {(filteredTransactions !== null ? filteredTransactions : transactions).map((transaction) => (
                <React.Fragment key={transaction.id}>
                  <tr className="border-b hover:bg-gray-50">
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
                          {paymentAllocations[transaction.id] && (
                            <button
                              onClick={() => togglePaymentDetails(transaction.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center mt-1"
                            >
                              {expandedPayment === transaction.id ? 'Hide' : 'Show'} allocation details
                              <svg
                                className={`w-4 h-4 ml-1 transform ${expandedPayment === transaction.id ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          )}
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
                      {formatCurrency(parseFloat(transaction.balance) || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {transaction.notes || '-'}
                    </td>
                  </tr>
                  
                  {/* Payment allocation details row */}
                  {transaction.transaction_type === 'payment' && 
                   expandedPayment === transaction.id && 
                   paymentAllocations[transaction.id] && (
                    <tr className="bg-gray-50">
                      <td colSpan="8" className="px-6 py-3">
                        <div className="text-sm">
                          <p className="font-semibold mb-2">Payment Allocation Details:</p>
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="p-2 text-left">Stock Type</th>
                                <th className="p-2 text-left">Amount Applied</th>
                                <th className="p-2 text-left">Remaining Balance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.values(paymentAllocations[transaction.id]).map(allocation => (
                                <tr key={allocation.id} className="border-t border-gray-200">
                                  <td className="p-2">{allocation.quality_type}</td>
                                  <td className="p-2">{formatCurrency(parseFloat(allocation.amount_applied))}</td>
                                  <td className="p-2">{formatCurrency(parseFloat(allocation.new_balance))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions found for this customer
            </div>
          ) : filteredTransactions !== null && filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions match the selected date range
            </div>
          ) : null}
        </div>
        
        {renderPagination()}
      </div>
    </div>
  );
} 