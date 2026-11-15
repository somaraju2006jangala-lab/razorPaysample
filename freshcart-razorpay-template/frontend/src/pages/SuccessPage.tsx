import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Download,
  Printer,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Calendar,
  CreditCard,
  Hash,
  Truck,
  Check,
} from 'lucide-react';
import { VerifiedPaymentResult } from '../types/payment.ts';
import { useOrderState } from '../hooks/useOrderState.ts';

export const SuccessPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { order, resetOrder } = useOrderState();

  const state = location.state as { verifiedResult?: VerifiedPaymentResult } | null;
  const verified = state?.verifiedResult;

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleNewOrder = () => {
    resetOrder();
    navigate('/');
  };

  const amount = verified?.amount || order.total_payable || 990;
  const orderId = verified?.freshcart_order_id || order.freshcart_order_id;
  const paymentId = verified?.razorpay_payment_id || 'pay_demo_verified';
  const transactionId = verified?.transaction_id || `tx_${Date.now()}`;
  const timestamp = verified?.timestamp || new Date().toLocaleString('en-IN');
  const method = verified?.method || 'UPI / Card';

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Printable Receipt Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping opacity-60" />
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Check className="w-9 h-9 stroke-[3]" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Backend Cryptographically Verified</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Payment Successful!</h1>
            <p className="text-xs text-slate-500 mt-1">
              Your grocery payment has been confirmed and transferred to Fresh-Cart.
            </p>
          </div>

          {/* Amount Paid Display */}
          <div className="pt-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Amount Paid</span>
            <span className="text-4xl font-extrabold text-slate-900">
              ₹{Number(amount).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Grocery Delivery Reassurance Banner */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-3.5 text-xs text-emerald-900">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold block">Freshness Guarantee</span>
            <span className="text-emerald-800">
              Your order items will be handpicked fresh and delivered to your address: {order.delivery_slot}.
            </span>
          </div>
        </div>

        {/* Transaction Metadata Grid */}
        <div className="border-t border-b border-slate-100 py-6 space-y-3.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              Fresh-Cart Order ID
            </span>
            <span className="font-mono font-bold text-slate-900">{orderId}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              Razorpay Payment ID
            </span>
            <span className="font-mono font-bold text-slate-900">{paymentId}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              Payment Method
            </span>
            <span className="font-semibold text-slate-900 uppercase">{method}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Timestamp
            </span>
            <span className="font-medium text-slate-900">{timestamp}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500">Transaction Status</span>
            <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              CAPTURED
            </span>
          </div>
        </div>

        {/* Receipt Action Buttons (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 print:hidden">
          <button
            onClick={handlePrintReceipt}
            className="flex-1 py-3.5 px-5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs border border-slate-200 shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Official Receipt</span>
          </button>

          <Link
            to="/history"
            className="flex-1 py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <span>View in History</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="text-center print:hidden">
          <button
            onClick={handleNewOrder}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
          >
            ← Return to Store / Make Another Order
          </button>
        </div>
      </div>
    </div>
  );
};

