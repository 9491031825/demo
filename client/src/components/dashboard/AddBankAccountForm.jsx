import React, { useState } from 'react';
import { customerAPI } from '../../services/api';
import { toast } from 'react-toastify';

export default function AddBankAccountForm({ customerId, onSuccess }) {
  const [formData, setFormData] = useState({
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    is_default: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.account_holder_name) return 'Account holder name is required';
    if (!formData.bank_name) return 'Bank name is required';
    if (!formData.account_number) return 'Account number is required';
    if (!formData.ifsc_code) return 'IFSC code is required';
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code)) {
      return 'Invalid IFSC code format';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      toast.error(validationError);
      return;
    }

    try {
      // Make API call using customerAPI
      await customerAPI.addBankAccount(customerId, formData);
      
      // Reset form
      setFormData({
        account_holder_name: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        is_default: false
      });

      // Call onSuccess callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to add bank account';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Account Holder Name *
        </label>
        <input
          type="text"
          name="account_holder_name"
          value={formData.account_holder_name}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Bank Name *
        </label>
        <input
          type="text"
          name="bank_name"
          value={formData.bank_name}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Account Number *
        </label>
        <input
          type="text"
          name="account_number"
          value={formData.account_number}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          IFSC Code *
        </label>
        <input
          type="text"
          name="ifsc_code"
          value={formData.ifsc_code}
          onChange={(e) => handleChange({
            target: {
              name: 'ifsc_code',
              value: e.target.value.toUpperCase()
            }
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
          pattern="^[A-Z]{4}0[A-Z0-9]{6}$"
          title="Please enter a valid IFSC code (e.g., HDFC0123456)"
        />
        <p className="mt-1 text-sm text-gray-500">
          Format: ABCD0123456
        </p>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          name="is_default"
          checked={formData.is_default}
          onChange={handleChange}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-700">
          Set as default account
        </label>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={() => onSuccess()}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Bank Account'}
        </button>
      </div>
    </form>
  );
} 