import React, { useState, useEffect, useRef } from 'react';
import axios from '../../services/axios';
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
  
  // Reference for form to disable scroll on number inputs
  const formRef = useRef(null);
  useDisableNumberInputScroll(formRef);

  // Initialize settlements from location state
  useEffect(() => {
    if (location.state?.selectedCustomers) {
      initializeSettlements();
    } else {
      navigate('/dashboard');
    }
  }, [location.state]);

  const initializeSettlements = async () => {
    try {
      const selectedCustomers = location.state.selectedCustomers;
      
      // Fetch balance data for each customer
      const settlementsData = await Promise.all(
        selectedCustomers.map(async (customer) => {
          const balanceData = await customerAPI.getBalance(customer.id);
          const bankAccounts = await customerAPI.getBankAccounts(customer.id);
          
          return {
            customer_id: customer.id,
            customer_name: customer.name,
            phone_number: customer.phone_number,
            balance: balanceData.net_balance,
            bank_accounts: bankAccounts,
            payment_amount: '', // Initialize with empty string instead of balance
            is_selected: true,
            remainingBalance: balanceData.net_balance
          };
        })
      );
      
      setSettlements(settlementsData);
      
      // Initialize payment details for each settlement
      const initialPaymentDetails = settlementsData.map(settlement => ({
        customer_id: settlement.customer_id,
        payment_type: 'cash',
        amount_paid: '', // Initialize with empty string
        bank_account_id: '',
        notes: '',
      }));
      
      setPaymentDetails(initialPaymentDetails);
      
    } catch (error) {
      console.error('Error initializing settlements:', error);
      toast.error('Failed to load customer data');
      navigate('/dashboard');
    }
  };

  const handlePaymentChange = (index, value) => {
    // Update payment amount in settlements
    const updatedSettlements = [...settlements];
    updatedSettlements[index].payment_amount = value;
    
    // Convert value to a number, defaulting to 0 if empty or NaN
    const numericValue = value === '' || isNaN(parseFloat(value)) ? 0 : parseFloat(value);
    updatedSettlements[index].remainingBalance = updatedSettlements[index].balance - numericValue;
    setSettlements(updatedSettlements);
    
    // Also update in paymentDetails
    const updatedPaymentDetails = [...paymentDetails];
    updatedPaymentDetails[index].amount_paid = value;
    setPaymentDetails(updatedPaymentDetails);
  };

  const getTotals = () => {
    const selectedSettlements = settlements.filter(s => s.is_selected);
    const totalAmount = selectedSettlements.reduce((sum, s) => sum + parseFloat(s.payment_amount || 0), 0);
    const totalCustomers = selectedSettlements.length;
    const totalPending = selectedSettlements.reduce((sum, s) => sum + s.balance, 0);
    const totalRemaining = selectedSettlements.reduce((sum, s) => sum + (s.balance - parseFloat(s.payment_amount || 0)), 0);
    
    return { totalAmount, totalCustomers, totalPending, totalRemaining };
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Filter only selected settlements
      const selectedIndices = settlements
        .map((s, index) => s.is_selected ? index : -1)
        .filter(index => index !== -1);
      
      if (selectedIndices.length === 0) {
        toast.error('Please select at least one customer to settle');
        setIsSubmitting(false);
        return;
      }
      
      // Validate all selected payments
      for (const index of selectedIndices) {
        const payment = paymentDetails[index];
        const settlement = settlements[index];
        
        if (!payment.amount_paid || parseFloat(payment.amount_paid) <= 0) {
          toast.error(`Please enter a valid payment amount for ${settlement.customer_name}`);
          setIsSubmitting(false);
          return;
        }
        
        if (payment.payment_type === 'bank' && !payment.bank_account_id) {
          toast.error(`Please select a bank account for ${settlement.customer_name}`);
          setIsSubmitting(false);
          return;
        }
      }
      
      // Prepare payment data for API
      const paymentsToProcess = selectedIndices.map(index => {
        const payment = paymentDetails[index];
        const currentDate = new Date();
        
        const paymentData = {
          customer_id: payment.customer_id,
          payment_type: payment.payment_type,
          amount_paid: parseFloat(payment.amount_paid),
          notes: payment.notes || notes, // Use individual notes or global notes
          transaction_date: format(currentDate, 'yyyy-MM-dd'),
          transaction_time: format(currentDate, 'HH:mm:ss'),
          payment_status: 'paid'
        };
        
        // Add bank account if payment type is bank
        if (payment.payment_type === 'bank' && payment.bank_account_id) {
          paymentData.bank_account_id = payment.bank_account_id;
        }
        
        return paymentData;
      });
      
      // Call API to process bulk payments
      const result = await transactionAPI.createBulkPayment(paymentsToProcess);
      
      if (result) {
        toast.success(`Successfully processed ${paymentsToProcess.length} payments`);
        navigate('/dashboard');
      } else {
        throw new Error('Failed to process bulk payments');
      }
    } catch (error) {
      console.error('Error processing payments:', error);
      toast.error(`Failed to process payments: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentDetailsChange = (index, field, value) => {
    const updatedPaymentDetails = [...paymentDetails];
    
    // If changing payment type, reset bank account
    if (field === 'payment_type') {
      updatedPaymentDetails[index] = {
        ...updatedPaymentDetails[index],
        [field]: value,
        bank_account_id: ''
      };
    } else {
      updatedPaymentDetails[index] = {
        ...updatedPaymentDetails[index],
        [field]: value
      };
    }
    
    setPaymentDetails(updatedPaymentDetails);
  };

  const handleSingleSettlement = async (index) => {
    try {
      // Validate payment
      const payment = paymentDetails[index];
      const settlement = settlements[index];
      
      if (!payment.amount_paid || parseFloat(payment.amount_paid) <= 0) {
        toast.error(`Please enter a valid payment amount for ${settlement.customer_name}`);
        return;
      }
      
      if (payment.payment_type === 'bank' && !payment.bank_account_id) {
        toast.error(`Please select a bank account for ${settlement.customer_name}`);
        return;
      }
      
      // Set this specific settlement to submitting state
      const updatedSettlements = [...settlements];
      updatedSettlements[index].isSubmitting = true;
      setSettlements(updatedSettlements);
      
      // Prepare payment data
      const currentDate = new Date();
      const paymentData = {
        customer_id: payment.customer_id,
        payment_type: payment.payment_type,
        amount_paid: parseFloat(payment.amount_paid),
        notes: payment.notes || notes,
        transaction_date: format(currentDate, 'yyyy-MM-dd'),
        transaction_time: format(currentDate, 'HH:mm:ss'),
        payment_status: 'paid',
        transaction_type: 'payment',
        quality_type: 'payment',
        quantity: 1,
        rate: parseFloat(payment.amount_paid),
        total: parseFloat(payment.amount_paid),
        balance: 0
      };
      
      // Add bank account ID if payment type is bank
      if (payment.payment_type === 'bank' && payment.bank_account_id) {
        paymentData.bank_account_id = payment.bank_account_id;
      }
      
      // Process payment
      const response = await transactionAPI.createPayment(paymentData);
      
      if (!response) {
        throw new Error('Failed to process payment');
      }
      
      // Update UI
      toast.success(`Payment for ${settlement.customer_name} processed successfully`);
      
      // Refresh customer data
      await refreshCustomerData(index);
      
      // Reset payment details for this customer
      const resetPaymentDetails = [...paymentDetails];
      resetPaymentDetails[index] = {
        ...resetPaymentDetails[index],
        amount_paid: '',
        bank_account_id: '',
        notes: ''
      };
      setPaymentDetails(resetPaymentDetails);
      
    } catch (error) {
      console.error('Error processing single payment:', error);
      toast.error(`Failed to process payment for ${settlements[index].customer_name}: ${error.message || 'Unknown error'}`);
    } finally {
      // Reset submitting state
      const updatedSettlements = [...settlements];
      updatedSettlements[index].isSubmitting = false;
      setSettlements(updatedSettlements);
    }
  };

  const refreshCustomerData = async (index) => {
    try {
      const customerId = settlements[index].customer_id;
      
      // Show loading toast
      const loadingToastId = toast.info('Refreshing customer data...', { autoClose: false });
      
      // Fetch updated balance data
      const balanceData = await customerAPI.getBalance(customerId);
      
      // Update settlements with new balance
      const updatedSettlements = [...settlements];
      updatedSettlements[index] = {
        ...updatedSettlements[index],
        balance: balanceData.net_balance,
        payment_amount: '', // Reset to empty string instead of balance
        remainingBalance: balanceData.net_balance
      };
      setSettlements(updatedSettlements);
      
      // Update payment details with new amount
      const updatedPaymentDetails = [...paymentDetails];
      updatedPaymentDetails[index] = {
        ...updatedPaymentDetails[index],
        amount_paid: '' // Reset to empty string
      };
      setPaymentDetails(updatedPaymentDetails);
      
      // Close loading toast and show success toast
      toast.dismiss(loadingToastId);
      toast.success(`Data for ${updatedSettlements[index].customer_name} refreshed successfully`);
      
    } catch (error) {
      console.error('Error refreshing customer data:', error);
      toast.error(`Failed to refresh customer data: ${error.message || 'Unknown error'}`);
    }
  };

  const handleOpenBankAccountForm = (index) => {
    setSelectedCustomerIndex(index);
    setShowBankAccountForm(true);
  };

  const handleBankAccountAdded = async () => {
    if (selectedCustomerIndex !== null) {
      try {
        const customerId = settlements[selectedCustomerIndex].customer_id;
        const bankAccounts = await customerAPI.getBankAccounts(customerId);
        
        // Update settlements with new bank accounts
        const updatedSettlements = [...settlements];
        updatedSettlements[selectedCustomerIndex].bank_accounts = bankAccounts;
        setSettlements(updatedSettlements);
        
        // Close modal
        setShowBankAccountForm(false);
        setSelectedCustomerIndex(null);
        
        toast.success('Bank account added successfully');
      } catch (error) {
        console.error('Error refreshing bank accounts:', error);
        toast.error('Failed to refresh bank accounts');
      }
    }
  };

  const { totalAmount, totalCustomers, totalPending, totalRemaining } = getTotals();

  return (
    <div className="p-6 max-w-7xl mx-auto relative" ref={formRef}>
      {/* Bank Account Form Modal */}
      {showBankAccountForm && selectedCustomerIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              Add Bank Account for {settlements[selectedCustomerIndex].customer_name}
            </h2>
            <AddBankAccountForm 
              customerId={settlements[selectedCustomerIndex].customer_id} 
              onSuccess={handleBankAccountAdded}
              onCancel={() => setShowBankAccountForm(false)}
            />
          </div>
        </div>
      )}

      {/* Main content wrapper with adjusted width for large screens */}
      <div className="lg:w-[calc(100%-320px)]">
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="text-indigo-600 hover:text-indigo-900"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold">Bulk Settlement</h1>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Settlement Summary</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-500">Total Customers</p>
              <p className="text-2xl font-semibold">{totalCustomers}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-semibold">₹{formatIndianNumber(totalAmount)}</p>
              <p className="text-sm text-gray-600 italic">{numberToWords(totalAmount)}</p>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Global Notes (applies to all payments)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border-gray-300"
              rows="2"
              placeholder="Enter notes that will apply to all payments"
            />
          </div>
        </div>
        
        <div className="space-y-6">
          {settlements.map((settlement, index) => (
            <div key={settlement.customer_id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settlement.is_selected}
                    onChange={() => {
                      const updatedSettlements = [...settlements];
                      updatedSettlements[index].is_selected = !updatedSettlements[index].is_selected;
                      setSettlements(updatedSettlements);
                    }}
                    className="h-4 w-4 text-indigo-600 rounded"
                  />
                  <h3 className="ml-2 text-lg font-medium">{settlement.customer_name}</h3>
                </div>
                <span className="text-sm text-gray-500">{settlement.phone_number}</span>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Current Balance:</span>
                  <span className={`font-semibold ${settlement.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{formatIndianNumber(Math.abs(settlement.balance))}
                    {settlement.balance > 0 ? ' (Due)' : ' (Advance)'}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Type
                  </label>
                  <select
                    value={paymentDetails[index].payment_type}
                    onChange={(e) => handlePaymentDetailsChange(index, 'payment_type', e.target.value)}
                    className="w-full rounded-md border-gray-300"
                    disabled={!settlement.is_selected}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>
                
                {paymentDetails[index].payment_type === 'bank' && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Bank Account
                      </label>
                      <button
                        type="button"
                        onClick={() => handleOpenBankAccountForm(index)}
                        className="text-xs text-indigo-600 hover:text-indigo-900"
                      >
                        + Add New
                      </button>
                    </div>
                    <select
                      value={paymentDetails[index].bank_account_id}
                      onChange={(e) => handlePaymentDetailsChange(index, 'bank_account_id', e.target.value)}
                      className="w-full rounded-md border-gray-300"
                      disabled={!settlement.is_selected}
                    >
                      <option value="">Select Bank Account</option>
                      {settlement.bank_accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.bank_name} - {account.account_number}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Show bank account details when a bank account is selected */}
                {paymentDetails[index].payment_type === 'bank' && paymentDetails[index].bank_account_id && (
                  <div className="col-span-2 mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                    {settlement.bank_accounts
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount
                  </label>
                  <input
                    type="number"
                    value={settlement.payment_amount}
                    onChange={(e) => handlePaymentChange(index, e.target.value)}
                    className="w-full rounded-md border-gray-300"
                    disabled={!settlement.is_selected}
                    min="0"
                    step="0.01"
                  />
                  {settlement.payment_amount && parseFloat(settlement.payment_amount) > 0 && (
                    <p className="mt-1 text-xs text-gray-600 italic">
                      {numberToWords(settlement.payment_amount)}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentDetails[index].notes}
                    onChange={(e) => handlePaymentDetailsChange(index, 'notes', e.target.value)}
                    className="w-full rounded-md border-gray-300"
                    disabled={!settlement.is_selected}
                    placeholder="Individual notes for this payment"
                  />
                </div>
              </div>
              
              {/* Balance Summary */}
              <div className="mt-4 grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <span className="font-medium">Pending: </span>
                  ₹{formatIndianNumber(settlement.balance)}
                </div>
                <div>
                  <span className="font-medium">Payment: </span>
                  ₹{formatIndianNumber(parseFloat(settlement.payment_amount) || 0)}
                </div>
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
              
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => refreshCustomerData(index)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 mr-2"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => handleSingleSettlement(index)}
                  disabled={!settlement.is_selected || settlement.isSubmitting || 
                    (paymentDetails[index].payment_type === 'bank' && 
                    !paymentDetails[index].bank_account_id)}
                  className={`px-4 py-2 rounded-md text-white ${
                    !settlement.is_selected || settlement.isSubmitting || 
                    (paymentDetails[index].payment_type === 'bank' && 
                    !paymentDetails[index].bank_account_id)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {settlement.isSubmitting ? 'Processing...' : 'Settle Now'}
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || totalCustomers === 0}
            className={`px-6 py-3 rounded-md text-white ${
              isSubmitting || totalCustomers === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isSubmitting ? 'Processing...' : `Settle All (${totalCustomers})`}
          </button>
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
              <span>₹{formatIndianNumber(totalPending)}</span>
            </div>
            <div className="flex justify-between text-green-600 font-semibold mb-2">
              <span>Total Payment:</span>
              <span>₹{formatIndianNumber(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-red-600 font-semibold">
              <span>Remaining Balance:</span>
              <span>₹{formatIndianNumber(totalRemaining)}</span>
            </div>

            <div className="text-sm text-gray-500 mt-2">
              <p>Total Customers: {totalCustomers}</p>
              <p>Pending Settlements: {settlements.filter(s => s.balance > 0).length}</p>
            </div>
          </div>

          {/* For mobile screens - horizontal layout */}
          <div className="lg:hidden flex justify-between items-center w-full">
            <div className="text-center px-2">
              <p className="text-xs text-blue-600 font-medium">Pending</p>
              <p className="text-sm font-bold text-blue-700">
                ₹{formatIndianNumber(totalPending)}
              </p>
              <p className="text-xs text-blue-600 italic">
                {numberToWords(totalPending)}
              </p>
            </div>

            <div className="text-center px-2">
              <p className="text-xs text-green-600 font-medium">Payment</p>
              <p className="text-sm font-bold text-green-700">
                ₹{formatIndianNumber(totalAmount)}
              </p>
              <p className="text-xs text-green-600 italic">
                {numberToWords(totalAmount)}
              </p>
            </div>

            <div className="text-center px-2">
              <p className="text-xs text-yellow-600 font-medium">Remaining</p>
              <p className="text-sm font-bold text-yellow-700">
                ₹{formatIndianNumber(totalRemaining)}
              </p>
              <p className="text-xs text-yellow-600 italic">
                {numberToWords(Math.abs(totalRemaining))}
              </p>
            </div>

            <div className="text-center px-2">
              <p className="text-xs text-gray-600">Customers</p>
              <p className="text-sm font-bold text-gray-700">{totalCustomers}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 