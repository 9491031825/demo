import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { customerAPI, transactionAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

export default function SettlementPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [settlements, setSettlements] = useState([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize paymentDetails as an empty array first
  const [paymentDetails, setPaymentDetails] = useState([]);

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
        [field]: value
      };
      return updated;
    });
  };

  const handleSingleSettlement = async (index) => {
    const settlement = settlements[index];
    const payment = paymentDetails[index];
    
    if (!payment.payment_amount || !payment.bank_account_id || !payment.transaction_id) {
      toast.error('Please fill in all required payment details');
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
        transaction_type: 'payment',  // Explicitly set as payment
        payment_type: payment.payment_type,
        quality_type: 'payment',  // Add this field
        quantity: 1,  // Add this field
        rate: parseFloat(payment.payment_amount),  // Add this field
        total: parseFloat(payment.payment_amount),
        amount_paid: parseFloat(payment.payment_amount),
        balance: 0,  // Payment transactions have no balance
        transaction_id: payment.transaction_id,
        bank_account: payment.bank_account_id,
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

  const totals = getTotals();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settlement Details</h1>
      
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
                    <option value="bank">Bank Transfer</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Bank Account</label>
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                  <input
                    type="text"
                    value={paymentDetails[index].transaction_id}
                    onChange={(e) => handlePaymentDetailsChange(index, 'transaction_id', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Amount</label>
                  <input
                    type="number"
                    value={paymentDetails[index].payment_amount}
                    onChange={(e) => handlePaymentDetailsChange(index, 'payment_amount', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300"
                    max={settlement.balance}
                    required
                  />
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
                  ₹{settlement.balance.toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Payment: </span>
                  ₹{(parseFloat(paymentDetails[index].payment_amount) || 0).toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Remaining: </span>
                  ₹{settlement.remainingBalance.toFixed(2)}
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
                            !paymentDetails[index].bank_account_id || 
                            !paymentDetails[index].transaction_id}
                  className={`${
                    paymentDetails[index].isProcessing || 
                    !paymentDetails[index].payment_amount || 
                    !paymentDetails[index].bank_account_id || 
                    !paymentDetails[index].transaction_id
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white px-4 py-2 rounded-md transition-colors ml-2`}
                >
                  {paymentDetails[index].isProcessing ? 'Processing...' : 'Process Payment'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Grand Total Summary */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Grand Total Summary</h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total Pending</p>
            <p className="text-2xl font-bold text-blue-700">
              ₹{settlements.reduce((sum, s) => sum + s.balance, 0).toFixed(2)}
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Total Payment Amount</p>
            <p className="text-2xl font-bold text-green-700">
              ₹{settlements.reduce((sum, _, idx) => 
                sum + (parseFloat(paymentDetails[idx]?.payment_amount) || 0), 0).toFixed(2)}
            </p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-600 font-medium">Total Remaining</p>
            <p className="text-2xl font-bold text-yellow-700">
              ₹{settlements.reduce((sum, s, idx) => 
                sum + (s.balance - (parseFloat(paymentDetails[idx]?.payment_amount) || 0)), 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>Total Customers: {settlements.length}</p>
          <p>Pending Settlements: {settlements.filter(s => s.balance > 0).length}</p>
        </div>
      </div>
    </div>
  );
} 