import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import { transactionAPI, customerAPI } from '../../services/api';
import { format } from 'date-fns';

export default function PaymentTransactionForm() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [paymentDetails, setPaymentDetails] = useState({
    payment_type: 'cash',
    payment_amount: '',
    transaction_id: '',
    bank_account_id: '',
    notes: '',
  });
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [customerBalance, setCustomerBalance] = useState({
    total_pending: 0,
    total_paid: 0,
    net_balance: 0
  });
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone_number: '',
    address: '',
    email: '',
    company_name: '',
    gst_number: '',
    tax_identifier: {
      type: '',
      value: '',
      both: {
        gst: '',
        pan: ''
      }
    }
  });

  // Add new state for tracking total amounts
  const [totalAmounts, setTotalAmounts] = useState({
    existingBalance: 0,
    newPayment: 0,
    finalBalance: 0
  });

  // Add state for pending transactions and allocation
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [manualAllocation, setManualAllocation] = useState(false);
  const [allocations, setAllocations] = useState({});

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch customer's details, balance and bank accounts
  useEffect(() => {
    const fetchData = async () => {
      if (!customerId) return;
      
      try {
        console.log('Fetching data for customer:', customerId);
        const [balanceData, customerData, bankAccountsData, pendingTxResponse] = await Promise.all([
          customerAPI.getBalance(customerId),
          customerAPI.getDetails(customerId),
          customerAPI.getBankAccounts(customerId),
          transactionAPI.getPendingTransactions(customerId)
        ]);
        
        console.log('Fetched balance data:', balanceData);
        setCustomerBalance({
          total_pending: parseFloat(balanceData.total_pending || 0),
          total_paid: parseFloat(balanceData.total_paid || 0),
          net_balance: parseFloat(balanceData.net_balance || 0)
        });
        setCustomerDetails(customerData);
        setBankAccounts(bankAccountsData);
        
        // Set pending transactions and initialize allocations
        const pendingTx = pendingTxResponse.results || [];
        setPendingTransactions(pendingTx);
        
        // Initialize allocations object with transaction IDs and zero amounts
        const initialAllocations = {};
        pendingTx.forEach(tx => {
          initialAllocations[tx.id] = 0;
        });
        setAllocations(initialAllocations);
        
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load customer information');
      }
    };

    fetchData();
  }, [customerId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate payment amount
      if (!paymentDetails.payment_amount || parseFloat(paymentDetails.payment_amount) <= 0) {
        toast.error('Please enter a valid payment amount');
        return;
      }

      // Validate bank details if payment type is bank
      if (paymentDetails.payment_type === 'bank' && !paymentDetails.bank_account_id) {
        toast.error('Please select a bank account');
        return;
      }

      // Validate transaction ID for bank/UPI payments
      if (['bank', 'upi'].includes(paymentDetails.payment_type) && !paymentDetails.transaction_id) {
        toast.error('Please enter a transaction ID');
        return;
      }

      const currentDate = new Date();
      const payload = {
        customer_id: customerId,
        transaction_type: 'payment',  // Explicitly set as payment
        payment_type: paymentDetails.payment_type,
        quality_type: 'payment',  // Add this field
        quantity: 1,  // Add this field
        rate: parseFloat(paymentDetails.payment_amount),  // Add this field
        total: parseFloat(paymentDetails.payment_amount),
        amount_paid: parseFloat(paymentDetails.payment_amount),
        balance: 0,  // Payment transactions have no balance
        transaction_id: paymentDetails.transaction_id || '',
        bank_account: paymentDetails.bank_account_id || null,  // Changed from bank_account_id to bank_account
        notes: paymentDetails.notes || '',
        transaction_date: currentDate.toISOString().split('T')[0],
        transaction_time: currentDate.toTimeString().split(' ')[0],
        payment_status: 'paid',
        // Add manual allocation data if enabled
        manual_allocation: manualAllocation,
        allocations: manualAllocation ? allocations : null
      };

      console.log('Submitting payment payload:', payload);
      const result = await transactionAPI.createPayment(payload);
      
      if (result) {
        // Refresh the balance immediately after successful payment
        const newBalance = await customerAPI.getBalance(customerId);
        console.log('New balance after payment:', newBalance);
        
        // Update local state with new balance
        setCustomerBalance({
          total_pending: parseFloat(newBalance.total_pending || 0),
          total_paid: parseFloat(newBalance.total_paid || 0),
          net_balance: parseFloat(newBalance.net_balance || 0)
        });
        
        toast.success('Payment transaction saved successfully!');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Payment error details:', error.response?.data);
      const errorMessage = error?.response?.data?.error || 
                          (Array.isArray(error?.response?.data) ? error.response.data[0] : 'Failed to save payment');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => navigate('/dashboard');

  // Update the payment amount handler
  const handlePaymentAmountChange = (value) => {
    setPaymentDetails(prev => ({
      ...prev,
      payment_amount: value
    }));
  };

  // Use useEffect to update totals when payment amount changes
  useEffect(() => {
    const paymentAmount = parseFloat(paymentDetails.payment_amount) || 0;
    const existingBalance = parseFloat(customerBalance.net_balance) || 0;
    const finalBalance = existingBalance - paymentAmount;

    setTotalAmounts({
      existingBalance,
      newPayment: paymentAmount,
      finalBalance
    });
  }, [paymentDetails.payment_amount, customerBalance.net_balance]);

  // Add this after the Balance Summary section in the render
  const renderTotalCalculation = () => (
    <div className="mb-6 space-y-2">
      <h3 className="text-lg font-medium">Payment Calculation</h3>
      <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-md">
        <div className="flex justify-between">
          <span>Existing Balance:</span>
          <span className={totalAmounts.existingBalance > 0 ? 'text-red-600' : 'text-green-600'}>
            ₹{Math.abs(totalAmounts.existingBalance).toFixed(2)}
            {totalAmounts.existingBalance > 0 ? ' (Due)' : ' (Advance)'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>New Payment:</span>
          <span className="text-green-600">₹{totalAmounts.newPayment.toFixed(2)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-bold">
          <span>Final Balance:</span>
          <span className={totalAmounts.finalBalance > 0 ? 'text-red-600' : 'text-green-600'}>
            ₹{Math.abs(totalAmounts.finalBalance).toFixed(2)}
            {totalAmounts.finalBalance > 0 ? ' (Due)' : ' (Advance)'}
          </span>
        </div>
      </div>
    </div>
  );

  // Add handler for allocation changes
  const handleAllocationChange = (transactionId, amount) => {
    // Validate amount is not negative and not more than the transaction balance
    const tx = pendingTransactions.find(t => t.id === transactionId);
    const maxAmount = parseFloat(tx.balance);
    let validAmount = Math.min(parseFloat(amount) || 0, maxAmount);
    validAmount = Math.max(0, validAmount);
    
    setAllocations(prev => ({
      ...prev,
      [transactionId]: validAmount
    }));
  };

  // Calculate total allocated amount
  const totalAllocated = Object.values(allocations).reduce((sum, amount) => sum + parseFloat(amount || 0), 0);
  
  // Calculate remaining unallocated amount
  const paymentAmount = parseFloat(paymentDetails.payment_amount) || 0;
  const unallocatedAmount = paymentAmount - totalAllocated;

  // Add function to auto-distribute remaining amount
  const autoDistributeRemaining = () => {
    if (unallocatedAmount <= 0) return;
    
    // Sort transactions by creation date (oldest first)
    const sortedTransactions = [...pendingTransactions].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );
    
    let remaining = unallocatedAmount;
    const newAllocations = {...allocations};
    
    for (const tx of sortedTransactions) {
      if (remaining <= 0) break;
      
      const currentAllocation = parseFloat(newAllocations[tx.id]) || 0;
      const maxMoreToAllocate = parseFloat(tx.balance) - currentAllocation;
      
      if (maxMoreToAllocate > 0) {
        const amountToAdd = Math.min(remaining, maxMoreToAllocate);
        newAllocations[tx.id] = currentAllocation + amountToAdd;
        remaining -= amountToAdd;
      }
    }
    
    setAllocations(newAllocations);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        {/* Header with Customer Info and Time */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={handleBack} 
            className="text-indigo-600 hover:text-indigo-900"
          >
            ← Back to Search
          </button>
          <div className="text-right">
            <h2 className="text-xl font-semibold text-gray-900">
              Payment Transaction for Customer #{customerId}
            </h2>
            <p className="text-sm text-gray-600">
              {currentTime}
            </p>
          </div>
        </div>

        {/* Customer Details Card */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">Customer Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{customerDetails.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{customerDetails.phone_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Company</p>
              <p className="font-medium">{customerDetails.company_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {customerDetails.tax_identifier?.type || 'Tax ID'}
              </p>
              <p className="font-medium">{customerDetails.tax_identifier?.value || 'N/A'}</p>
              {customerDetails.tax_identifier?.both?.gst && customerDetails.tax_identifier?.both?.pan && (
                <p className="text-xs text-gray-500 mt-1">
                  {customerDetails.tax_identifier?.both?.gst !== 'N/A' && `GST: ${customerDetails.tax_identifier?.both?.gst}`}
                  {customerDetails.tax_identifier?.both?.pan !== 'N/A' && ` | PAN: ${customerDetails.tax_identifier?.both?.pan}`}
                </p>
              )}
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-medium">{customerDetails.address || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Balance Summary */}
        <div className="mb-6 space-y-2">
          <h3 className="text-lg font-medium">Current Balance</h3>
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-md">
            <div>
              <p className="text-sm text-gray-500">Total Pending</p>
              <p className="text-xl font-semibold text-red-600">
                ₹{parseFloat(customerBalance.total_pending).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-xl font-semibold text-green-600">
                ₹{parseFloat(customerBalance.total_paid).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Net Balance</p>
              <p className={`text-xl font-semibold ${
                customerBalance.net_balance > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                ₹{Math.abs(parseFloat(customerBalance.net_balance)).toFixed(2)}
                {customerBalance.net_balance > 0 ? ' (Due)' : ' (Advance)'}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Type
              </label>
              <select
                value={paymentDetails.payment_type}
                onChange={(e) => setPaymentDetails({
                  ...paymentDetails,
                  payment_type: e.target.value,
                  bank_account_id: '',
                  transaction_id: ''
                })}
                className="w-full rounded-md border-gray-300"
                required
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="upi">UPI</option>
              </select>
            </div>

            {paymentDetails.payment_type === 'bank' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Bank Account
                </label>
                <select
                  value={paymentDetails.bank_account_id}
                  onChange={(e) => setPaymentDetails({
                    ...paymentDetails,
                    bank_account_id: e.target.value
                  })}
                  className="w-full rounded-md border-gray-300"
                  required
                >
                  <option value="">Select Bank Account</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bank_name} - {account.account_number}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(paymentDetails.payment_type === 'bank' || paymentDetails.payment_type === 'upi') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction ID
                </label>
                <input
                  type="text"
                  value={paymentDetails.transaction_id}
                  onChange={(e) => setPaymentDetails({
                    ...paymentDetails,
                    transaction_id: e.target.value
                  })}
                  className="w-full rounded-md border-gray-300"
                  required
                  placeholder="Enter transaction ID"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Amount
              </label>
              <input
                type="number"
                value={paymentDetails.payment_amount}
                onChange={(e) => handlePaymentAmountChange(e.target.value)}
                className="w-full rounded-md border-gray-300"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={paymentDetails.notes}
                onChange={(e) => setPaymentDetails({
                  ...paymentDetails,
                  notes: e.target.value
                })}
                className="w-full rounded-md border-gray-300"
                rows="2"
              />
            </div>
          </div>

          {renderTotalCalculation()}

          {/* Manual Allocation Toggle */}
          <div className="col-span-1 md:col-span-2 mt-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="manualAllocation"
                checked={manualAllocation}
                onChange={() => setManualAllocation(!manualAllocation)}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
              <label htmlFor="manualAllocation" className="ml-2 block text-sm font-medium text-gray-700">
                Manually allocate payment to specific transactions
              </label>
            </div>
          </div>

          {/* Manual Allocation Section */}
          {manualAllocation && pendingTransactions.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Payment Allocation</h3>
                <div>
                  <span className="text-sm mr-2">
                    Unallocated: <span className={unallocatedAmount < 0 ? 'text-red-600' : 'text-green-600'}>
                      ₹{unallocatedAmount.toFixed(2)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={autoDistributeRemaining}
                    disabled={unallocatedAmount <= 0}
                    className="px-2 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-300"
                  >
                    Auto-Distribute Remaining
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {pendingTransactions.map(transaction => (
                        <tr key={transaction.id}>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {transaction.quality_type}
                          </td>
                          <td className="px-4 py-2">
                            Quantity: {transaction.quantity} @ ₹{transaction.rate}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            ₹{parseFloat(transaction.total).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            ₹{parseFloat(transaction.balance).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <input
                              type="number"
                              value={allocations[transaction.id] || ''}
                              onChange={(e) => handleAllocationChange(transaction.id, e.target.value)}
                              className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                              min="0"
                              max={transaction.balance}
                              step="0.01"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4">
            <button
              type="button"
              onClick={handleBack}
              className="text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (manualAllocation && unallocatedAmount < 0)}
              className={`${
                isSubmitting || (manualAllocation && unallocatedAmount < 0)
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } text-white px-4 py-2 rounded-md transition-colors`}
            >
              {isSubmitting ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}