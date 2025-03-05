import React from 'react';
import PurchaseInsights from '../dashboard/PurchaseInsights';
import { useParams } from 'react-router-dom';

export default function PurchaseInsightsPage() {
  const { customerId } = useParams();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <PurchaseInsights customerId={customerId} />
    </div>
  );
} 