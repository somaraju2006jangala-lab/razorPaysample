import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Clock,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { PaymentApiService } from '../services/api.ts';
import { useOrderState } from '../hooks/useOrderState.ts';

export const PendingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { order } = useOrderState();

  const state = location.state as { orderId?: string; razorpayOrderId?: string } | null;
  const orderId = state?.orderId || order.freshcart_order_id;

  const [isChecking, setIsChecking] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('PENDING');
  const [lastChecked, setLastChecked] = useState<string>(new Date().toLocaleTimeString());

  const checkStatus = async () => {
    try {
      setIsChecking(true);
      const res = await PaymentApiService.getPaymentStatus(orderId);
      setLastChecked(new Date().toLocaleTimeString());

      if (res?.status) {
        setCurrentStatus(res.status);
        if (res.status === 'CAPTURED') {
          navigate('/payment/success', {
            state: {
              verifiedResult: {
                verified: true,
                status: 'CAPTURED',
                transaction_id: res.transaction_id || `tx_${Date.now()}`,
                razorpay_payment_id: res.razorpay_payment_id || 'pay_verified',
                razorpay_order_id: res.razorpay_order_id || state?.razorpayOrderId || '',
                freshcart_order_id: orderId,
                amount: res.amount || order.total_payable,
                currency: res.currency || 'INR',
                customer: order.customer,
                timestamp: res.created_at || new Date().toISOString(),
              },
            },
            replace: true,
          });
        } else if (res.status === 'FAILED') {
          navigate('/payment/failed', {
            state: {
              orderId,
              reason: res.error_description || 'Payment was marked failed by bank.',
            },
            replace: true,
          });
        }
      }
    } catch (e) {
      console.warn('Status check poll failed:', e);
    } finally {
      setIsChecking(false);
    }
  };

  // Polling every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-sm text-center space-y-6">
        {/* Amber Clock Icon */}
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping opacity-60" />
          <div className="w-16 h-16 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Clock className="w-9 h-9 stroke-[2.5]" />
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold mb-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Awaiting Bank Confirmation</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Payment Pending</h1>
          <p className="text-xs text-slate-500 mt-1">
            We are verifying your transaction with Razorpay and the banking network.
          </p>
        </div>

        {/* Status card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-2">
          <div className="flex justify-between items-center">
            <span>Order Reference:</span>
            <span className="font-mono font-bold text-slate-900">{orderId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Current Gateway State:</span>
            <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900">
              {currentStatus}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-400 text-[11px]">
            <span>Last polled at:</span>
            <span>{lastChecked}</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
          UPI and Netbanking authorizations occasionally take up to 2 minutes to settle. Do not click back; this page will automatically update once verified.
        </p>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            onClick={checkStatus}
            disabled={isChecking}
            className="flex-1 py-4 px-6 rounded-2xl bg-[#00D084] hover:bg-emerald-500 text-slate-950 font-bold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
          >
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking Status...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Check Payment Status</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

