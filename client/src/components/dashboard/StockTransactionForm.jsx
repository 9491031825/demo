import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { createTransaction } from '../../store/slices/transactionSlice';
import { toast } from 'react-toastify';
import axios from '../../services/axios';
import { useParams, useNavigate } from 'react-router-dom';
import { transactionAPI, customerAPI } from '../../services/api';

export default function StockTransactionForm() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([{
    quality_type: '',
    quantity: '',
    rate: '',
    total: '0'
  }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerBalance, setCustomerBalance] = useState({
    total_pending: 0,
    total_paid: 0,
    net_balance: 0
  });
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString());
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
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

  const [totalAmounts, setTotalAmounts] = useState({
    existingBalance: 0,
    newStock: 0,
    finalBalance: 0
  });

  const dispatch = useDispatch();
  const qualityTypes = ['Type 1', 'Type 2', 'Type 3'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [balanceData, customerData] = await Promise.all([
          customerAPI.getBalance(customerId),
          customerAPI.getDetails(customerId)
        ]);
        
        setCustomerBalance(balanceData);
        setCustomerDetails(customerData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load customer information');
      }
    };

    if (customerId) {
      fetchData();
    }
  }, [customerId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const calculateRowTotal = (transaction) => {
    const quantity = parseFloat(transaction.quantity) || 0;
    const rate = parseFloat(transaction.rate) || 0;
    return (quantity * rate).toFixed(2);
  };

  const calculateGrandTotal = () => {
    return transactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0);
  };

  const updateTotals = () => {
    const newStockTotal = calculateGrandTotal();
    const existingBalance = parseFloat(customerBalance.net_balance) || 0;
    const finalBalance = existingBalance + newStockTotal;

    setTotalAmounts({
      existingBalance,
      newStock: newStockTotal,
      finalBalance
    });
  };

  const addNewRow = () => {
    setTransactions([...transactions, {
      quality_type: '',
      quantity: '',
      rate: '',
      total: '0'
    }]);
  };

  const removeRow = (index) => {
    if (transactions.length > 1) {
      const newTransactions = transactions.filter((_, i) => i !== index);
      setTransactions(newTransactions);
    }
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
    updateTotals();
  };

  useEffect(() => {
    updateTotals();
  }, [transactions, customerBalance.net_balance]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validTransactions = transactions
        .filter(t => t.quality_type && t.quantity && t.rate)
        .map(t => ({
          customer_id: customerId,
          quality_type: t.quality_type,
          quantity: parseFloat(t.quantity),
          rate: parseFloat(t.rate),
          total: parseFloat(calculateRowTotal(t)),
          notes: '',
          transaction_date: new Date().toISOString().split('T')[0],
          transaction_time: new Date().toTimeString().split(' ')[0],
          transaction_type: 'stock',
          payment_type: 'cash'
        }));

      if (validTransactions.length === 0) {
        toast.error('Please fill in all transaction fields');
        return;
      }

      // Create all transactions
      const results = await Promise.all(
        validTransactions.map(transaction => 
          transactionAPI.createStock(transaction)
        )
      );
      
      if (results.every(result => result)) {
        // Refresh the balance after successful transactions
        const newBalance = await customerAPI.getBalance(customerId);
        setCustomerBalance(newBalance);
        
        toast.success('Stock transactions saved successfully!');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Transaction error:', error);
      toast.error(error?.response?.data?.error || 'Failed to save transactions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => navigate('/dashboard');

  const renderTotalCalculation = () => (
    <div className="mt-4 space-y-2 p-4 bg-gray-50 rounded-md">
      <div className="flex justify-between">
        <span>Existing Balance:</span>
        <span className={totalAmounts.existingBalance > 0 ? 'text-red-600' : 'text-green-600'}>
          ₹{Math.abs(totalAmounts.existingBalance).toFixed(2)}
          {totalAmounts.existingBalance > 0 ? ' (Due)' : ' (Advance)'}
        </span>
      </div>
      <div className="flex justify-between">
        <span>New Stock Value:</span>
        <span className="text-red-600">₹{totalAmounts.newStock.toFixed(2)}</span>
      </div>
      <div className="border-t pt-2 flex justify-between font-bold">
        <span>Final Balance:</span>
        <span className={totalAmounts.finalBalance > 0 ? 'text-red-600' : 'text-green-600'}>
          ₹{Math.abs(totalAmounts.finalBalance).toFixed(2)}
          {totalAmounts.finalBalance > 0 ? ' (Due)' : ' (Advance)'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={handleBack} 
            className="text-indigo-600 hover:text-indigo-900"
          >
            ← Back to Search
          </button>
          <div className="text-right">
            <h2 className="text-xl font-semibold text-gray-900">
              Stock Transaction for Customer #{customerId}
            </h2>
            <p className="text-sm text-gray-600">
              {currentTime}
            </p>
          </div>
        </div>

        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">Customer Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{customerDetails.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{customerDetails.phone}</p>
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

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {transactions.map((transaction, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 items-center">
                <select
                  value={transaction.quality_type}
                  onChange={(e) => updateTransaction(index, 'quality_type', e.target.value)}
                  className="rounded-md border-gray-300"
                  required
                >
                  <option value="">Select Quality</option>
                  {qualityTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={transaction.quantity}
                  onChange={(e) => updateTransaction(index, 'quantity', e.target.value)}
                  placeholder="Quantity"
                  className="rounded-md border-gray-300"
                  required
                  min="0"
                  step="0.01"
                />
                <input
                  type="number"
                  value={transaction.rate}
                  onChange={(e) => updateTransaction(index, 'rate', e.target.value)}
                  placeholder="Rate"
                  className="rounded-md border-gray-300"
                  required
                  min="0"
                  step="0.01"
                />
                <div className="flex items-center">
                  <span className="mr-2">₹{transaction.total}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="text-red-600 hover:text-red-800"
                  disabled={transactions.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <button
                type="button"
                onClick={addNewRow}
                className="text-indigo-600 hover:text-indigo-900"
              >
                + Add Row
              </button>
              <div className="text-xl font-semibold">
                New Stock Total: ₹{calculateGrandTotal().toFixed(2)}
              </div>
            </div>
            {renderTotalCalculation()}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`${
                isSubmitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } text-white px-4 py-2 rounded-md transition-colors`}
            >
              {isSubmitting ? 'Saving...' : 'Save Stock Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}