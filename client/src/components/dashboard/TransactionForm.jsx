import { useState } from 'react';
import axios from '../../services/axios';

export default function TransactionForm({ customer, onBack }) {
  const [transactions, setTransactions] = useState([{
    quality_type: '',
    quantity: '',
    rate: '',
    discount: '0',
    total: '0'
  }]);
  const [paymentDetails, setPaymentDetails] = useState({
    payment_type: 'cash',
    payment_amount: '',
    transaction_id: '',
    notes: ''
  });

  const qualityTypes = ['Type 1', 'Type 2', 'Type 3']; // This could be fetched from API

  const calculateRowTotal = (transaction) => {
    const quantity = parseFloat(transaction.quantity) || 0;
    const rate = parseFloat(transaction.rate) || 0;
    const discount = parseFloat(transaction.discount) || 0;
    return (quantity * rate * (100 - discount) / 100).toFixed(2);
  };

  const addNewRow = () => {
    setTransactions([...transactions, {
      quality_type: '',
      quantity: '',
      rate: '',
      discount: '0',
      total: '0'
    }]);
  };

  const updateTransaction = (index, field, value) => {
    const newTransactions = [...transactions];
    newTransactions[index] = {
      ...newTransactions[index],
      [field]: value
    };
    newTransactions[index].total = calculateRowTotal(newTransactions[index]);
    setTransactions(newTransactions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/transactions', {
        customer_id: customer.id,
        transactions,
        payment_details: paymentDetails
      });
      onBack();
    } catch (error) {
      console.error('Failed to save transaction:', error);
    }
  };

  const grandTotal = transactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-indigo-600 hover:text-indigo-900"
        >
          ← Back to Search
        </button>
        <h2 className="text-xl font-semibold text-gray-900">
          Transaction for {customer.name}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transaction Rows */}
        {transactions.map((transaction, index) => (
          <div key={index} className="grid grid-cols-5 gap-4">
            <select
              value={transaction.quality_type}
              onChange={(e) => updateTransaction(index, 'quality_type', e.target.value)}
              className="rounded-md border-gray-300"
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
            />
            
            <input
              type="number"
              value={transaction.rate}
              onChange={(e) => updateTransaction(index, 'rate', e.target.value)}
              placeholder="Rate"
              className="rounded-md border-gray-300"
            />
            
            <input
              type="number"
              value={transaction.discount}
              onChange={(e) => updateTransaction(index, 'discount', e.target.value)}
              placeholder="Discount %"
              className="rounded-md border-gray-300"
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
              onChange={(e) => setPaymentDetails({...paymentDetails, payment_type: e.target.value})}
              className="rounded-md border-gray-300"
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="upi">UPI</option>
            </select>
            
            <input
              type="number"
              value={paymentDetails.payment_amount}
              onChange={(e) => setPaymentDetails({...paymentDetails, payment_amount: e.target.value})}
              placeholder="Payment Amount"
              className="rounded-md border-gray-300"
            />
            
            {paymentDetails.payment_type !== 'cash' && (
              <input
                type="text"
                value={paymentDetails.transaction_id}
                onChange={(e) => setPaymentDetails({...paymentDetails, transaction_id: e.target.value})}
                placeholder="Transaction ID"
                className="rounded-md border-gray-300"
              />
            )}
            
            <textarea
              value={paymentDetails.notes}
              onChange={(e) => setPaymentDetails({...paymentDetails, notes: e.target.value})}
              placeholder="Notes"
              className="rounded-md border-gray-300"
              rows="2"
            />
          </div>
        </div>

        <div className="flex justify-between items-center border-t pt-4">
          <div className="text-xl font-semibold">
            Grand Total: ₹{grandTotal.toFixed(2)}
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Save Transaction
          </button>
        </div>
      </form>
    </div>
  );
}