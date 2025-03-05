import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Dashboard from './components/dashboard/Dashboard';
import LoginForm from './components/auth/LoginForm';
import OTPVerification from './components/auth/OTPVerification';
import SessionTimeout from './components/common/SessionTimeout';
import AllTransactionsHistory from './components/dashboard/AllTransactionsHistory';
import StockTransactionForm from './components/dashboard/StockTransactionForm';
import PaymentTransactionForm from './components/dashboard/PaymentTransactionForm';
import CustomerListPage from './components/customers/CustomerListPage';
import CustomerDetailsPage from './components/customers/CustomerDetailsPage';
import BulkSettlementPage from './components/dashboard/BulkSettlementPage';
import SettlementPage from './components/dashboard/SettlementPage';
import GoogleAuthSetup from './components/auth/GoogleAuthSetup';
import InventoryManagement from './components/dashboard/InventoryManagement';
import CustomerInventory from './components/dashboard/CustomerInventory';
import PurchaseInsightsPage from './components/pages/PurchaseInsightsPage';
import PaymentInsightsPage from './components/pages/PaymentInsightsPage';
import { disableNumberInputScrolling } from './utils/inputUtils';

function App() {
  const AdminRedirect = () => {
    useEffect(() => {
      window.location.href = 'http://127.0.0.1:8000/admin/';
    }, []);
    return null;
  };

  // Disable scroll wheel on number inputs when the app loads
  useEffect(() => {
    disableNumberInputScrolling();
  }, []);

  return (
    <Router>
      <SessionTimeout />
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/verify-otp" element={<OTPVerification />} />
        <Route path="/setup-google-auth" element={<GoogleAuthSetup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminRedirect />} />
        <Route path="/transactions/history" element={<AllTransactionsHistory />} />
        <Route path="/transactions/stock/:customerId" element={<StockTransactionForm />} />
        <Route path="/transactions/payment/:customerId" element={<PaymentTransactionForm />} />
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/customers/:customerId" element={<CustomerDetailsPage />} />
        <Route path="/bulk-settlement" element={<BulkSettlementPage />} />
        <Route path="/settlement" element={<SettlementPage />} />
        <Route path="/inventory" element={<InventoryManagement />} />
        <Route path="/inventory/:customerId" element={<CustomerInventory />} />
        <Route path="/insights/purchases" element={<PurchaseInsightsPage />} />
        <Route path="/insights/purchases/:customerId" element={<PurchaseInsightsPage />} />
        <Route path="/insights/payments" element={<PaymentInsightsPage />} />
        <Route path="/insights/payments/:customerId" element={<PaymentInsightsPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;