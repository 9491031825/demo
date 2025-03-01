import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import { transactionAPI, customerAPI } from '../../services/api';
import { format } from 'date-fns';
import Modal from '../common/Modal';
import AddBankAccountForm from './AddBankAccountForm';
import { numberToWords, formatIndianNumber } from '../../utils/numberUtils';
import { useDisableNumberInputScroll } from '../../hooks/useNumberInputs';

export default function PaymentTransactionForm() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const formRef = useRef(null);
  // Use our custom hook to disable scroll wheel on number inputs
  useDisableNumberInputScroll(formRef);
  
  const [paymentDetails, setPaymentDetails] = useState({
    payment_type: 'cash',
    payment_amount: '',
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

  // Add state for pending transactions
  const [pendingTransactions, setPendingTransactions] = useState([]);

  // Modify the bank account form state to include modal visibility
  const [showBankModal, setShowBankModal] = useState(false);

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
        
        // Set pending transactions
        const pendingTx = pendingTxResponse.results || [];
        setPendingTransactions(pendingTx);
        
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load customer information');
      }
    };

    fetchData();
  }, [customerId]);

  // Handle successful bank account addition
  const handleBankAccountSuccess = async () => {
    try {
      // Refresh bank accounts list
      const updatedAccounts = await customerAPI.getBankAccounts(customerId);
      setBankAccounts(updatedAccounts);
      
      // Close modal
      setShowBankModal(false);
      
      toast.success('Bank account added successfully');
    } catch (error) {
      console.error('Error refreshing bank accounts:', error);
      toast.error('Failed to refresh bank accounts');
    }
  };

  // Modify handleSubmit to handle different payment types
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate based on payment type
      if (!paymentDetails.payment_amount || parseFloat(paymentDetails.payment_amount) <= 0) {
        toast.error('Please enter a valid payment amount');
        return;
      }

      if (paymentDetails.payment_type === 'bank' && !paymentDetails.bank_account_id) {
        toast.error('Please select a bank account');
        return;
      }

      const currentDate = new Date();
      const payload = {
        customer_id: customerId,
        transaction_type: 'payment',
        payment_type: paymentDetails.payment_type,
        quality_type: 'payment',
        quantity: 1,
        rate: parseFloat(paymentDetails.payment_amount),
        total: parseFloat(paymentDetails.payment_amount),
        amount_paid: parseFloat(paymentDetails.payment_amount),
        balance: 0,
        notes: paymentDetails.notes || '',
        transaction_date: format(currentDate, 'yyyy-MM-dd'),
        transaction_time: format(currentDate, 'HH:mm:ss'),
        payment_status: 'paid'
      };

      // Add bank account if payment type is bank
      if (paymentDetails.payment_type === 'bank' && paymentDetails.bank_account_id) {
        payload.bank_account = paymentDetails.bank_account_id;
      }

      const result = await transactionAPI.createPayment(payload);
      
      if (result) {
        const newBalance = await customerAPI.getBalance(customerId);
        setCustomerBalance(newBalance);
        toast.success('Payment processed successfully');
        navigate('/dashboard');
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.error || 
                          (Array.isArray(error?.response?.data) ? error.response.data[0] : 'Failed to process payment');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            ₹{formatIndianNumber(Math.abs(totalAmounts.existingBalance))}
            {totalAmounts.existingBalance > 0 ? ' (Due)' : ' (Advance)'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>New Payment:</span>
          <span className="text-green-600">₹{formatIndianNumber(totalAmounts.newPayment)}</span>
        </div>
        {totalAmounts.newPayment > 0 && (
          <div className="text-sm text-gray-600 italic">
            <span>Amount in words: </span>
            <span>{numberToWords(totalAmounts.newPayment)}</span>
          </div>
        )}
        <div className="border-t pt-2 flex justify-between font-bold">
          <span>Final Balance:</span>
          <span className={totalAmounts.finalBalance > 0 ? 'text-red-600' : 'text-green-600'}>
            ₹{formatIndianNumber(Math.abs(totalAmounts.finalBalance))}
            {totalAmounts.finalBalance > 0 ? ' (Due)' : ' (Advance)'}
          </span>
        </div>
        
        <div className="text-sm text-gray-600 italic">
          <span>Final balance in words: </span>
          <span>{numberToWords(Math.abs(totalAmounts.finalBalance))}</span>
          <span>{totalAmounts.finalBalance > 0 ? ' (Due)' : ' (Advance)'}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        {/* Header with Customer Info and Time */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate('/dashboard')} 
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
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{customerDetails.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{customerDetails.phone_number}</p>
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
                ₹{formatIndianNumber(parseFloat(customerBalance.total_pending))}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-xl font-semibold text-green-600">
                ₹{formatIndianNumber(parseFloat(customerBalance.total_paid))}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Net Balance</p>
              <p className={`text-xl font-semibold ${
                customerBalance.net_balance > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                ₹{formatIndianNumber(Math.abs(parseFloat(customerBalance.net_balance)))}
                {customerBalance.net_balance > 0 ? ' (Due)' : ' (Advance)'}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-6" ref={formRef}>
          <div className="grid grid-cols-2 gap-4">
            {/* Payment Type Selection */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Type
              </label>
              <select
                value={paymentDetails.payment_type}
                onChange={(e) => setPaymentDetails({
                  ...paymentDetails,
                  payment_type: e.target.value,
                  bank_account_id: ''
                })}
                className="w-full rounded-md border-gray-300"
                required
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="upi">UPI</option>
              </select>
            </div>

            {/* Bank Account Selection */}
            {paymentDetails.payment_type === 'bank' && (
              <div className="col-span-2">
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Bank Account
                  </label>
                </div>
                
                {/* Bank Account Selection Dropdown */}
                <select
                  value={paymentDetails.bank_account_id}
                  onChange={(e) => setPaymentDetails({
                    ...paymentDetails,
                    bank_account_id: e.target.value
                  })}
                  className="w-full rounded-md border-gray-300 mb-2"
                  required={paymentDetails.payment_type === 'bank'}
                >
                  <option value="">Select Bank Account</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bank_name} - {account.account_number}
                    </option>
                  ))}
                </select>

                {/* Selected Bank Account Details */}
                {paymentDetails.bank_account_id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                    {bankAccounts
                      .filter(account => account.id.toString() === paymentDetails.bank_account_id)
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
              </div>
            )}

            {/* Add Bank Account Modal */}
            <Modal
              isOpen={showBankModal}
              onClose={() => setShowBankModal(false)}
              title="Add New Bank Account"
            >
              <AddBankAccountForm 
                customerId={customerId} 
                onSuccess={handleBankAccountSuccess}
              />
            </Modal>

            {/* Payment Amount */}
            <div className="col-span-2">
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
              {paymentDetails.payment_amount && parseFloat(paymentDetails.payment_amount) > 0 && (
                <p className="mt-1 text-sm text-gray-600 italic">
                  {numberToWords(paymentDetails.payment_amount)}
                </p>
              )}
            </div>

            {/* Notes */}
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

          {/* Submit Button */}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-md text-white ${
                isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isSubmitting ? 'Processing...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}