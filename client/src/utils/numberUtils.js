/**
 * Utility functions for number operations
 */

/**
 * Converts a number to words in Indian currency format (Rupees and Paise)
 * @param {number|string} amount - The amount to convert
 * @returns {string} The amount in words
 */
export const numberToWords = (amount) => {
  if (amount === null || amount === undefined || amount === '') {
    return '';
  }

  // Convert to number and handle formatting
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) {
    return '';
  }

  // Split into rupees and paise
  const rupees = Math.floor(numAmount);
  const paise = Math.round((numAmount - rupees) * 100);

  // Arrays for number words
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  // Function to convert a number less than 1000 to words
  const convertLessThanOneThousand = (num) => {
    if (num === 0) {
      return '';
    }
    
    if (num < 20) {
      return ones[num];
    }
    
    const ten = Math.floor(num / 10) % 10;
    const one = num % 10;
    
    return (ten > 0 ? tens[ten] + (one > 0 ? ' ' + ones[one] : '') : ones[one]);
  };

  // Function to convert any number to words (Indian system)
  const convertToWords = (num) => {
    if (num === 0) {
      return 'Zero';
    }
    
    let words = '';
    
    // Handle crores (10 million)
    if (num >= 10000000) {
      words += convertLessThanOneThousand(Math.floor(num / 10000000)) + ' Crore ';
      num %= 10000000;
    }
    
    // Handle lakhs (100 thousand)
    if (num >= 100000) {
      words += convertLessThanOneThousand(Math.floor(num / 100000)) + ' Lakh ';
      num %= 100000;
    }
    
    // Handle thousands
    if (num >= 1000) {
      words += convertLessThanOneThousand(Math.floor(num / 1000)) + ' Thousand ';
      num %= 1000;
    }
    
    // Handle hundreds
    if (num >= 100) {
      words += convertLessThanOneThousand(Math.floor(num / 100)) + ' Hundred ';
      num %= 100;
    }
    
    // Handle tens and ones
    if (num > 0) {
      words += convertLessThanOneThousand(num);
    }
    
    return words.trim();
  };

  // Format the final result
  let result = '';
  
  if (rupees > 0) {
    result += convertToWords(rupees) + ' Rupees';
  }
  
  if (paise > 0) {
    result += (rupees > 0 ? ' and ' : '') + convertToWords(paise) + ' Paise';
  }
  
  return result || 'Zero Rupees';
};

/**
 * Formats a number as Indian currency
 * @param {number|string} amount - The amount to format
 * @returns {string} The formatted amount
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === '') {
    return '';
  }
  
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) {
    return '';
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount);
};

/**
 * Formats a number using the Indian numbering system (e.g., 1,00,000 instead of 100,000)
 * @param {number|string} number - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} The formatted number with commas
 */
export const formatIndianNumber = (number, decimals = 2) => {
  if (number === null || number === undefined || number === '') {
    return '';
  }
  
  const numValue = parseFloat(number);
  if (isNaN(numValue)) {
    return '';
  }
  
  // Format with Indian numbering system (commas at 3,2,2,2... from right)
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numValue);
}; 