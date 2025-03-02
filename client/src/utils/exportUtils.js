import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportToExcel = (data, fileName, customerInfo) => {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  // Create header rows with customer information
  const headerRows = [
    ['Customer Transaction History'],
    [''],
    [`Customer: ${customerInfo.name}`],
    [`Phone: ${customerInfo.phone_number}`],
    [`Company: ${customerInfo.company_name || 'N/A'}`],
    [`Period: ${customerInfo.dateRange || 'All Time'}`],
    ['']
  ];
  
  // Add balance information if available
  if (customerInfo.balance) {
    headerRows.push([`Total Pending: ₹${customerInfo.balance.totalPending}`]);
    headerRows.push([`Total Paid: ₹${customerInfo.balance.totalPaid}`]);
    
    if (customerInfo.balance.isAdvance) {
      headerRows.push([`Advance Amount: ₹${customerInfo.balance.advanceAmount}`]);
    } else {
      headerRows.push([`Net Balance: ₹${Math.abs(customerInfo.balance.netBalance)}`]);
    }
    
    headerRows.push(['']);
  }
  
  // Add a separator row
  headerRows.push(['Transaction Details:']);
  headerRows.push(['']);
  
  // Convert data to worksheet
  const ws = XLSX.utils.json_to_sheet([]);
  
  // Add header rows to worksheet
  XLSX.utils.sheet_add_aoa(ws, headerRows, { origin: 'A1' });
  
  // Add data starting after the header
  XLSX.utils.sheet_add_json(ws, data, { 
    origin: `A${headerRows.length + 1}`, 
    skipHeader: false 
  });
  
  // Set column widths
  const columnWidths = [
    { wch: 12 },  // Date
    { wch: 12 },  // Time
    { wch: 15 },  // Type
    { wch: 30 },  // Details
    { wch: 25 },  // Bank Account
    { wch: 15 },  // Amount
    { wch: 10 },  // Status
    { wch: 15 },  // Balance
    { wch: 20 }   // Notes
  ];
  
  ws['!cols'] = columnWidths;
  
  // Style the header (bold, larger font)
  // Note: XLSX styling is limited in the free version
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  
  // Write to file
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const exportToPDF = (data, fileName, customerInfo) => {
  const doc = new jsPDF();
  
  // Add customer information at the top
  doc.setFontSize(16);
  doc.text("Customer Transaction History", 14, 15);
  
  doc.setFontSize(11);
  doc.text(`Customer: ${customerInfo.name}`, 14, 25);
  doc.text(`Phone: ${customerInfo.phone_number}`, 14, 32);
  doc.text(`Company: ${customerInfo.company_name || 'N/A'}`, 14, 39);
  
  // Add date range if provided
  if (customerInfo.dateRange) {
    doc.text(`Period: ${customerInfo.dateRange}`, 14, 46);
  }
  
  const tableColumns = [
    { header: 'Date', dataKey: 'date' },
    { header: 'Time', dataKey: 'time' },
    { header: 'Type', dataKey: 'type' },
    { header: 'Details', dataKey: 'details' },
    { header: 'Bank Account', dataKey: 'bank_account' },
    { header: 'Amount', dataKey: 'amount' },
    { header: 'Status', dataKey: 'status' },
    { header: 'Balance', dataKey: 'balance' },
    { header: 'Notes', dataKey: 'notes' }
  ];

  doc.autoTable({
    startY: customerInfo.dateRange ? 50 : 43,
    columns: tableColumns,
    body: data,
    theme: 'grid',
    styles: { fontSize: 8 },
    headerStyles: { fillColor: [41, 128, 185], fontSize: 8, fontStyle: 'bold' }
  });

  doc.save(`${fileName}.pdf`);
}; 