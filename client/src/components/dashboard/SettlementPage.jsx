import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { customerAPI, transactionAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import AddBankAccountForm from './AddBankAccountForm';
import { numberToWords, formatIndianNumber } from '../../utils/numberUtils';
import { useDisableNumberInputScroll } from '../../hooks/useNumberInputs';

export default function SettlementPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [settlements, setSettlements] = useState([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State for bank account form modal
  const [showBankAccountForm, setShowBankAccountForm] = useState(false);
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(null);

  // Initialize paymentDetails as an empty array first
  const [paymentDetails, setPaymentDetails] = useState([]);

  const formRef = useRef(null);
  // Use our custom hook to disable scroll wheel on number inputs
  useDisableNumberInputScroll(formRef);

  useEffect(() => {
    const initializeSettlements = async () => {
      const customersData = await Promise.all(
        location.state.customers.map(async (customer) => {
          const balance = await customerAPI.getBalance(customer.id);
          const bankAccounts = await customerAPI.getBankAccounts(customer.id);
          
          return {
            customer,
            balance: balance.net_balance,
            bankAccounts,
            selectedBank: bankAccounts[0]?.id || '',
            paymentAmount: '',
            remainingBalance: balance.net_balance
          };
        })
      );
      setSettlements(customersData);
      
      // Initialize paymentDetails after settlements are loaded
      setPaymentDetails(customersData.map(() => ({
        payment_type: 'bank',
        payment_amount: '',
        transaction_id: '',
        bank_account_id: '',
        notes: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm:ss'),
        isProcessing: false
      })));
    };

    initializeSettlements();
  }, [location.state]);

  const handlePaymentChange = (index, value) => {
    setSettlements(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        paymentAmount: value,
        remainingBalance: updated[index].balance - parseFloat(value || 0)
      };
      return updated;
    });
  };

  const getTotals = () => {
    return settlements.reduce((acc, curr) => ({
      totalPending: acc.totalPending + curr.balance,
      totalPayment: acc.totalPayment + parseFloat(curr.paymentAmount || 0),
      totalRemaining: acc.totalRemaining + curr.remainingBalance
    }), { totalPending: 0, totalPayment: 0, totalRemaining: 0 });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Prepare payment data for each settlement
      const paymentsData = settlements
        .filter(settlement => settlement.paymentAmount && parseFloat(settlement.paymentAmount) > 0)
        .map(settlement => ({
          customer_id: settlement.customer.id,
          payment_type: 'bank',
          amount_paid: parseFloat(settlement.paymentAmount),
          bank_account: settlement.selectedBank,
          notes: notes,
          payment_status: 'paid'
        }));

      if (paymentsData.length === 0) {
        toast.error('No valid payments to process');
        return;
      }

      // Send bulk payment request
      await transactionAPI.createBulkPayment(paymentsData);
      
      toast.success('Settlements processed successfully');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to process settlements');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentDetailsChange = (index, field, value) => {
    setPaymentDetails(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
        // Reset bank-related fields when switching to cash or UPI
        ...(field === 'payment_type' && (value === 'cash' || value === 'upi') && {
          bank_account_id: '',
          transaction_id: ''
        })
      };
      return updated;
    });
  };

  const handleSingleSettlement = async (index) => {
    const settlement = settlements[index];
    const payment = paymentDetails[index];
    
    // Validate required fields based on payment type
    if (!payment.payment_amount) {
      toast.error('Please enter payment amount');
      return;
    }
    
    // Adjust validation for cash and UPI
    if (payment.payment_type === 'bank' && (!payment.transaction_id || !payment.bank_account_id)) {
      toast.error('Please fill in all required payment details for bank transfer');
      return;
    }

    if (payment.payment_type === 'upi' && !payment.transaction_id) {
      toast.error('Please provide a UPI Reference ID');
      return;
    }

    try {
      setPaymentDetails(prev => {
        const updated = [...prev];
        updated[index].isProcessing = true;
        return updated;
      });

      const currentDate = new Date();
      const paymentData = {
        customer_id: settlement.customer.id,
        transaction_type: 'payment',
        payment_type: payment.payment_type,
        quality_type: 'payment',
        quantity: 1,
        rate: parseFloat(payment.payment_amount),
        total: parseFloat(payment.payment_amount),
        amount_paid: parseFloat(payment.payment_amount),
        balance: 0,
        // For cash payments, set both transaction_id and bank_account to empty string instead of null
        transaction_id: payment.payment_type === 'cash' ? '' : payment.transaction_id,
        bank_account: payment.payment_type === 'cash' ? '' : 
                     (payment.payment_type === 'bank' ? payment.bank_account_id : null),
        notes: payment.notes || '',
        transaction_date: format(currentDate, 'yyyy-MM-dd'),
        transaction_time: format(currentDate, 'HH:mm:ss'),
        payment_status: 'paid'
      };

      // Process payment
      const result = await transactionAPI.createPayment(paymentData);
      
      if (result) {
        // Refresh data for this customer
        const [newBalance, newBankAccounts] = await Promise.all([
          customerAPI.getBalance(settlement.customer.id),
          customerAPI.getBankAccounts(settlement.customer.id)
        ]);
        
        // Update settlements state with new data
        setSettlements(prev => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            balance: newBalance.net_balance,
            remainingBalance: newBalance.net_balance,
            bankAccounts: newBankAccounts
          };
          return updated;
        });

        // Reset payment details for this customer
        setPaymentDetails(prev => {
          const updated = [...prev];
          updated[index] = {
            payment_type: 'bank',
            payment_amount: '',
            transaction_id: '',
            bank_account_id: '',
            notes: '',
            date: format(new Date(), 'yyyy-MM-dd'),
            time: format(new Date(), 'HH:mm:ss'),
            isProcessing: false
          };
          return updated;
        });

        toast.success(`Payment processed for ${settlement.customer.name}`);
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error?.response?.data?.error || 
                          (Array.isArray(error?.response?.data) ? error.response.data[0] : 'Failed to process payment');
      toast.error(errorMessage);
    } finally {
      setPaymentDetails(prev => {
        const updated = [...prev];
        updated[index].isProcessing = false;
        return updated;
      });
    }
  };

  // Add a refresh function to manually refresh data
  const refreshCustomerData = async (index) => {
    try {
      const settlement = settlements[index];
      const [newBalance, newBankAccounts] = await Promise.all([
        customerAPI.getBalance(settlement.customer.id),
        customerAPI.getBankAccounts(settlement.customer.id)
      ]);
      
      setSettlements(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          balance: newBalance.net_balance,
          remainingBalance: newBalance.net_balance,
          bankAccounts: newBankAccounts
        };
        return updated;
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error('Failed to refresh customer data');
    }
  };

  // Function to handle opening the bank account form
  const handleOpenBankAccountForm = (index) => {
    setSelectedCustomerIndex(index);
    setShowBankAccountForm(true);
  };

  // Function to handle successful bank account addition
  const handleBankAccountAdded = async () => {
    if (selectedCustomerIndex !== null) {
      // Refresh bank accounts for the customer
      await refreshCustomerData(selectedCustomerIndex);
      setShowBankAccountForm(false);
      toast.success('Bank account added successfully');
    }
  };

  const totals = getTotals();

  return (
    <div className="p-6 max-w-7xl mx-auto relative" ref={formRef}>
      {/* Bank Account Form Modal */}
      {showBankAccountForm && selectedCustomerIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              Add Bank Account for {settlements[selectedCustomerIndex].customer.name}
            </h2>
            <AddBankAccountForm 
              customerId={settlements[selectedCustomerIndex].customer.id} 
              onSuccess={handleBankAccountAdded} 
            />
          </div>
        </div>
      )}

      {/* Main content wrapper with adjusted width for large screens */}
      <div className="lg:w-[calc(100%-320px)]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Settlement Details</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
          >
            Back to Dashboard
          </button>
        </div>
        
        <div className="space-y-6">
          {settlements.map((settlement, index) => (
            <div key={settlement.customer.id} className="bg-white p-6 rounded-lg shadow">
              <div className="space-y-4">
                {/* Customer Details */}
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold">{settlement.customer.name}</h3>
                  <p className="text-sm text-gray-600">{settlement.customer.phone_number}</p>
                </div>

                {/* Payment Details Form */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Type</label>
                    <select
                      value={paymentDetails[index].payment_type}
                      onChange={(e) => handlePaymentDetailsChange(index, 'payment_type', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300"
                      required
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="upi">UPI</option>
                    </select>
                  </div>

                  {/* Show bank account selection only for bank transfers */}
                  {paymentDetails[index].payment_type === 'bank' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Bank Account</label>
                      <div className="flex items-center space-x-2">
                        <select
                          value={paymentDetails[index].bank_account_id}
                          onChange={(e) => handlePaymentDetailsChange(index, 'bank_account_id', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300"
                          required
                        >
                          <option value="">Select Bank Account</option>
                          {settlement.bankAccounts.map(account => (
                            <option key={account.id} value={account.id}>
                              {account.bank_name} - {account.account_number}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleOpenBankAccountForm(index)}
                          className="mt-1 bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700"
                          title="Add New Bank Account"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Show transaction ID field only for bank and UPI */}
                  {(paymentDetails[index].payment_type === 'bank' || paymentDetails[index].payment_type === 'upi') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {paymentDetails[index].payment_type === 'upi' ? 'UPI Reference ID' : 'Transaction ID'}
                      </label>
                      <input
                        type="text"
                        value={paymentDetails[index].transaction_id}
                        onChange={(e) => handlePaymentDetailsChange(index, 'transaction_id', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300"
                        required
                      />
                    </div>
                  )}

                  {/* Show bank account details when a bank account is selected */}
                  {paymentDetails[index].payment_type === 'bank' && paymentDetails[index].bank_account_id && (
                    <div className="col-span-2 mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                      {settlement.bankAccounts
                        .filter(account => account.id.toString() === paymentDetails[index].bank_account_id)
                        .map(selectedAccount => (
                          <div key={selectedAccount.id} className="space-y-3 text-base">
                            <p className="text-gray-700">
                              <span className="font-semibold text-gray-900 mr-2">Account Holder:</span> 
                              {selectedAccount.account_holder_name}
                            </p>
                            <p className="text-gray-700">
                              <span className="font-semibold text-gray-900 mr-2">Bank Name:</span> 
                              {selectedAccount.bank_name}
                            </p>
                            <p className="text-gray-700">
                              <span className="font-semibold text-gray-900 mr-2">Account Number:</span> 
                              {selectedAccount.account_number}
                            </p>
                            <p className="text-gray-700">
                              <span className="font-semibold text-gray-900 mr-2">IFSC Code:</span> 
                              {selectedAccount.ifsc_code}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}

                  <div className={paymentDetails[index].payment_type === 'bank' ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700">Payment Amount</label>
                    <input
                      type="number"
                      value={paymentDetails[index].payment_amount}
                      onChange={(e) => handlePaymentDetailsChange(index, 'payment_amount', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300"
                      max={settlement.balance}
                      required
                    />
                    {paymentDetails[index].payment_amount && parseFloat(paymentDetails[index].payment_amount) > 0 && (
                      <p className="mt-1 text-sm text-gray-600 italic">
                        {numberToWords(paymentDetails[index].payment_amount)}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={paymentDetails[index].notes}
                      onChange={(e) => handlePaymentDetailsChange(index, 'notes', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300"
                      rows="2"
                    />
                  </div>
                </div>

                {/* Balance Summary */}
                <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <span className="font-medium">Pending: </span>
                    ₹{formatIndianNumber(settlement.balance)}
                  </div>
                  <div>
                    <span className="font-medium">Payment: </span>
                    ₹{formatIndianNumber(parseFloat(paymentDetails[index]?.payment_amount) || 0)}
                  </div>
                  {paymentDetails[index].payment_amount && parseFloat(paymentDetails[index].payment_amount) > 0 && (
                    <div className="col-span-3 text-sm text-gray-600 italic">
                      <span>Amount in words: </span>
                      <span>{numberToWords(paymentDetails[index].payment_amount)}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Remaining: </span>
                    ₹{formatIndianNumber(settlement.remainingBalance)}
                  </div>
                  
                  <div className="col-span-3 text-sm text-gray-600 italic">
                    <span>Remaining balance in words: </span>
                    <span>{numberToWords(Math.abs(settlement.remainingBalance))}</span>
                    <span>{settlement.remainingBalance > 0 ? ' (Due)' : ' (Excess)'}</span>
                  </div>
                </div>

                {/* Process Button */}
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => refreshCustomerData(index)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={() => handleSingleSettlement(index)}
                    disabled={paymentDetails[index].isProcessing || 
                              !paymentDetails[index].payment_amount || 
                              (paymentDetails[index].payment_type === 'bank' && 
                               (!paymentDetails[index].bank_account_id || !paymentDetails[index].transaction_id)) ||
                              (paymentDetails[index].payment_type === 'upi' && !paymentDetails[index].transaction_id)}
                    className={`${
                      paymentDetails[index].isProcessing || 
                      !paymentDetails[index].payment_amount || 
                      (paymentDetails[index].payment_type === 'bank' && 
                       (!paymentDetails[index].bank_account_id || !paymentDetails[index].transaction_id)) ||
                      (paymentDetails[index].payment_type === 'upi' && !paymentDetails[index].transaction_id)
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white px-4 py-2 rounded-md transition-colors ml-2`}
                  >
                    Process Payment
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Total Summary Fixed Panel */}
      <div className="lg:fixed lg:top-6 lg:right-6 lg:w-[300px] 
                      fixed bottom-0 left-0 right-0 lg:bottom-auto lg:left-auto
                      bg-white lg:p-4 p-2 rounded-lg shadow-lg z-50">
        <h2 className="text-xl font-semibold mb-4 lg:block hidden">Summary</h2>
        <div className="lg:grid lg:grid-cols-1 lg:gap-3 flex justify-between items-center">
          {/* For large screens - vertical layout */}
          <div className="lg:block hidden">
            <div className="flex justify-between font-semibold mb-2">
              <span>Total Outstanding:</span>
              <span>₹{formatIndianNumber(settlements.reduce((sum, s) => sum + s.balance, 0))}</span>
            </div>
            <div className="flex justify-between text-green-600 font-semibold mb-2">
              <span>Total Payment:</span>
              <span>₹{formatIndianNumber(settlements.reduce((sum, s, idx) => 
                sum + (parseFloat(paymentDetails[idx]?.payment_amount) || 0), 0))}</span>
            </div>
            <div className="flex justify-between text-red-600 font-semibold">
              <span>Remaining Balance:</span>
              <span>₹{formatIndianNumber(settlements.reduce((sum, s, idx) => 
                sum + (s.balance - (parseFloat(paymentDetails[idx]?.payment_amount) || 0)), 0))}</span>
            </div>

            <div className="text-sm text-gray-500 mt-2">
              <p>Total Customers: {settlements.length}</p>
              <p>Pending Settlements: {settlements.filter(s => s.balance > 0).length}</p>
            </div>
          </div>

          {/* For mobile screens - horizontal layout */}
          <div className="lg:hidden flex justify-between items-center w-full">
            <div className="text-center px-2">
              <p className="text-xs text-blue-600 font-medium">Pending</p>
              <p className="text-sm font-bold text-blue-700">
                ₹{formatIndianNumber(settlements.reduce((sum, s) => sum + s.balance, 0))}
              </p>
              <p className="text-xs text-blue-600 italic">
                {numberToWords(settlements.reduce((sum, s) => sum + s.balance, 0))}
              </p>
            </div>

            <div className="text-center px-2">
              <p className="text-xs text-green-600 font-medium">Payment</p>
              <p className="text-sm font-bold text-green-700">
                ₹{formatIndianNumber(settlements.reduce((sum, s, idx) => 
                  sum + (parseFloat(paymentDetails[idx]?.payment_amount) || 0), 0))}
              </p>
              <p className="text-xs text-green-600 italic">
                {numberToWords(settlements.reduce((sum, s, idx) => 
                  sum + (parseFloat(paymentDetails[idx]?.payment_amount) || 0), 0))}
              </p>
            </div>

            <div className="text-center px-2">
              <p className="text-xs text-yellow-600 font-medium">Remaining</p>
              <p className="text-sm font-bold text-yellow-700">
                ₹{formatIndianNumber(settlements.reduce((sum, s, idx) => 
                  sum + (s.balance - (parseFloat(paymentDetails[idx]?.payment_amount) || 0)), 0))}
              </p>
              <p className="text-xs text-yellow-600 italic">
                {numberToWords(Math.abs(settlements.reduce((sum, s, idx) => 
                  sum + (s.balance - (parseFloat(paymentDetails[idx]?.payment_amount) || 0)), 0)))}
              </p>
            </div>

            <div className="text-center px-2">
              <p className="text-xs text-gray-600">Customers</p>
              <p className="text-sm font-bold text-gray-700">{settlements.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 