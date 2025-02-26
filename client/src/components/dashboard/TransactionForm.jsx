import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { createTransaction } from '../../store/slices/transactionSlice';
import { toast } from 'react-toastify';
import axios from '../../services/axios';

export default function TransactionForm({ customer, onBack }) {
  const [transactions, setTransactions] = useState([{
    quality_type: '',
    quantity: '',
    rate: '',
    total: '0'
  }]);
  const [paymentDetails, setPaymentDetails] = useState({
    payment_type: 'cash',
    payment_amount: '',
    transaction_id: '',
    bank_account_id: '',
    notes: '',
    date: new Date().toLocaleString()
  });
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);

  const qualityTypes = ['Type 1', 'Type 2', 'Type 3']; // This could be fetched from API

  const calculateRowTotal = (transaction) => {
    const quantity = parseFloat(transaction.quantity) || 0;
    const rate = parseFloat(transaction.rate) || 0;
    return (quantity * rate).toFixed(2);
  };

  const calculateGrandTotal = () => {
    return transactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0);
  };

  const addNewRow = () => {
    setTransactions([...transactions, {
      quality_type: '',
      quantity: '',
      rate: '',
      total: '0'
    }]);
  };

  const updateTransaction = (index, field, value) => {
    const newTransactions = [...transactions];
    newTransactions[index] = {
      ...newTransactions[index],
      [field]: value
    };
    if (field === 'quantity' || field === 'rate') {
      newTransactions[index].total = calculateRowTotal(newTransactions[index]);
    }
    setTransactions(newTransactions);
  };

  const dispatch = useDispatch();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch bank accounts when customer changes
  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (!customer?.id) return;
      
      try {
        const response = await axios.get(`/api/customers/${customer.id}/bank-accounts/`);
        console.log('Fetched bank accounts:', response.data);
        setBankAccounts(response.data);
      } catch (error) {
        console.error('Failed to fetch bank accounts:', error);
        toast.error('Failed to load bank accounts');
      }
    };

    fetchBankAccounts();
  }, [customer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Basic validation
    if (transactions.some(t => !t.quality_type || !t.quantity || !t.rate)) {
        toast.error('Please fill in all transaction fields');
        setIsSubmitting(false);
        return;
    }

    try {
        const validTransactions = transactions.filter(t => t.quality_type && t.quantity && t.rate).map(t => ({
            quality_type: t.quality_type,
            quantity: parseFloat(t.quantity),
            rate: parseFloat(t.rate),
            total: parseFloat(t.total)
        }));

        const validPaymentDetails = {
            payment_type: paymentDetails.payment_type,
            payment_amount: parseFloat(paymentDetails.payment_amount) || 0,
            transaction_id: paymentDetails.transaction_id,
            bank_account_id: paymentDetails.bank_account_id,
            notes: paymentDetails.notes
        };

        const payload = {
            customer_id: customer.id,
            transactions: validTransactions,
            payment_details: validPaymentDetails
        };

        console.log('Submitting payload:', payload);

        const result = await dispatch(createTransaction(payload)).unwrap();
        console.log('Transaction result:', result);
        
        if (result) {
            toast.success('Transaction saved successfully!');
            onBack();
        }
    } catch (error) {
        console.error('Transaction error:', error);
        toast.error(error?.message || 'Failed to save transaction. Please try again.');
    } finally {
        setIsSubmitting(false);
    }
  };

  const grandTotal = calculateGrandTotal();
  const remainingBalance = grandTotal - parseFloat(paymentDetails.payment_amount || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-indigo-600 hover:text-indigo-900">
          ← Back to Search
        </button>
        <div className="text-right">
          <h2 className="text-xl font-semibold text-gray-900">
            Transaction for {customer.name}
          </h2>
          <p className="text-sm text-gray-600">
            {currentTime}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transaction Rows */}
        {transactions.map((transaction, index) => (
          <div key={index} className="grid grid-cols-4 gap-4">
            <select
              value={transaction.quality_type}
              onChange={(e) => updateTransaction(index, 'quality_type', e.target.value)}
              className="rounded-md border-gray-300"
              required
            >
              <option value="">Select Type</option>
              {qualityTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            
            <input
              type="number"
              value={transaction.quantity}
              onChange={(e) => updateTransaction(index, 'quantity', e.target.value)}
              placeholder="Quantity (kg)"
              className="rounded-md border-gray-300"
              required
              min="0"
            />
            
            <input
              type="number"
              value={transaction.rate}
              onChange={(e) => updateTransaction(index, 'rate', e.target.value)}
              placeholder="Rate"
              className="rounded-md border-gray-300"
              required
              min="0"
            />
            
            <div className="flex items-center justify-between">
              <span className="font-medium">₹{transaction.total}</span>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addNewRow}
          className="text-indigo-600 hover:text-indigo-900"
        >
          + Add Row
        </button>

        {/* Payment Details */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium mb-4">Payment Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <select
              value={paymentDetails.payment_type}
              onChange={(e) => setPaymentDetails({
                ...paymentDetails,
                payment_type: e.target.value,
                bank_account_id: '',
                transaction_id: ''
              })}
              className="rounded-md border-gray-300"
              required
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="upi">UPI</option>
            </select>

            {paymentDetails.payment_type === 'bank' && (
              <>
                <div className="col-span-2">
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
              </>
            )}

            {(paymentDetails.payment_type === 'bank' || paymentDetails.payment_type === 'upi') && (
              <div className="col-span-2">
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

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Amount
              </label>
              <input
                type="number"
                value={paymentDetails.payment_amount}
                onChange={(e) => setPaymentDetails({
                  ...paymentDetails,
                  payment_amount: e.target.value
                })}
                className="w-full rounded-md border-gray-300"
                min="0"
                max={calculateGrandTotal()}
                required
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
        </div>

        <div className="flex justify-between items-center border-t pt-4">
          <div className="space-y-2">
            <div className="text-xl font-semibold">
              Grand Total: ₹{grandTotal.toFixed(2)}
            </div>
            <div className={`text-lg ${remainingBalance > 0 ? 'text-yellow-600' : remainingBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {remainingBalance > 0 ? `Remaining Balance: ₹${remainingBalance.toFixed(2)}` :
               remainingBalance < 0 ? `Overpaid: ₹${Math.abs(remainingBalance).toFixed(2)}` :
               'Fully Paid'}
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`${
              isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            } text-white px-4 py-2 rounded-md transition-colors`}
          >
            {isSubmitting ? 'Saving...' : 'Save Transaction'}
          </button>
        </div>
      </form>
    </div>
  );
}