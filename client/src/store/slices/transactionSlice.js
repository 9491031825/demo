import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { transactionAPI } from '../../services/api';
import axiosInstance from '../../services/axios';

export const createTransaction = createAsyncThunk(
  'transactions/create',
  async (transactionData, { rejectWithValue }) => {
    try {
      console.log('Making API call with:', transactionData);
      const response = await axiosInstance.post('/api/transactions/create/', transactionData);
      console.log('API Response:', response);
      return response.data;
    } catch (error) {
      console.error('API Error:', error.response || error);
      return rejectWithValue(
        error.response?.data || { 
          error: 'Network error occurred while saving transaction'
        }
      );
    }
  }
);

export const searchTransactions = createAsyncThunk(
  'transactions/search',
  async ({ query = '', page = 1, pageSize = 10 }) => {
    const response = await transactionAPI.search(query, page, pageSize);
    return response;
  }
);

export const fetchTransactions = createAsyncThunk(
  'transactions/fetch',
  async ({ customerId, page = 1, pageSize = 10 }) => {
    const response = await transactionAPI.getDetails(customerId, page, pageSize);
    return response;
  }
);

const initialState = {
  transactions: [],
  currentTransaction: null,
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  },
};

const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setCurrentTransaction: (state, action) => {
      state.currentTransaction = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updatePagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createTransaction.pending, (state) => {
        state.loading = true;
      })
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = [...state.transactions, ...action.payload];
      })
      .addCase(createTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload.results;
        state.pagination = {
          currentPage: action.payload.page,
          totalPages: Math.ceil(action.payload.count / 10),
          totalItems: action.payload.count
        };
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to fetch transactions';
      });
  },
});

export const { setCurrentTransaction, clearError, updatePagination } = transactionSlice.actions;
export default transactionSlice.reducer;