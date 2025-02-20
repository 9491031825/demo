import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportToExcel = (data, fileName) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
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
    { header: 'Transaction ID', dataKey: 'transaction_id' },
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