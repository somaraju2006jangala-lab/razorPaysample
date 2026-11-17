import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  XCircle,
  RefreshCw,
  HelpCircle,
  ArrowLeft,
  AlertTriangle,
  ShieldAlert,
  PhoneCall,
} from 'lucide-react';
import { useOrderState } from '../hooks/useOrderState.ts';

export const FailedPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { order } = useOrderState();

  const state = location.state as {
    orderId?: string;
    reason?: string;
    errorCode?: string;
  } | null;

  const orderId = state?.orderId || order.freshcart_order_id;
  const errorCode = state?.errorCode || 'PAYMENT_FAILED';
  const isDismissed = errorCode === 'MODAL_DISMISSED';
  const reason = state?.reason || (isDismissed 
    ? 'The payment window was closed before completion. No funds were debited.' 
    : 'Transaction could not be authorized by your bank.');

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-sm text-center space-y-6">
        {/* Red / Amber Icon */}
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          <div className={`absolute inset-0 rounded-full animate-ping opacity-60 ${isDismissed ? 'bg-amber-400/20' : 'bg-red-400/20'}`} />
          <div className={`w-16 h-16 rounded-full text-white flex items-center justify-center shadow-lg ${isDismissed ? 'bg-amber-500 shadow-amber-500/30' : 'bg-red-500 shadow-red-500/30'}`}>
            <XCircle className="w-9 h-9 stroke-[2.5]" />
          </div>
        </div>

        <div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold mb-2 ${
            isDismissed 
              ? 'bg-amber-50 text-amber-800 border-amber-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <ShieldAlert className={`w-3.5 h-3.5 ${isDismissed ? 'text-amber-600' : 'text-red-600'}`} />
            <span>{isDismissed ? 'Payment Cancelled' : 'Transaction Incomplete'}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {isDismissed ? 'Payment Not Completed' : 'Payment Unsuccessful'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isDismissed 
              ? 'The checkout popup was dismissed before authorizing payment. No charges were made.'
              : 'We could not complete your grocery checkout payment.'}
          </p>
        </div>

        {/* Error Details Box */}
        <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 text-left space-y-1.5 text-xs text-red-900">
          <div className="flex justify-between items-center font-bold">
            <span>Failure Reason</span>
            <span className="font-mono text-[11px] text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
              {errorCode}
            </span>
          </div>
          <p className="text-red-800 leading-relaxed">{reason}</p>
        </div>

        {/* Reassurance Banner */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left text-xs text-slate-600 space-y-1">
          <span className="font-bold text-slate-800 block">Has your account been debited?</span>
          <p className="text-slate-500 leading-relaxed">
            If any amount was deducted by your bank or UPI provider, it will be automatically reversed to your original payment method within 3 to 5 business days per RBI banking regulations.
          </p>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/selection')}
            className="flex-1 py-4 px-6 rounded-2xl bg-[#00D084] hover:bg-emerald-500 text-slate-950 font-bold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Payment</span>
          </button>

          <Link
            to="/history"
            className="py-4 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center transition-colors"
          >
            <span>View Transaction History</span>
          </Link>
        </div>

        <div className="border-t border-slate-100 pt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            Need help?
          </span>
          <span className="text-emerald-600 font-semibold cursor-pointer">Contact Fresh-Cart Support</span>
        </div>
      </div>
    </div>
  );
};

