import axios from './axios';

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

  getTransactions: async (customerId, page = 1, pageSize = 10) => {
    const response = await axios.get(`/api/customers/${customerId}/transactions/`, {
      params: { page, page_size: pageSize }
    });
    return response.data;
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
        net_balance: parseFloat(response.data.net_balance || 0)
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
        paymentsData.map(payment => ({
          customer_id: payment.customer_id,
          payment_type: payment.payment_type,
          amount_paid: parseFloat(payment.amount_paid),
          bank_account: payment.bank_account,
          transaction_id: payment.transaction_id,
          notes: payment.notes,
          transaction_date: payment.transaction_date,
          transaction_time: payment.transaction_time,
          payment_status: payment.payment_status
        }))
      );
      return response.data;
    } catch (error) {
      console.error('Create bulk payment error:', error);
      throw error.response?.data || error;
    }
  },
};