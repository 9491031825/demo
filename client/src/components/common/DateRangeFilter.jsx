import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { toast } from 'react-toastify';
import "react-datepicker/dist/react-datepicker.css";

const DateRangeFilter = ({ onApplyFilter }) => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const handleDateFilter = () => {
    if (!startDate || !endDate) {
      toast.warning('Please select both start and end dates');
      return;
    }

    if (endDate < startDate) {
      toast.error('End date cannot be before start date');
      return;
    }

    // Format dates for API
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const dateFilter = {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      filterType: 'date_range'
    };

    onApplyFilter(dateFilter);
  };

  const clearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
    onApplyFilter(null); // Clear the filter
  };

  return (
    <div className="flex items-center space-x-2 mb-4">
      <DatePicker
        selected={startDate}
        onChange={date => setStartDate(date)}
        placeholderText="Start Date"
        className="px-2 py-1 border rounded"
        maxDate={endDate || new Date()}
        dateFormat="dd/MM/yyyy"
      />
      <DatePicker
        selected={endDate}
        onChange={date => setEndDate(date)}
        placeholderText="End Date"
        className="px-2 py-1 border rounded"
        minDate={startDate}
        maxDate={new Date()}
        dateFormat="dd/MM/yyyy"
      />
      <button
        onClick={handleDateFilter}
        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Filter
      </button>
      {(startDate || endDate) && (
        <button
          onClick={clearDateFilter}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default DateRangeFilter; 