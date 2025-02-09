import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../services/axios';

const initialState = {
  searchResults: [],
  loading: false,
  error: null
};

export const searchCustomers = createAsyncThunk(
  'customers/search',
  async (query, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/customers/search/?q=${query}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const customerSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    clearSearchResults: (state) => {
      state.searchResults = [];
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
        state.error = action.payload?.error || 'Failed to search customers';
        state.searchResults = [];
      });
  },
});

export const { clearSearchResults } = customerSlice.actions;
export default customerSlice.reducer;