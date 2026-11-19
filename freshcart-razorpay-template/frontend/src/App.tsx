import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout.tsx';
import { PaymentApiService } from './services/api.ts';
import { LandingPage } from './pages/LandingPage.tsx';
import { PaymentSelectionPage } from './pages/PaymentSelectionPage.tsx';
import { CheckoutLaunchPage } from './pages/CheckoutLaunchPage.tsx';
import { ProcessingPage } from './pages/ProcessingPage.tsx';
import { SuccessPage } from './pages/SuccessPage.tsx';
import { FailedPage } from './pages/FailedPage.tsx';
import { PendingPage } from './pages/PendingPage.tsx';
import { TransactionDetailsPage } from './pages/TransactionDetailsPage.tsx';
import { RefundStatusPage } from './pages/RefundStatusPage.tsx';
import { HistoryPage } from './pages/HistoryPage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';

export function App() {
  useEffect(() => {
    // Proactively pre-warm backend container as soon as visitor arrives on the site
    PaymentApiService.checkHealth().catch(() => {});

    // Periodic lightweight background keep-alive ping (every 8 min) while tab is open
    const keepAliveTimer = setInterval(() => {
      PaymentApiService.checkHealth().catch(() => {});
    }, 8 * 60 * 1000);

    return () => clearInterval(keepAliveTimer);
  }, []);

  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          {/* 1. Payment Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* 2. Payment Selection Page */}
          <Route path="/selection" element={<PaymentSelectionPage />} />

          {/* 3. Razorpay Checkout Launch Page */}
          <Route path="/checkout/launch" element={<CheckoutLaunchPage />} />

          {/* 4. Payment Processing Page */}
          <Route path="/processing" element={<ProcessingPage />} />

          {/* 5. Payment Success Page */}
          <Route path="/payment/success" element={<SuccessPage />} />

          {/* 6. Payment Failed Page */}
          <Route path="/payment/failed" element={<FailedPage />} />

          {/* 7. Payment Pending Page */}
          <Route path="/payment/pending" element={<PendingPage />} />

          {/* 8. Transaction Details Page */}
          <Route path="/payment/transaction/:id" element={<TransactionDetailsPage />} />

          {/* 9. Refund Status Page */}
          <Route path="/refunds/status" element={<RefundStatusPage />} />

          {/* Transaction History Page */}
          <Route path="/history" element={<HistoryPage />} />

          {/* Admin Payment Dashboard */}
          <Route path="/admin" element={<AdminDashboardPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;

