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
    const totalCost = totalInputCost + processingCost;
    
    // Calculate profit/loss
    const totalRevenue = outputQuantity * sellingPrice;
    const profitLoss = totalRevenue - totalCost;
    
    // Calculate profit/loss percentage
    const profitLossPercentage = totalCost > 0 
      ? (profitLoss / totalCost) * 100 
      : 0;
    
    // Update preview
    setPreview({
      total_input_quantity: totalInputQuantity,
      total_input_cost: totalInputCost,
      weighted_avg_cost: weightedAvgCost,
      output_quantity: outputQuantity,
      processing_cost: processingCost,
      total_cost: totalCost,
      selling_price: sellingPrice,
      profit_loss: profitLoss,
      profit_loss_percentage: profitLossPercentage,
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
    
    const sellingPrice = parseFloat(processingData.selling_price);
    if (!sellingPrice || sellingPrice <= 0) {
      toast.error('Please enter a valid selling price');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Create expense entries for each selected item
      const expensePromises = validSelectedItems.map(item => 
        inventoryAPI.addExpense(customerId, {
          quality_type: item.quality_type,
          weight_loss: item.selected_quantity,
          expenditure: 0, // No additional expenditure for processing
          notes: `Used for processing: ${processingData.output_quality_type} - ${processingData.notes}`
        })
      );
      
      // Add processing cost as a separate expense to one of the items
      if (parseFloat(processingData.processing_cost) > 0 && validSelectedItems.length > 0) {
        expensePromises.push(
          inventoryAPI.addExpense(customerId, {
            quality_type: validSelectedItems[0].quality_type,
            weight_loss: 0, // No weight loss for processing cost
            expenditure: processingData.processing_cost,
            notes: `Processing cost for: ${processingData.output_quality_type} - ${processingData.notes}`
          })
        );
      }
      
      // Wait for all expense entries to be created
      await Promise.all(expensePromises);
      
      toast.success('Processing recorded successfully');
      
      // Reset form
      setProcessingData({
        output_quantity: '',
        output_quality_type: 'Processed',
        selling_price: '',
        processing_cost: '',
        notes: ''
      });
      
      setSelectedItems([]);
      setPreview({ show: false });
      setShowProcessingForm(false);
      
      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error recording processing:', error);
      const errorMessage = error?.response?.data?.error || 'Failed to record processing';
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
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-4">
            <button 
              onClick={handleBack} 
              className="text-indigo-600 hover:text-indigo-900"
            >
              ← Back to Inventory
            </button>
            <button 
              onClick={handleBackToDashboard} 
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </button>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold text-gray-900">
              Inventory Management for {customerData.customer.name}
            </h2>
            <p className="text-sm text-gray-600">
              {currentTime}
            </p>
          </div>
        </div>

        {/* Customer Details */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">Customer Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
            <div className="col-span-2">
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-medium">{customerData.customer.address || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Inventory Summary */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium">Inventory Summary</h3>
            <button
              onClick={() => setShowProcessingForm(!showProcessingForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              {showProcessingForm ? 'Cancel' : 'Process Inventory'}
            </button>
          </div>
          
          {customerData.inventory.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-md text-center">
              <p className="text-gray-500">No inventory items found for this customer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {showProcessingForm && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Select
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quality Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Average Cost
                    </th>
                    {showProcessingForm && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Process Quantity
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customerData.inventory.map((item) => (
                    <tr key={item.id}>
                      {showProcessingForm && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedItems.some(i => i.id === item.id)}
                            onChange={() => handleItemSelection(item.id)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.quality_type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{formatIndianNumber(item.quantity)} kg</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">₹{formatIndianNumber(item.total_cost)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">₹{formatIndianNumber(item.avg_cost)}/kg</div>
                      </td>
                      {showProcessingForm && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {selectedItems.some(i => i.id === item.id) && (
                            <input
                              type="number"
                              value={selectedItems.find(i => i.id === item.id)?.selected_quantity || ''}
                              onChange={(e) => handleSelectedQuantityChange(item.id, e.target.value)}
                              placeholder="Enter quantity"
                              className="w-24 rounded-md border-gray-300"
                              min="0"
                              max={item.quantity}
                              step="0.01"
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Processing Form */}
        {showProcessingForm && (
          <div className="mb-6 p-4 border border-gray-200 rounded-md">
            <h3 className="text-lg font-medium mb-3">Process Inventory</h3>
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
                    className="w-full rounded-md border-gray-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Output Quantity (kg)
                  </label>
                  <input
                    type="number"
                    value={processingData.output_quantity}
                    onChange={(e) => handleProcessingInputChange('output_quantity', e.target.value)}
                    placeholder="Enter output quantity"
                    className="w-full rounded-md border-gray-300"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Processing Cost (₹)
                  </label>
                  <input
                    type="number"
                    value={processingData.processing_cost}
                    onChange={(e) => handleProcessingInputChange('processing_cost', e.target.value)}
                    placeholder="Enter processing cost"
                    className="w-full rounded-md border-gray-300"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selling Price per kg (₹)
                  </label>
                  <input
                    type="number"
                    value={processingData.selling_price}
                    onChange={(e) => handleProcessingInputChange('selling_price', e.target.value)}
                    placeholder="Enter selling price per kg"
                    className="w-full rounded-md border-gray-300"
                    min="0"
                    step="0.01"
                    required
                  />
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
                    className="w-full rounded-md border-gray-300"
                  />
                </div>
              </div>

              {/* Preview Calculations */}
              {preview.show && (
                <div className="mb-4 p-4 bg-gray-50 rounded-md">
                  <h4 className="text-md font-medium mb-2">Processing Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Input Quantity</p>
                      <p className="font-medium">{formatIndianNumber(preview.total_input_quantity)} kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Input Cost</p>
                      <p className="font-medium">₹{formatIndianNumber(preview.total_input_cost)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Weighted Avg Cost</p>
                      <p className="font-medium">₹{formatIndianNumber(preview.weighted_avg_cost)}/kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Processing Cost</p>
                      <p className="font-medium">₹{formatIndianNumber(preview.processing_cost)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Output Quantity</p>
                      <p className="font-medium">{formatIndianNumber(preview.output_quantity)} kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Cost</p>
                      <p className="font-medium">₹{formatIndianNumber(preview.total_cost)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Selling Price</p>
                      <p className="font-medium">₹{formatIndianNumber(preview.selling_price)}/kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Revenue</p>
                      <p className="font-medium">₹{formatIndianNumber(preview.selling_price * preview.output_quantity)}</p>
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

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${
                    isSubmitting 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  } text-white px-4 py-2 rounded-md transition-colors`}
                >
                  {isSubmitting ? 'Processing...' : 'Record Processing'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Expense History */}
        <div>
          <h3 className="text-lg font-medium mb-3">Expense History</h3>
          {expenses.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-md text-center">
              <p className="text-gray-500">No expense records found for this customer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                      Expenditure
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Old Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      New Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Old Avg Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      New Avg Cost
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
                          {expense.inventory_details?.quality_type}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatIndianNumber(expense.weight_loss)} kg
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          ₹{formatIndianNumber(expense.expenditure)}
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
                          ₹{formatIndianNumber(expense.old_avg_cost)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          ₹{formatIndianNumber(expense.new_avg_cost)}
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
          )}
        </div>
      </div>
    </div>
  );
} 