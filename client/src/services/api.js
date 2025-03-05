import axios from './axios';

// Authentication API
export const authAPI = {
  login: async (credentials) => {
    try {
      const response = await axios.post('/user/login/', credentials);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error.response?.data || error;
    }
  },
  
  verifyOTP: async (verificationData) => {
    try {
      const response = await axios.post('/user/login/otpverification/', verificationData);
      return response.data;
    } catch (error) {
      console.error('OTP verification error:', error);
      throw error.response?.data || error;
    }
  }
};

export const customerAPI = {
  search: async (query) => {
    try {
      const response = await axios.get('/api/customers/search/', {
        params: { query }
      });
      return response.data;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  },

  create: async (customerData) => {
    const response = await axios.post('/api/customers/create/', customerData);
    return response.data;
  },

  getTransactions: async (customerId, page = 1, pageSize = 10, filters = null) => {
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('page_size', pageSize);
      
      // Add date range filters if provided
      if (filters && filters.filterType === 'date_range') {
        params.append('filterType', 'date_range');
        params.append('startDate', filters.startDate);
        params.append('endDate', filters.endDate);
      }
      
      const response = await axios.get(`/api/customers/${customerId}/transactions/?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Get transactions error:', error);
      throw error.response?.data || error;
    }
  },

  getDetails: async (customerId) => {
    try {
      const response = await axios.get(`/api/customers/${customerId}/`);
      return response.data;
    } catch (error) {
      console.error('Get customer details error:', error);
      throw error.response?.data || error;
    }
  },

  getBalance: async (customerId) => {
    try {
      console.log('Fetching balance for customer:', customerId);
      const response = await axios.get(`/api/customers/${customerId}/balance/`);
      console.log('Balance response:', response.data);
      
      // Ensure we're getting numbers, not strings
      const balance = {
        total_pending: parseFloat(response.data.total_pending || 0),
        total_paid: parseFloat(response.data.total_paid || 0),
        net_balance: parseFloat(response.data.net_balance || 0),
        is_advance: response.data.is_advance || false,
        advance_amount: parseFloat(response.data.advance_amount || 0)
      };
      
      console.log('Processed balance:', balance);
      return balance;
    } catch (error) {
      console.error('Get customer balance error:', error);
      throw error.response?.data || error;
    }
  },

  getBankAccounts: async (customerId) => {
    try {
      const response = await axios.get(`/api/customers/${customerId}/bank-accounts/`);
      return response.data;
    } catch (error) {
      console.error('Get bank accounts error:', error);
      throw error.response?.data || error;
    }
  },

  setDefaultBankAccount: async (customerId, accountId) => {
    try {
      const response = await axios.post(`/api/customers/${customerId}/bank-accounts/${accountId}/set-default/`);
      return response.data;
    } catch (error) {
      console.error('Set default bank account error:', error);
      throw error.response?.data || error;
    }
  },

  addBankAccount: async (customerId, bankAccountData) => {
    try {
      const response = await axios.post(`/api/customers/${customerId}/bank-accounts/add/`, bankAccountData);
      return response.data;
    } catch (error) {
      console.error('Add bank account error:', error);
      throw error.response?.data || error;
    }
  },

  updateBalance: async (customerId, paymentAmount) => {
    try {
      const response = await axios.post(`/api/customers/${customerId}/update-balance/`, {
        payment_amount: paymentAmount
      });
      return response.data;
    } catch (error) {
      console.error('Update balance error:', error);
      throw error.response?.data || error;
    }
  }
};

export const transactionAPI = {
  createStock: async (transactionData) => {
    try {
      const response = await axios.post('/api/transactions/stock/create/', transactionData);
      return response.data;
    } catch (error) {
      console.error('Create stock transaction error:', error);
      throw error.response?.data || error;
    }
  },

  createPayment: async (paymentData) => {
    try {
      console.log('Creating payment with data:', paymentData);
      // Ensure bank_account field is correctly set for bank transfers
      if (paymentData.payment_type === 'bank' && paymentData.bank_account_id) {
        paymentData.bank_account = paymentData.bank_account_id;
        delete paymentData.bank_account_id;
      }
      const response = await axios.post('/api/transactions/payment/create/', paymentData);
      return response.data;
    } catch (error) {
      console.error('Create payment error:', error);
      throw error.response?.data || error;
    }
  },

  getDetails: async (customerId, page = 1, pageSize = 10) => {
    try {
      const response = await axios.get(`/api/customers/${customerId}/transactions/`, {
        params: { page, page_size: pageSize }
      });
      return response.data;
    } catch (error) {
      console.error('Get transaction details error:', error);
      throw error.response?.data || error;
    }
  },

  search: async (query = '', page = 1, pageSize = 10) => {
    try {
      const response = await axios.get('/api/transactions/search/', {
        params: { query, page, page_size: pageSize }
      });
      return response.data;
    } catch (error) {
      console.error('Search transactions error:', error);
      throw error.response?.data || error;
    }
  },

  createBulkPayment: async (paymentsData) => {
    try {
      console.log('Creating bulk payment with data:', paymentsData);
      const response = await axios.post('/api/transactions/payment/bulk/', 
        paymentsData.map(payment => {
          // Ensure bank_account field is correctly set for bank transfers
          const paymentData = {
            customer_id: payment.customer_id,
            payment_type: payment.payment_type,
            amount_paid: parseFloat(payment.amount_paid),
            notes: payment.notes,
            transaction_date: payment.transaction_date,
            transaction_time: payment.transaction_time,
            payment_status: payment.payment_status
          };
          
          // Set bank_account field correctly for bank transfers
          if (payment.payment_type === 'bank' && payment.bank_account_id) {
            paymentData.bank_account = payment.bank_account_id;
          }
          
          return paymentData;
        })
      );
      return response.data;
    } catch (error) {
      console.error('Create bulk payment error:', error);
      throw error.response?.data || error;
    }
  },

  getPaymentInsights: async (timeFrame, paymentTypes = [], date = null) => {
    try {
      const params = new URLSearchParams();
      params.append('timeFrame', timeFrame);
      
      if (date && timeFrame === 'today') {
        params.append('date', date.toISOString());
      }
      
      paymentTypes.forEach(type => params.append('paymentTypes[]', type));
      
      const response = await axios.get(`/api/transactions/payment-insights?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Get payment insights error:', error);
      throw error.response?.data || error;
    }
  },

  getPendingTransactions: async (customerId) => {
    try {
      const response = await axios.get(`/api/customers/${customerId}/pending-transactions/`);
      return response.data;
    } catch (error) {
      console.error('Get pending transactions error:', error);
      throw error.response?.data || error;
    }
  },
};

// New inventory management API
export const inventoryAPI = {
  getOverview: async () => {
    try {
      const response = await axios.get('/api/inventory/');
      return response.data;
    } catch (error) {
      console.error('Get inventory overview error:', error);
      throw error.response?.data || error;
    }
  },
  
  getCustomerInventory: async (customerId) => {
    try {
      const response = await axios.get(`/api/customers/${customerId}/inventory/`);
      return response.data;
    } catch (error) {
      console.error('Get customer inventory error:', error);
      throw error.response?.data || error;
    }
  },
  
  getExpenses: async (customerId) => {
    try {
      const response = await axios.get(`/api/customers/${customerId}/inventory/expenses/`);
      return response.data;
    } catch (error) {
      console.error('Get inventory expenses error:', error);
      throw error.response?.data || error;
    }
  },
  
  addExpense: async (customerId, data) => {
    try {
      console.log('Adding expense:', data);
      
      // Format data to ensure numeric values are properly parsed
      const formattedData = {
        quality_type: data.quality_type,
        weight_loss: parseFloat(data.weight_loss) || 0,
        notes: data.notes || ''
      };
      
      console.log('Formatted expense data:', formattedData);
      
      const response = await axios.post(
        `/api/customers/${customerId}/inventory/add-expense/`,
        formattedData
      );
      
      return response.data;
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error.response || error;
    }
  },
  
  processInventory: async (customerId, data) => {
    try {
      console.log('Processing inventory:', data);
      
      // Calculate total input quantity
      const totalInputQuantity = data.selectedItems
        .filter(item => item.selected_quantity > 0)
        .reduce((sum, item) => sum + parseFloat(item.selected_quantity), 0);
      
      const outputQuantity = parseFloat(data.output_quantity) || 0;
      
      // First, we need to reduce the input inventory items
      const inputPromises = data.selectedItems.map(item => {
        // Create an expense entry for each input item to reduce its quantity
        return axios.post(
          `/api/customers/${customerId}/inventory/add-expense/`,
          {
            quality_type: item.quality_type,
            weight_loss: parseFloat(parseFloat(item.selected_quantity).toFixed(2)),
            notes: `Processing input: Converting to ${data.output_quality_type}`
          }
        );
      });
      
      // Wait for all input items to be processed
      await Promise.all(inputPromises);
      
      // Now create a stock transaction to add the processed output
      const stockData = {
        customer_id: customerId,
        quality_type: data.output_quality_type,
        quantity: parseFloat(outputQuantity.toFixed(2)),
        rate: parseFloat(parseFloat(data.selling_price).toFixed(2)) || 0,
        total_amount: parseFloat((outputQuantity * parseFloat(data.selling_price)).toFixed(2)) || 0,
        processing_cost: parseFloat(parseFloat(data.processing_cost).toFixed(2)) || 0,
        notes: `Processed from ${parseFloat(totalInputQuantity.toFixed(2))}kg of input material. ${data.notes || ''}`
      };
      
      console.log('Creating processed output stock:', stockData);
      
      // Use the stock transaction API to create the output inventory
      const response = await transactionAPI.createStock(stockData);
      
      return response;
    } catch (error) {
      console.error('Error processing inventory:', error);
      throw error.response?.data || error;
    }
  }
};