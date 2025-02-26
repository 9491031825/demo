import { useState, useEffect } from 'react';
import axios from '../../services/axios';
import { toast } from 'react-hot-toast';

export default function NewCustomerForm() {
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    email: '',
    address: '',
    identification_type: 'pan',
    gst_number: '',
    pan_number: '',
    aadhaar_number: '',
    company_name: '',
    bank_accounts: [{
      account_holder_name: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      is_default: true
    }]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBankAccountChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const updatedAccounts = [...prev.bank_accounts];
      updatedAccounts[index] = {
        ...updatedAccounts[index],
        [name]: type === 'checkbox' ? checked : value
      };
      return {
        ...prev,
        bank_accounts: updatedAccounts
      };
    });
  };

  const addBankAccount = () => {
    setFormData(prev => ({
      ...prev,
      bank_accounts: [
        ...prev.bank_accounts,
        {
          account_holder_name: '',
          bank_name: '',
          account_number: '',
          ifsc_code: '',
          is_default: false
        }
      ]
    }));
  };

  const removeBankAccount = (index) => {
    setFormData(prev => ({
      ...prev,
      bank_accounts: prev.bank_accounts.filter((_, i) => i !== index)
    }));
  };

  const handleIdentificationChange = (e) => {
    const idType = e.target.value;
    setFormData(prev => ({
      ...prev,
      identification_type: idType,
      pan_number: '',
      gst_number: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // First create the customer
      const customerResponse = await axios.post('/api/customers/create/', {
        name: formData.name,
        phone_number: formData.phone_number,
        email: formData.email,
        address: formData.address,
        gst_number: formData.gst_number,
        pan_number: formData.pan_number,
        aadhaar_number: formData.aadhaar_number,
        company_name: formData.company_name
      });

      // Then create bank accounts
      const customerId = customerResponse.data.id;
      const bankAccountPromises = formData.bank_accounts
        .filter(account => account.account_holder_name && account.bank_name)
        .map(account => 
          axios.post(`/api/customers/${customerId}/bank-accounts/add/`, {
            account_holder_name: account.account_holder_name,
            bank_name: account.bank_name,
            account_number: account.account_number,
            ifsc_code: account.ifsc_code,
            is_default: account.is_default
          })
        );

      await Promise.all(bankAccountPromises);
      
      setSuccess(true);
      toast.success('Customer created successfully!');
      
      // Reset form
      setFormData({
        name: '',
        phone_number: '',
        email: '',
        address: '',
        gst_number: '',
        pan_number: '',
        aadhaar_number: '',
        company_name: '',
        bank_accounts: [{
          account_holder_name: '',
          bank_name: '',
          account_number: '',
          ifsc_code: '',
          is_default: true
        }]
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      setError(error.response?.data?.error || 'Failed to create customer');
      toast.error(error.response?.data?.error || 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            Customer created successfully!
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {duplicateWarning && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
            <p className="font-medium">{duplicateWarning.message}</p>
            <div className="mt-2 text-sm">
              <p>Name: {duplicateWarning.customer.name}</p>
              <p>Email: {duplicateWarning.customer.email}</p>
              <p>Phone: {duplicateWarning.customer.phone_number}</p>
              {duplicateWarning.customer.company_name && (
                <p>Company: {duplicateWarning.customer.company_name}</p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phone_number"
              id="phone_number"
              required
              value={formData.phone_number}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700" required>
              Email *
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
              Company Name
            </label>
            <input
              type="text"
              name="company_name"
              id="company_name"
              value={formData.company_name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Identification Type *
            </label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="identification_type"
                  value="pan"
                  checked={formData.identification_type === 'pan'}
                  onChange={handleIdentificationChange}
                  className="form-radio h-4 w-4 text-indigo-600"
                />
                <span className="ml-2">PAN Number</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="identification_type"
                  value="gst"
                  checked={formData.identification_type === 'gst'}
                  onChange={handleIdentificationChange}
                  className="form-radio h-4 w-4 text-indigo-600"
                />
                <span className="ml-2">GST Number</span>
              </label>
            </div>
          </div>

          {formData.identification_type === 'pan' ? (
            <div className="sm:col-span-2">
              <label htmlFor="pan_number" className="block text-sm font-medium text-gray-700">
                PAN Number *
              </label>
              <input
                type="text"
                name="pan_number"
                id="pan_number"
                required
                maxLength="10"
                pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                title="Please enter a valid PAN number (e.g., ABCDE1234F)"
                value={formData.pan_number}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Format: ABCDE1234F 
              </p>
            </div>
          ) : (
            <div className="sm:col-span-2">
              <label htmlFor="gst_number" className="block text-sm font-medium text-gray-700">
                GST Number *
              </label>
              <input
                type="text"
                name="gst_number"
                id="gst_number"
                required
                maxLength="15"
                pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
                title="Please enter a valid GST number"
                value={formData.gst_number}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Format: 22AAAAA0000A1Z5
              </p>
            </div>
          )}

          <div className="sm:col-span-2">
            <label htmlFor="aadhaar_number" className="block text-sm font-medium text-gray-700">
              Aadhaar Number *
            </label>
            <input
              type="text"
              name="aadhaar_number"
              id="aadhaar_number"
              required
              maxLength="12"
              pattern="\d{12}"
              title="Please enter a valid 12-digit Aadhaar number"
              value={formData.aadhaar_number}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              12-digit Aadhaar number
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Address
            </label>
            <textarea
              name="address"
              id="address"
              rows={3}
              value={formData.address}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Bank Accounts</h3>
              <button
                type="button"
                onClick={addBankAccount}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              >
                Add Account
              </button>
            </div>

            {formData.bank_accounts.map((account, index) => (
              <div key={index} className="border rounded-md p-4 mb-4 bg-gray-50">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      name="account_holder_name"
                      required
                      value={account.account_holder_name}
                      onChange={(e) => handleBankAccountChange(index, e)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      name="bank_name"
                      required
                      value={account.bank_name}
                      onChange={(e) => handleBankAccountChange(index, e)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Account Number
                    </label>
                    <input
                      type="text"
                      name="account_number"
                      required
                      value={account.account_number}
                      onChange={(e) => handleBankAccountChange(index, e)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      name="ifsc_code"
                      required
                      pattern="^[A-Z]{4}0[A-Z0-9]{6}$"
                      title="Please enter a valid IFSC code"
                      value={account.ifsc_code}
                      onChange={(e) => handleBankAccountChange(index, e)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="is_default"
                        checked={account.is_default}
                        onChange={(e) => handleBankAccountChange(index, e)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700">
                        Set as default account
                      </label>
                    </div>
                    
                    {formData.bank_accounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBankAccount(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}