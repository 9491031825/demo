import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { inventoryAPI, customerAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { formatIndianNumber } from '../../utils/numberUtils';
import { useDisableNumberInputScroll } from '../../hooks/useNumberInputs';

export default function CustomerInventory() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const formRef = useRef(null);
  useDisableNumberInputScroll(formRef);
  
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState({
    customer: {},
    inventory: []
  });
  const [expenses, setExpenses] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProcessingForm, setShowProcessingForm] = useState(false);
  
  // Selected inventory items for processing
  const [selectedItems, setSelectedItems] = useState([]);
  
  // Processing form state
  const [processingData, setProcessingData] = useState({
    output_quantity: '',
    output_quality_type: 'Processed',
    selling_price: '',
    processing_cost: '',
    notes: ''
  });
  
  // Preview state for showing calculations
  const [preview, setPreview] = useState({
    total_input_quantity: 0,
    total_input_cost: 0,
    weighted_avg_cost: 0,
    output_quantity: 0,
    processing_cost: 0,
    total_cost: 0,
    selling_price: 0,
    profit_loss: 0,
    profit_loss_percentage: 0,
    total_revenue: 0,
    show: false
  });
  
  const qualityTypes = ['Type 1', 'Type 2', 'Type 3', 'Type 4'];

  useEffect(() => {
    fetchData();
    
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [customerId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [inventoryData, expensesData] = await Promise.all([
        inventoryAPI.getCustomerInventory(customerId),
        inventoryAPI.getExpenses(customerId)
      ]);
      
      // Sort inventory by quality type
      if (inventoryData && inventoryData.inventory) {
        inventoryData.inventory.sort((a, b) => {
          const numA = parseInt(a.quality_type.replace(/\D/g, '')) || 0;
          const numB = parseInt(b.quality_type.replace(/\D/g, '')) || 0;
          return numA - numB;
        });
      }
      
      // Sort expenses by date (newest first) and then by quality type
      if (expensesData) {
        expensesData.sort((a, b) => {
          // First sort by date (newest first)
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          if (dateA.getTime() !== dateB.getTime()) {
            return dateB.getTime() - dateA.getTime();
          }
          
          // Then sort by quality type
          const qualityA = a.quality_type || a.inventory_details?.quality_type || '';
          const qualityB = b.quality_type || b.inventory_details?.quality_type || '';
          const numA = parseInt(qualityA.replace(/\D/g, '')) || 0;
          const numB = parseInt(qualityB.replace(/\D/g, '')) || 0;
          return numA - numB;
        });
      }
      
      setCustomerData(inventoryData);
      setExpenses(expensesData);
    } catch (error) {
      toast.error('Failed to load customer inventory data');
      console.error('Error fetching customer inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelection = (itemId) => {
    const item = customerData.inventory.find(i => i.id === itemId);
    
    if (!item) return;
    
    // Check if item is already selected
    const isSelected = selectedItems.some(i => i.id === itemId);
    
    if (isSelected) {
      // Remove from selection
      setSelectedItems(selectedItems.filter(i => i.id !== itemId));
    } else {
      // Add to selection with quantity = 0
      setSelectedItems([...selectedItems, { 
        ...item, 
        selected_quantity: 0 
      }]);
    }
  };
  
  const handleSelectedQuantityChange = (itemId, quantity) => {
    const numericQuantity = parseFloat(quantity) || 0;
    const item = customerData.inventory.find(i => i.id === itemId);
    
    if (!item) return;
    
    // Validate quantity doesn't exceed available
    if (numericQuantity > parseFloat(item.quantity)) {
      toast.error(`Quantity cannot exceed available amount (${item.quantity} kg)`);
      return;
    }
    
    // Update selected quantity
    setSelectedItems(selectedItems.map(i => 
      i.id === itemId 
        ? { ...i, selected_quantity: numericQuantity } 
        : i
    ));
    
    // Update preview calculations
    calculateProcessingPreview({
      ...processingData,
      selectedItems: selectedItems.map(i => 
        i.id === itemId 
          ? { ...i, selected_quantity: numericQuantity } 
          : i
      )
    });
  };

  const handleProcessingInputChange = (field, value) => {
    // Add validation for output quantity
    if (field === 'output_quantity') {
      const numericValue = parseFloat(value) || 0;
      const totalInputQuantity = selectedItems
        .filter(item => item.selected_quantity > 0)
        .reduce((sum, item) => sum + parseFloat(item.selected_quantity), 0);
      
      // Check if output quantity exceeds total input quantity
      if (numericValue > totalInputQuantity) {
        toast.error(`Output quantity cannot exceed total input quantity (${formatIndianNumber(totalInputQuantity)} kg)`);
        // Set value to total input quantity
        value = totalInputQuantity.toString();
      }
    }
    
    setProcessingData({
      ...processingData,
      [field]: value
    });
    
    // Calculate preview
    calculateProcessingPreview({
      ...processingData,
      [field]: value,
      selectedItems
    });
  };
  
  const calculateProcessingPreview = (data) => {
    // Only calculate if we have selected items with quantities
    const validSelectedItems = (data.selectedItems || selectedItems)
      .filter(item => item.selected_quantity > 0);
    
    if (validSelectedItems.length === 0) {
      setPreview({ show: false });
      return;
    }
    
    // Calculate total input quantity and cost
    let totalInputQuantity = 0;
    let totalInputCost = 0;
    
    validSelectedItems.forEach(item => {
      const quantity = parseFloat(item.selected_quantity);
      const avgCost = parseFloat(item.avg_cost);
      
      totalInputQuantity += quantity;
      totalInputCost += quantity * avgCost;
    });
    
    // Calculate weighted average cost
    const weightedAvgCost = totalInputQuantity > 0 
      ? totalInputCost / totalInputQuantity 
      : 0;
    
    // Get other values
    const outputQuantity = parseFloat(data.output_quantity) || 0;
    const processingCost = parseFloat(data.processing_cost) || 0;
    const sellingPrice = parseFloat(data.selling_price) || 0;
    
    // Calculate total cost (input cost + processing cost)
    const totalCost = parseFloat((totalInputCost + processingCost).toFixed(2));
    
    // Calculate profit/loss
    const totalRevenue = parseFloat((outputQuantity * sellingPrice).toFixed(2));
    const profitLoss = parseFloat((totalRevenue - totalCost).toFixed(2));
    
    // Calculate profit/loss percentage
    const profitLossPercentage = totalCost > 0 
      ? parseFloat(((profitLoss / totalCost) * 100).toFixed(2))
      : 0;
    
    // Update preview
    setPreview({
      total_input_quantity: parseFloat(totalInputQuantity.toFixed(2)),
      total_input_cost: parseFloat(totalInputCost.toFixed(2)),
      weighted_avg_cost: parseFloat(weightedAvgCost.toFixed(2)),
      output_quantity: parseFloat(outputQuantity.toFixed(2)),
      processing_cost: parseFloat(processingCost.toFixed(2)),
      total_cost: totalCost,
      selling_price: parseFloat(sellingPrice.toFixed(2)),
      profit_loss: profitLoss,
      profit_loss_percentage: profitLossPercentage,
      total_revenue: totalRevenue,
      show: true
    });
  };

  const handleProcessingSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    const validSelectedItems = selectedItems.filter(item => item.selected_quantity > 0);
    
    if (validSelectedItems.length === 0) {
      toast.error('Please select at least one inventory item and specify quantity');
      return;
    }
    
    const outputQuantity = parseFloat(processingData.output_quantity);
    if (!outputQuantity || outputQuantity <= 0) {
      toast.error('Please enter a valid output quantity');
      return;
    }
    
    // Calculate total input quantity
    const totalInputQuantity = validSelectedItems.reduce(
      (sum, item) => sum + parseFloat(item.selected_quantity), 0
    );
    
    // Validate output quantity doesn't exceed input quantity
    if (outputQuantity > totalInputQuantity) {
      toast.error(`Output quantity (${formatIndianNumber(outputQuantity)} kg) cannot exceed total input quantity (${formatIndianNumber(totalInputQuantity)} kg)`);
      return;
    }
    
    const sellingPrice = parseFloat(processingData.selling_price);
    if (!sellingPrice || sellingPrice <= 0) {
      toast.error('Please enter a valid selling price');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Process the inventory
      const response = await inventoryAPI.processInventory(customerId, {
        output_quality_type: processingData.output_quality_type,
        output_quantity: parseFloat(outputQuantity.toFixed(2)),
        processing_cost: parseFloat(parseFloat(processingData.processing_cost || 0).toFixed(2)),
        selling_price: parseFloat(parseFloat(processingData.selling_price).toFixed(2)),
        notes: processingData.notes || '',
        selectedItems: validSelectedItems.map(item => ({
          ...item,
          selected_quantity: parseFloat(parseFloat(item.selected_quantity).toFixed(2))
        }))
      });
      
      console.log('Processing response:', response);
      
      // Refresh inventory data
      fetchData();
      
      // Reset form and close modal
      setProcessingData({
        output_quantity: '',
        output_quality_type: 'Processed',
        selling_price: '',
        processing_cost: '',
        notes: ''
      });
      setSelectedItems([]);
      setShowProcessingForm(false);
      
      toast.success('Processing recorded successfully');
    } catch (error) {
      console.error('Error recording processing:', error);
      const errorMessage = error?.response?.data?.error || error?.error || 'Failed to record processing';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => navigate('/inventory');
  
  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="space-y-6 px-2 sm:px-0">
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleBack} 
              className="flex items-center px-3 py-2 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Inventory
            </button>
            <button 
              onClick={handleBackToDashboard} 
              className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Dashboard
            </button>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold text-gray-900">
              {customerData.customer.name}
            </h2>
            <p className="text-sm text-gray-600">
              {currentTime}
            </p>
          </div>
        </div>

        {/* Customer Details */}
        <div className="mb-6 bg-gradient-to-r from-indigo-50 to-white p-4 rounded-lg border border-indigo-100">
          <h3 className="text-lg font-medium mb-3 text-indigo-800 border-b border-indigo-100 pb-1">Customer Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{customerData.customer.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Company</p>
              <p className="font-medium">{customerData.customer.company_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">GST Number</p>
              <p className="font-medium">{customerData.customer.gst_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{customerData.customer.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{customerData.customer.phone_number}</p>
            </div>
            <div className="col-span-1 sm:col-span-2 md:col-span-3">
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-medium">{customerData.customer.address || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Inventory Summary */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
            <h3 className="text-lg font-medium text-indigo-800 border-b border-indigo-100 pb-1">Inventory Summary</h3>
            <button
              onClick={() => setShowProcessingForm(!showProcessingForm)}
              className={`px-4 py-2 rounded-md transition-colors duration-200 flex items-center ${
                showProcessingForm 
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {showProcessingForm ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Cancel
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Process Inventory
                </>
              )}
            </button>
          </div>
          
          {customerData.inventory.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-md text-center border border-gray-200">
              <p className="text-gray-500">No inventory items found for this customer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0 border border-gray-200 rounded-lg">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {showProcessingForm && (
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Select
                        </th>
                      )}
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quality Type
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Cost
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Average Cost
                      </th>
                      {showProcessingForm && (
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Process Quantity
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customerData.inventory
                      .filter(item => 
                        // Filter out "Processed" items and items with zero quantity
                        item.quality_type !== "Processed" && parseFloat(item.quantity) > 0
                      )
                      .map((item, index) => {
                        const isSelected = selectedItems.some(i => i.id === item.id);
                        return (
                          <tr 
                            key={item.id} 
                            className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isSelected ? 'bg-indigo-50' : ''} ${showProcessingForm ? 'hover:bg-indigo-50 cursor-pointer' : ''} transition-colors duration-150`}
                            onClick={showProcessingForm ? () => handleItemSelection(item.id) : undefined}
                          >
                            {showProcessingForm && (
                              <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                                <div className="flex items-center justify-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleItemSelection(item.id);
                                    }}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    aria-label={`Select ${item.quality_type}`}
                                  />
                                </div>
                              </td>
                            )}
                            <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{item.quality_type}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{formatIndianNumber(item.quantity)} kg</div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-500">₹{formatIndianNumber(item.total_cost)}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-500">₹{formatIndianNumber(item.avg_cost)}/kg</div>
                            </td>
                            {showProcessingForm && (
                              <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                                {isSelected && (
                                  <div onClick={(e) => e.stopPropagation()} className="relative">
                                    <input
                                      type="number"
                                      value={selectedItems.find(i => i.id === item.id)?.selected_quantity || ''}
                                      onChange={(e) => handleSelectedQuantityChange(item.id, e.target.value)}
                                      placeholder="Enter quantity"
                                      className="w-28 rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all duration-200 pl-2 pr-8 py-1 text-right"
                                      min="0"
                                      max={item.quantity}
                                      step="0.01"
                                    />
                                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                                      kg
                                    </span>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Processing Form */}
        {showProcessingForm && (
          <div className="mb-6 p-4 border border-indigo-200 rounded-md bg-indigo-50">
            <h3 className="text-lg font-medium mb-3 text-indigo-800 border-b border-indigo-100 pb-1">Process Inventory</h3>
            <form onSubmit={handleProcessingSubmit} ref={formRef}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Output Quality Type
                  </label>
                  <input
                    type="text"
                    value={processingData.output_quality_type}
                    onChange={(e) => handleProcessingInputChange('output_quality_type', e.target.value)}
                    placeholder="Enter output quality type"
                    className="w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Output Quantity (kg)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={processingData.output_quantity}
                      onChange={(e) => handleProcessingInputChange('output_quantity', e.target.value)}
                      placeholder="Enter output quantity"
                      className="w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all duration-200 pr-8"
                      min="0"
                      step="0.01"
                      required
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                      kg
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Processing Cost (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={processingData.processing_cost}
                      onChange={(e) => handleProcessingInputChange('processing_cost', e.target.value)}
                      placeholder="Enter processing cost"
                      className="w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all duration-200 pl-7"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selling Price (₹/kg)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={processingData.selling_price}
                      onChange={(e) => handleProcessingInputChange('selling_price', e.target.value)}
                      placeholder="Enter selling price"
                      className="w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all duration-200 pl-7 pr-8"
                      min="0"
                      step="0.01"
                      required
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                      /kg
                    </span>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={processingData.notes}
                    onChange={(e) => handleProcessingInputChange('notes', e.target.value)}
                    placeholder="Enter notes"
                    className="w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all duration-200"
                  />
                </div>
              </div>

              {/* Preview Calculations */}
              {preview.show && (
                <div className="mb-4 p-4 bg-white rounded-md border border-indigo-100 shadow-sm">
                  <h4 className="text-md font-medium mb-2 text-indigo-800 border-b border-indigo-100 pb-1">Processing Summary</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-2 rounded-md">
                      <p className="text-sm text-gray-500">Total Input Quantity</p>
                      <p className="font-medium">{formatIndianNumber(preview.total_input_quantity)} kg</p>
                    </div>
                    <div className="bg-purple-50 p-2 rounded-md">
                      <p className="text-sm text-gray-500">Total Input Cost</p>
                      <p className="font-medium">₹{formatIndianNumber(preview.total_input_cost)}</p>
                    </div>
                    <div className="bg-indigo-50 p-2 rounded-md">
                      <p className="text-sm text-gray-500">Weighted Avg Cost</p>
                      <p className="font-medium">₹{formatIndianNumber(preview.weighted_avg_cost)}/kg</p>
                    </div>
                    <div className="bg-red-50 p-2 rounded-md">
                      <p className="text-sm text-gray-500">Processing Cost</p>
                      <p className="font-medium">₹{formatIndianNumber(preview.processing_cost)}</p>
                    </div>
                    <div className="bg-green-50 p-2 rounded-md">
                      <p className="text-sm text-gray-500">Output Quantity</p>
                      <p className="font-medium">{formatIndianNumber(preview.output_quantity)} kg</p>
                    </div>
                    <div className="bg-yellow-50 p-2 rounded-md">
                      <p className="text-sm text-gray-500">Total Cost</p>
                      <p className="font-medium">₹{formatIndianNumber(preview.total_cost)}</p>
                    </div>
                    <div className="bg-teal-50 p-2 rounded-md">
                      <p className="text-sm text-gray-500">Selling Price</p>
                      <p className="font-medium">₹{formatIndianNumber(preview.selling_price)}/kg</p>
                    </div>
                    <div className="bg-cyan-50 p-2 rounded-md">
                      <p className="text-sm text-gray-500">Total Revenue</p>
                      <p className="font-medium">₹{formatIndianNumber(preview.total_revenue)}</p>
                    </div>
                    <div className="col-span-1 sm:col-span-2 md:col-span-4 bg-gray-50 p-2 rounded-md">
                      <p className="text-sm text-gray-500">Profit/Loss</p>
                      <p className={`font-medium ${preview.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{formatIndianNumber(preview.profit_loss)} 
                        ({preview.profit_loss >= 0 ? '+' : ''}{formatIndianNumber(preview.profit_loss_percentage)}%)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${
                    isSubmitting 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  } text-white px-4 py-2 rounded-md transition-colors duration-200 flex items-center`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Record Processing
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Expense History */}
        <div>
          <h3 className="text-lg font-medium mb-3 text-indigo-800 border-b border-indigo-100 pb-1">Expense History</h3>
          {expenses.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-md text-center border border-gray-200">
              <p className="text-gray-500">No expense records found for this customer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0 border border-gray-200 rounded-lg">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quality Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Weight Loss
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Old Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        New Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(expense.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {expense.quality_type || expense.inventory_details?.quality_type || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {formatIndianNumber(expense.weight_loss)} kg
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {formatIndianNumber(expense.old_quantity)} kg
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {formatIndianNumber(expense.new_quantity)} kg
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {expense.notes || 'N/A'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 