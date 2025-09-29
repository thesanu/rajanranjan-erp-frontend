import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './routes/PrivateRoute';
import MainLayout from './layouts/MainLayout';

// Public Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Dashboard
import Dashboard from './pages/Dashboard';

// Masters
import AccountGroup from './pages/AccountGroup';
import Ledger from './pages/Ledger';
import Unit from './pages/Unit';
import Product from './pages/Product';
import ProductGroup from './pages/ProductGroup';
import Design from './pages/Design';
import Size from './pages/Size';
import Mill from './pages/Mill';
import Location from './pages/Location';
import OpeningStock from './pages/OpeningStock';
import OpeningBalance from './pages/OpeningBalance';
import Area from './pages/Area';
import User from './pages/User';
import CompanyProfile from './pages/CompanyProfile';

// Transactions
import Voucher from './pages/Voucher';
import VoucherType from './pages/VoucherType';

// Reports
import LedgerReport from './pages/Reports/LedgerReport';
import TrialBalance from './pages/Reports/TrialBalance';
import ProfitLoss from './pages/Reports/ProfitLoss';
import BalanceSheet from './pages/Reports/BalanceSheet';
import StockSummary from './pages/Reports/StockSummary';
import ItemLedger from './pages/Reports/ItemLedger';
import TransactionSummary from './pages/Reports/TransactionSummary';

// Utilities
import TaxRate from './pages/TaxRate';
import BackupTool from './pages/BackupTool';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />
        <Route path="/Register" element={<Register />} />

        {/* Protected Routes with Layout */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          {/* Dashboard */}
          <Route index element={<Dashboard />} />

          {/* Masters */}
          <Route path="account-group" element={<AccountGroup />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="unit" element={<Unit />} />
          <Route path="product" element={<Product />} />
          <Route path="product-group" element={<ProductGroup />} />
          <Route path="design" element={<Design />} />
          <Route path="size" element={<Size />} />
          <Route path="mill" element={<Mill />} />
          <Route path="location" element={<Location />} />
          <Route path="opening-stock" element={<OpeningStock />} />
          <Route path="opening-balance" element={<OpeningBalance />} />
          <Route path="area" element={<Area />} />
          <Route path="user" element={<User />} />
          <Route path="company-profile" element={<CompanyProfile />} />

          {/* Transactions */}
          <Route path="voucher" element={<Voucher />} />
          <Route path="voucher-type" element={<VoucherType />} />

          {/* Reports */}
          <Route path="reports/ledger" element={<LedgerReport />} />
          <Route path="reports/trial-balance" element={<TrialBalance />} />
          <Route path="reports/profit-loss" element={<ProfitLoss />} />
          <Route path="reports/balance-sheet" element={<BalanceSheet />} />
          <Route path="reports/stock-summary" element={<StockSummary />} />
          <Route path="reports/item-ledger" element={<ItemLedger />} />
          <Route path="reports/transaction-summary" element={<TransactionSummary />} />

          {/* Utilities */}
          <Route path="tax-rate" element={<TaxRate />} />
          <Route path="backup" element={<BackupTool />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
