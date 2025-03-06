import React, { useState, useRef, useEffect } from 'react';
import { inventoryAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { formatIndianNumber } from '../../utils/numberUtils';
import { useDisableNumberInputScroll } from '../../hooks/useNumberInputs';

export default function BatchProcessingModal({ selectedCustomers, onClose, onSuccess, inventoryItems }) {
  const formRef = useRef(null);
  useDisableNumberInputScroll(formRef);
  
  // Group inventory items by customer
  const [customerInventory, setCustomerInventory] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  useEffect(() => {
    fetchCustomerInventories();
  }, [selectedCustomers.join(',')]);

  const fetchCustomerInventories = async () => {
    try {
      setIsLoading(true);
      
      // Fetch inventory data for each selected customer
      const inventoryPromises = selectedCustomers.map(customerId => 
        inventoryAPI.getCustomerInventory(customerId)
      );
      
      const inventoryResults = await Promise.all(inventoryPromises);
      
      // Organize inventory data by customer
      const inventoryByCustomer = {};
      inventoryResults.forEach(result => {
        // Sort inventory items by quality type
        if (result && result.inventory) {
          result.inventory.sort((a, b) => {
            const numA = parseInt(a.quality_type.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.quality_type.replace(/\D/g, '')) || 0;
            return numA - numB;
          });
        }
        
        inventoryByCustomer[result.customer.id] = result;
      });
      
      setCustomerInventory(inventoryByCustomer);
    } catch (error) {
      toast.error('Failed to load customer inventory data');
      console.error('Error fetching customer inventory data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemSelection = (customerId, itemId) => {
    const customerData = customerInventory[customerId];
    if (!customerData) return;
    
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
        customer_id: customerId,
        customer_name: customerData.customer.name,
        selected_quantity: 0 
      }]);
    }
  };
  
  const handleSelectedQuantityChange = (itemId, quantity) => {
    const numericQuantity = parseFloat(quantity) || 0;
    const item = selectedItems.find(i => i.id === itemId);
    
    if (!item) return;
    
    // Find the original item to check available quantity
    const customerData = customerInventory[item.customer_id];
    const originalItem = customerData?.inventory.find(i => i.id === itemId);
    
    if (!originalItem) return;
    
    // Validate quantity doesn't exceed available
    if (numericQuantity > parseFloat(originalItem.quantity)) {
      toast.error(`Quantity cannot exceed available amount (${originalItem.quantity} kg)`);
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
    
    try {
      setIsSubmitting(true);
      
      // Group items by customer for processing
      const itemsByCustomer = {};
      validSelectedItems.forEach(item => {
        if (!itemsByCustomer[item.customer_id]) {
          itemsByCustomer[item.customer_id] = [];
        }
        itemsByCustomer[item.customer_id].push(item);
      });
      
      console.log('Items grouped by customer:', itemsByCustomer);
      
      // Process each customer's inventory (removing input quantities only)
      const processingPromises = [];
      
      for (const [customerId, items] of Object.entries(itemsByCustomer)) {
        // Calculate this customer's proportion of the total input
        const customerInputQuantity = items.reduce(
          (sum, item) => sum + parseFloat(item.selected_quantity), 0
        );
        
        // Calculate proportional output quantity for this customer
        const customerOutputRatio = customerInputQuantity / totalInputQuantity;
        const customerOutputQuantity = parseFloat((outputQuantity * customerOutputRatio).toFixed(2));
        
        console.log(`Customer ${customerId}: Input=${parseFloat(customerInputQuantity.toFixed(2))}kg, Output=${customerOutputQuantity}kg (${(customerOutputRatio * 100).toFixed(2)}% of total)`);
        
        // Process this customer's inventory (only removing the input items)
        processingPromises.push(
          inventoryAPI.processInventory(customerId, {
            output_quality_type: processingData.output_quality_type,
            output_quantity: customerOutputQuantity,
            processing_cost: parseFloat((processingData.processing_cost * customerOutputRatio).toFixed(2)), // Proportional cost
            selling_price: parseFloat(processingData.selling_price),
            notes: `Batch processing: ${processingData.notes || ''}`,
            selectedItems: items.map(item => ({
              ...item,
              selected_quantity: parseFloat(parseFloat(item.selected_quantity).toFixed(2))
            }))
          })
        );
      }
      
      // Wait for all processing to complete
      await Promise.all(processingPromises);
      
      toast.success('Batch processing completed - items removed from inventory');
      
      // Reset form and notify parent component
      onSuccess();
    } catch (error) {
      console.error('Error recording batch processing:', error);
      const errorMessage = error?.response?.data?.error || error?.error || 'Failed to record batch processing';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-0">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Batch Process Inventory</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <div>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Note:</strong> This will only remove the selected items from inventory. Processed output will not be added to the database.
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Inventory Selection */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3 text-indigo-800 border-b border-indigo-100 pb-1">Select Inventory Items</h3>
                
                {Object.entries(customerInventory).map(([customerId, data]) => (
                  <div key={customerId} className="mb-6 border border-gray-200 rounded-md p-3 sm:p-4 bg-gray-50">
                    <h4 className="text-md font-medium mb-3 text-gray-800 flex items-center">
                      <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                      {data.customer.name}
                    </h4>
                    
                    <div className="overflow-x-auto -mx-3 sm:-mx-4">
                      <div className="inline-block min-w-full align-middle px-3 sm:px-4">
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Select
                              </th>
                              <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Quality Type
                              </th>
                              <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Available
                              </th>
                              <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Average Cost
                              </th>
                              <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Process Quantity
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {data.inventory
                              .filter(item => 
                                // Filter out "Processed" items and items with zero quantity
                                item.quality_type !== "Processed" && parseFloat(item.quantity) > 0
                              )
                              .map((item, index) => {
                                const isSelected = selectedItems.some(i => i.id === item.id);
                                const selectedItem = selectedItems.find(i => i.id === item.id);
                                
                                return (
                                  <tr 
                                    key={item.id} 
                                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isSelected ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''} hover:bg-indigo-50 cursor-pointer transition-colors duration-150`}
                                    onClick={() => handleItemSelection(customerId, item.id)}
                                  >
                                    <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                                      <div className="flex items-center justify-center">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            handleItemSelection(customerId, item.id);
                                          }}
                                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                          aria-label={`Select ${item.quality_type}`}
                                        />
                                      </div>
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">{item.quality_type}</div>
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                                      <div className="text-sm text-gray-500">{formatIndianNumber(item.quantity)} kg</div>
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                                      <div className="text-sm text-gray-500">₹{formatIndianNumber(item.avg_cost)}/kg</div>
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                                      {isSelected && (
                                        <div onClick={(e) => e.stopPropagation()} className="relative">
                                          <input
                                            type="number"
                                            value={selectedItem?.selected_quantity || ''}
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
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Processing Form */}
              <form onSubmit={handleProcessingSubmit} ref={formRef} className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                <h3 className="text-lg font-medium mb-3 text-indigo-800 border-b border-indigo-100 pb-1">Processing Details</h3>
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
                        required
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
                      className="w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Preview Calculations */}
                {preview.show && (
                  <div className="mb-4 p-4 bg-white rounded-md border border-indigo-100">
                    <h4 className="text-md font-medium mb-2 text-indigo-800">Processing Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Total Input Quantity</p>
                        <p className="font-medium text-gray-900">{formatIndianNumber(preview.total_input_quantity)} kg</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Input Cost</p>
                        <p className="font-medium text-gray-900">₹{formatIndianNumber(preview.total_input_cost)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Weighted Avg Cost</p>
                        <p className="font-medium text-gray-900">₹{formatIndianNumber(preview.weighted_avg_cost)}/kg</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Processing Cost</p>
                        <p className="font-medium text-gray-900">₹{formatIndianNumber(preview.processing_cost)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Output Quantity</p>
                        <p className="font-medium text-gray-900">{formatIndianNumber(preview.output_quantity)} kg</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Cost</p>
                        <p className="font-medium text-gray-900">₹{formatIndianNumber(preview.total_cost)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Selling Price</p>
                        <p className="font-medium text-gray-900">₹{formatIndianNumber(preview.selling_price)}/kg</p>
                      </div>
                      <div className="bg-cyan-50 p-2 rounded-md">
                        <p className="text-sm text-gray-500">Total Revenue</p>
                        <p className="font-medium text-gray-900">₹{formatIndianNumber(preview.total_revenue)}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">Profit/Loss</p>
                        <p className={`font-medium ${preview.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{formatIndianNumber(preview.profit_loss)} 
                          ({preview.profit_loss >= 0 ? '+' : ''}{formatIndianNumber(preview.profit_loss_percentage)}%)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || selectedItems.filter(item => item.selected_quantity > 0).length === 0}
                    className={`${
                      isSubmitting || selectedItems.filter(item => item.selected_quantity > 0).length === 0
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    } text-white px-4 py-2 rounded-md transition-colors duration-200 shadow-sm`}
                  >
                    {isSubmitting ? 'Processing...' : 'Remove From Inventory'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 