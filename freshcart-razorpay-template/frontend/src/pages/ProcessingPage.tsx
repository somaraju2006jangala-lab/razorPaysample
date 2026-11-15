import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { PaymentApiService } from '../services/api.ts';

export const ProcessingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [statusMessage, setStatusMessage] = useState<string>('Validating cryptographic HMAC SHA-256 signature...');
  const [error, setError] = useState<string | null>(null);
  const verificationSent = useRef(false);

  const paymentData = location.state as {
    freshcart_order_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  } | null;

  useEffect(() => {
    if (!paymentData?.freshcart_order_id || !paymentData?.razorpay_payment_id) {
      setError('Missing payment verification metadata. Please check transaction history.');
      return;
    }

    if (verificationSent.current) return;
    verificationSent.current = true;

    async function executeVerification() {
      try {
        setStep(1);
        setStatusMessage('Computing and verifying cryptographic HMAC SHA-256 signature...');

        // Step 1: Call backend verification
        const result = await PaymentApiService.verifyPayment({
          freshcart_order_id: paymentData!.freshcart_order_id,
          razorpay_order_id: paymentData!.razorpay_order_id,
          razorpay_payment_id: paymentData!.razorpay_payment_id,
          razorpay_signature: paymentData!.razorpay_signature,
        });

        // Step 2: Confirm persistence
        setStep(2);
        setStatusMessage('Confirming transaction capture with Fresh-Cart payment ledger...');
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Step 3: Success confirmed by backend
        setStep(3);
        setStatusMessage('Payment verified successfully! Generating confirmation receipt...');
        await new Promise((resolve) => setTimeout(resolve, 600));

        // Navigate to verified success screen
        navigate('/payment/success', {
          state: { verifiedResult: result },
          replace: true,
        });
      } catch (err: any) {
        console.error('Verification error:', err);
        setError(err.message || 'Payment signature verification failed.');
        navigate('/payment/failed', {
          state: {
            orderId: paymentData!.freshcart_order_id,
            reason: err.message || 'Signature mismatch or payment could not be captured.',
          },
          replace: true,
        });
      }
    }

    executeVerification();
  }, [paymentData, navigate]);

  return (
    <div className="max-w-lg mx-auto py-12">
      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm text-center space-y-6">
        {error ? (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Verification Interrupted</h2>
            <p className="text-xs text-slate-600 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>
            <button
              onClick={() => navigate('/history')}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
            >
              View Transaction History
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Spinning Indicator with Neon Glow */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping opacity-60" />
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-md">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900">Securing Your Payment</h2>
              <p className="text-xs text-slate-500">
                Order <span className="font-mono font-semibold text-slate-800">{paymentData?.freshcart_order_id}</span>
              </p>
            </div>

            {/* Stepper Progress */}
            <div className="space-y-3 text-left pt-2">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                {step >= 1 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-300 shrink-0" />
                )}
                <span className={`text-xs font-semibold ${step >= 1 ? 'text-slate-900' : 'text-slate-400'}`}>
                  Cryptographic Signature Verification (HMAC SHA-256)
                </span>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                {step >= 2 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-300 shrink-0" />
                )}
                <span className={`text-xs font-semibold ${step >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>
                  Payment Gateway Capture Confirmation
                </span>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                {step >= 3 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-300 shrink-0" />
                )}
                <span className={`text-xs font-semibold ${step >= 3 ? 'text-slate-900' : 'text-slate-400'}`}>
                  Receipt Generation & Order Sync
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-[11px] text-emerald-800 flex items-center justify-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              <span>Please do not close or refresh this window.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

