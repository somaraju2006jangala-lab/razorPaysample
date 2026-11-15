import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  ShoppingBag,
  History,
  Lock,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { PaymentApiService } from '../services/api.ts';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [health, setHealth] = useState<{ status: string; payment_mode: string; environment: string }>({
    status: 'checking',
    payment_mode: 'test',
    environment: 'development',
  });

  useEffect(() => {
    PaymentApiService.checkHealth().then(setHealth).catch(() => {});
  }, []);

  const isTestMode = health.payment_mode === 'test';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 text-slate-800">
      {/* Top Banner: Environment Mode */}
      <div className={`px-4 py-1.5 text-xs font-semibold text-center tracking-wide flex items-center justify-center gap-2 ${
        isTestMode
          ? 'bg-amber-500 text-amber-950 border-b border-amber-400/40'
          : 'bg-emerald-600 text-white border-b border-emerald-500'
      }`}>
        <span className="flex h-2 w-2 relative">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isTestMode ? 'bg-amber-900' : 'bg-emerald-300'
          }`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            isTestMode ? 'bg-amber-950' : 'bg-white'
          }`}></span>
        </span>
        <span>
          {isTestMode ? (
            <strong>TEST / DEMO MODE: Real money will not be deducted. Razorpay Test Credentials active.</strong>
          ) : (
            <strong>LIVE PRODUCTION GATEWAY: Verified Real Transactions Active.</strong>
          )}
        </span>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-[#00D084] p-0.5 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200 flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">Fresh-Cart</span>
                <span className="h-2 w-2 rounded-full bg-[#00D084]"></span>
                <span className="text-xs uppercase px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Payments
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Fast, Easy & Secure Gateway</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                location.pathname === '/' || location.pathname.startsWith('/checkout')
                  ? 'bg-emerald-50 text-emerald-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              Checkout Demo
            </Link>
            <Link
              to="/history"
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                location.pathname === '/history'
                  ? 'bg-emerald-50 text-emerald-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              Transaction History
            </Link>
            <Link
              to="/admin"
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                location.pathname.startsWith('/admin')
                  ? 'bg-emerald-50 text-emerald-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              Admin Dashboard
            </Link>
          </nav>

          {/* Security & Razorpay Badge */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/60">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-700">256-Bit SSL</span>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-50/80 border border-blue-200/70 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-semibold text-blue-900">Powered by</span>
              <span className="text-xs font-bold text-blue-600 tracking-tight">Razorpay</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-slate-900">Fresh-Cart Payments</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Independent payment gateway module designed for the Fresh-Cart grocery e-commerce ecosystem. Reusable for Website, Mobile (Android/iOS), and Admin operations.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Security & Compliance</h4>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  PCI-DSS Level 1 Certified
                </li>
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  HMAC SHA-256 Verification
                </li>
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  RBI Tokenization & Mandates
                </li>
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Idempotent Webhook Verification
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Gateway Navigation</h4>
              <ul className="text-xs text-slate-600 space-y-2">
                <li>
                  <Link to="/" className="hover:text-emerald-600 transition-colors">Payment Landing & Demo</Link>
                </li>
                <li>
                  <Link to="/history" className="hover:text-emerald-600 transition-colors">Transaction History</Link>
                </li>
                <li>
                  <Link to="/admin" className="hover:text-emerald-600 transition-colors">Admin Settlement Dashboard</Link>
                </li>
                <li>
                  <Link to="/refunds/status" className="hover:text-emerald-600 transition-colors">Refund Tracking Center</Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Fresh-Cart Integration</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                Standalone payment template ready for plug-and-play integration with Fresh-Cart Web, Expo React Native, and Backend APIs.
              </p>
              <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700">
                <span>View Integration Docs</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© {new Date().getFullYear()} Fresh-Cart Payment Systems. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span>Card / UPI / NetBanking / Wallets</span>
              <span>•</span>
              <span>100% Encrypted Transactions</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

