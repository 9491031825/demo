import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { customerAPI } from '../../services/api';

export const searchCustomers = createAsyncThunk(
  'customers/search',
  async (query, { rejectWithValue }) => {
    try {
      const data = await customerAPI.search(query);
      return data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const createCustomer = createAsyncThunk(
  'customers/create',
  async (customerData, { rejectWithValue }) => {
    try {
      const data = await customerAPI.create(customerData);
      return data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const initialState = {
  customers: [],
  selectedCustomer: null,
  loading: false,
  error: null,
  searchResults: [],
};

const customerSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    setSelectedCustomer: (state, action) => {
      state.selectedCustomer = action.payload;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Search failed';
      })
      .addCase(createCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.customers.push(action.payload);
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to create customer';
      });
  },
});

export const { setSelectedCustomer, clearSearchResults, clearError } = customerSlice.actions;
export default customerSlice.reducer;