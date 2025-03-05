import React from 'react';
import PaymentInsights from '../dashboard/PaymentInsights';
import { useParams } from 'react-router-dom';

export default function PaymentInsightsPage() {
  const { customerId } = useParams();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <PaymentInsights customerId={customerId} />
    </div>
  );
} 