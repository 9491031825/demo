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
  }
};

export const transactionAPI = {
  create: async (transactionData) => {
    const response = await axios.post('/api/transactions', transactionData);
    return response.data;
  },

  update: async (transactionId, updateData) => {
    const response = await axios.patch(`/api/transactions/${transactionId}`, updateData);
    return response.data;
  },

  getDetails: async (customerId, page = 1, pageSize = 10) => {
    const response = await axios.get(`/api/customers/${customerId}/transactions`, {
      params: { page, page_size: pageSize }
    });
    return response.data;
  }
};

export const paymentAPI = {
  create: async (paymentData) => {
    const response = await axios.post('/api/payments', paymentData);
    return response.data;
  },

  getHistory: async (customerId, page = 1, pageSize = 10) => {
    const response = await axios.get(`/api/payments`, {
      params: { customer_id: customerId, page, page_size: pageSize }
    });
    return response.data;
  }
};