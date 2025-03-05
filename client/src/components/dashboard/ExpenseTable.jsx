import React from 'react';
import { Table, Badge } from 'react-bootstrap';
import { formatDate, formatCurrency } from '../../utils/formatters';

const ExpenseTable = ({ expenses }) => {
  if (!expenses || expenses.length === 0) {
    return <p className="text-muted">No expenses recorded yet.</p>;
  }

  return (
    <div className="table-responsive">
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Date</th>
            <th>Quality Type</th>
            <th>Weight Loss (kg)</th>
            <th>Quantity Change</th>
            <th>Notes</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map(expense => (
            <tr key={expense.id}>
              <td>{formatDate(expense.created_at)}</td>
              <td>{expense.quality_type}</td>
              <td>{parseFloat(expense.weight_loss).toFixed(2)}</td>
              <td>
                {parseFloat(expense.old_quantity).toFixed(2)} → {parseFloat(expense.new_quantity).toFixed(2)}
              </td>
              <td>{expense.notes || '-'}</td>
              <td>
                {expense.is_processing ? (
                  <Badge bg="info">Processing</Badge>
                ) : (
                  <Badge bg="secondary">Other</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default ExpenseTable; 