

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import DistributorOnboarding from './components/DistributorOnboarding';
// FIX: Changed to a default import to match the export style of other page components.
import PlaceOrder from './components/PlaceOrder';
import OrderHistory from './components/OrderHistory';
import RechargeWallet from './components/RechargeWallet';
import SalesPage from './components/SalesPage';
import ManageSKUs from './components/ManageSKUs';
import ManageSchemes from './components/ManageSchemes';
import UserManagementPage from './components/UserManagement';
import SettingsPage from './components/SettingsPage';
import DistributorDetailsPage from './components/DistributorDetailsPage';
import NotificationsPage from './components/NotificationsPage';
import ManagePriceTiers from './components/ManagePriceTiers';
import CEOInsightsPage from './components/CEOInsightsPage';
import DistributorScorecardPage from './components/DistributorScorecardPage';
import ConfirmReturnsPage from './components/ConfirmReturnsPage';
import Invoice from './components/Invoice';
import StoreManagementPage from './components/StoreManagementPage';
import PortalSelectionPage from './components/PortalSelectionPage';
import CentralStockPage from './components/CentralStockPage';
import StoreStockPage from './components/StoreStockPage';
import DispatchNote from './components/DispatchNote';
import CreateStockDispatch from './components/CreateStockDispatch';
import CentralWalletPage from './components/CentralWalletPage';

const App: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background text-content font-sans">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/select-portal"
          element={
            <ProtectedRoute>
              <PortalSelectionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoice/:orderId"
          element={
            <ProtectedRoute>
              <Invoice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dispatch-note/:transferId"
          element={
            <ProtectedRoute>
              <DispatchNote />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="distributors/new" element={<DistributorOnboarding />} />
          <Route path="distributors/:distributorId" element={<DistributorDetailsPage />} />
          <Route path="place-order" element={<PlaceOrder />} />
          <Route path="order-history" element={<OrderHistory />} />
          <Route path="wallet/central" element={<CentralWalletPage />} />
          <Route path="recharge-wallet" element={<RechargeWallet />} />
          <Route path="confirm-returns" element={<ConfirmReturnsPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="ceo-insights" element={<CEOInsightsPage />} />
          <Route path="distributor-scorecard" element={<DistributorScorecardPage />} />
          <Route path="stock/central" element={<CentralStockPage />} />
          <Route path="stock/store/:storeId?" element={<StoreStockPage />} />
          <Route path="stock/dispatch/new" element={<CreateStockDispatch />} />
          <Route path="products/manage" element={<ManageSKUs />} />
          <Route path="schemes/manage" element={<ManageSchemes />} />
          <Route path="price-tiers/manage" element={<ManagePriceTiers />} />
          <Route path="users/manage" element={<UserManagementPage />} />
          <Route path="stores/manage" element={<StoreManagementPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </div>
  );
};

export default App;
