import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Smartphone,
  CreditCard,
  Building2,
  Wallet,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Lock,
  CheckCircle2,
  ChevronRight,
  Info,
  Check,
  Sparkles,
  QrCode,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useOrderState } from '../hooks/useOrderState.ts';
import { PaymentApiService } from '../services/api.ts';
import { loadRazorpaySdk, resetRazorpaySdk } from '../utils/razorpayLoader.ts';

type PaymentCategory = 'upi' | 'card' | 'netbanking' | 'wallet';
type LoadingStage = 'idle' | 'preparing' | 'creating_order' | 'opening_razorpay';

export const PaymentSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { order } = useOrderState();

  const [paymentMode, setPaymentMode] = useState<'test' | 'live'>('live');
  const [selectedCategory, setSelectedCategory] = useState<PaymentCategory>('upi');
  const [selectedSubMethod, setSelectedSubMethod] = useState<string>('upi_intent');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dismissedNotice, setDismissedNotice] = useState(false);
  const isSubmittingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // 1. Preload Razorpay Checkout SDK in background on mount
    loadRazorpaySdk().catch((err) => {
      console.warn('Preload Razorpay SDK note:', err.message);
    });

    // 2. Query gateway health
    PaymentApiService.checkHealth()
      .then((health) => {
        if (isMountedRef.current) {
          if (health?.payment_mode === 'test') {
            setPaymentMode('test');
          } else {
            setPaymentMode('live');
          }
        }
      })
      .catch(() => {
        if (isMountedRef.current) {
          setPaymentMode('live');
        }
      });

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleContinueToPay = async () => {
    // Prevent duplicate payment requests from repeated clicks
    if (isSubmittingRef.current || isProcessing) return;

    try {
      isSubmittingRef.current = true;
      setIsProcessing(true);
      setError(null);
      setDismissedNotice(false);

      // Stage 1: Preparing secure checkout (reuses preloaded SDK promise)
      setLoadingStage('preparing');
      await loadRazorpaySdk().catch((err) => {
        console.warn('Razorpay SDK loader note:', err);
        return false;
      });

      if (!isMountedRef.current) return;

      // Stage 2: Creating payment order on server
      setLoadingStage('creating_order');
      const orderResponse = await PaymentApiService.createOrder(order);

      if (!isMountedRef.current) return;

      // If backend is in offline dummy mode, route to simulated checkout launcher
      if (orderResponse.is_simulated) {
        navigate(`/checkout/launch?method=${selectedCategory}&sub=${selectedSubMethod}`, {
          state: { orderResponse },
        });
        return;
      }

      // Stage 3: Opening Razorpay Standard Checkout
      setLoadingStage('opening_razorpay');

      // Verify Razorpay constructor is present
      if (typeof window.Razorpay === 'undefined') {
        resetRazorpaySdk();
        throw new Error('Razorpay Checkout SDK failed to load. Please check your internet connection and try again.');
      }

      const options: any = {
        key: orderResponse.key_id,
        amount: orderResponse.amount_in_paise,
        currency: orderResponse.currency,
        name: 'Fresh-Cart Groceries',
        description: `Order ${order.freshcart_order_id} • Total: ₹${order.total_payable}`,
        order_id: orderResponse.razorpay_order_id,
        prefill: {
          name: order.customer.name,
          email: order.customer.email,
          contact: order.customer.phone,
          method: selectedCategory,
        },
        notes: {
          freshcart_order_id: order.freshcart_order_id,
          delivery_slot: order.delivery_slot,
        },
        theme: {
          color: '#00D084',
        },
        modal: {
          backdropclose: false,
          escape: true,
          handleback: true,
          confirm_close: true,
          ondismiss: function () {
            if (isMountedRef.current) {
              setIsProcessing(false);
              setLoadingStage('idle');
              setDismissedNotice(true);
            }
            isSubmittingRef.current = false;
            PaymentApiService.reportFailure({
              freshcart_order_id: order.freshcart_order_id,
              razorpay_order_id: orderResponse.razorpay_order_id,
              error_code: 'MODAL_DISMISSED',
              error_description: 'Customer dismissed payment window without paying.',
            });
          },
        },
        handler: function (response: any) {
          navigate('/processing', {
            state: {
              freshcart_order_id: order.freshcart_order_id,
              razorpay_order_id: response.razorpay_order_id || orderResponse.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
          });
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', function (resp: any) {
        if (isMountedRef.current) {
          setIsProcessing(false);
          setLoadingStage('idle');
        }
        isSubmittingRef.current = false;
        PaymentApiService.reportFailure({
          freshcart_order_id: order.freshcart_order_id,
          razorpay_order_id: orderResponse.razorpay_order_id,
          razorpay_payment_id: resp.error?.metadata?.payment_id,
          error_code: resp.error?.code || 'GATEWAY_ERROR',
          error_description: resp.error?.description || 'Payment rejected by bank or issuer.',
        });
        navigate('/payment/failed', {
          state: {
            orderId: order.freshcart_order_id,
            reason: resp.error?.description || 'Payment declined by bank.',
            errorCode: resp.error?.code,
          },
        });
      });

      rzp.open();
    } catch (err: any) {
      console.error('Payment initiation error:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Failed to initiate payment. Please try again.');
        setIsProcessing(false);
        setLoadingStage('idle');
      }
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="space-y-8">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Order Summary</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <span className="text-emerald-600 font-bold">1. Order</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-900 font-bold">2. Payment Method</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>3. Razorpay Checkout</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Payment Selection Interface */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Select Payment Method</h1>
                {paymentMode === 'test' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    Razorpay Test Mode
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Razorpay Live Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Choose your preferred payment method. Payment will be processed securely via Razorpay Standard Checkout.
              </p>
            </div>

            {/* Payment Category Cards */}
            <div className="space-y-4">
              {/* 1. UPI */}
              <div
                onClick={() => {
                  setSelectedCategory('upi');
                  setSelectedSubMethod('upi_intent');
                }}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedCategory === 'upi'
                    ? 'border-emerald-500 bg-emerald-50/20 shadow-sm'
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      selectedCategory === 'upi' ? 'bg-[#00D084] text-slate-950 font-bold' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">UPI (Google Pay, PhonePe, Paytm, BHIM & QR)</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Instant 0% Fee
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Pay via native UPI Intent on mobile or scan QR Code on desktop</p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedCategory === 'upi' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                  }`}>
                    {selectedCategory === 'upi' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                {/* UPI Supported Apps Preview */}
                {selectedCategory === 'upi' && (
                  <div className="mt-4 pt-4 border-t border-emerald-100">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'gpay', name: 'Google Pay', badge: 'UPI Intent' },
                        { id: 'phonepe', name: 'PhonePe', badge: 'UPI Intent' },
                        { id: 'paytm', name: 'Paytm UPI', badge: 'UPI Intent' },
                        { id: 'qr', name: 'Dynamic QR', badge: 'Scan & Pay' },
                      ].map((app) => (
                        <div
                          key={app.id}
                          className="p-2.5 rounded-xl text-left border border-emerald-200/60 bg-white shadow-xs"
                        >
                          <span className="block text-xs font-bold text-slate-900">{app.name}</span>
                          <span className="text-[10px] text-emerald-700 font-medium">{app.badge}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2.5">
                      ✓ Instant app-switch on Android/iOS. No manual UPI ID typing required.
                    </p>
                  </div>
                )}
              </div>

              {/* 2. Cards */}
              <div
                onClick={() => {
                  setSelectedCategory('card');
                  setSelectedSubMethod('credit_card');
                }}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedCategory === 'card'
                    ? 'border-emerald-500 bg-emerald-50/20 shadow-sm'
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      selectedCategory === 'card' ? 'bg-[#00D084] text-slate-950 font-bold' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">Credit & Debit Cards</span>
                        <span className="text-[10px] font-semibold text-slate-500">Visa, Mastercard, RuPay</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Card credentials collected exclusively on Razorpay's PCI-DSS vault</p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedCategory === 'card' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                  }`}>
                    {selectedCategory === 'card' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                {selectedCategory === 'card' && (
                  <div className="mt-4 pt-4 border-t border-emerald-100 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'credit_card', name: 'Credit Card', sub: 'All major banks' },
                      { id: 'debit_card', name: 'Debit Card', sub: 'Visa, RuPay, MC' },
                      { id: 'corporate_card', name: 'Corporate Card', sub: 'Business expense' },
                    ].map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubMethod(card.id);
                        }}
                        className={`p-2.5 rounded-xl text-left border transition-all ${
                          selectedSubMethod === card.id
                            ? 'border-emerald-600 bg-white shadow-xs font-semibold'
                            : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                        }`}
                      >
                        <span className="block text-xs font-bold text-slate-900">{card.name}</span>
                        <span className="text-[10px] text-slate-400">{card.sub}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Net Banking */}
              <div
                onClick={() => {
                  setSelectedCategory('netbanking');
                  setSelectedSubMethod('hdfc');
                }}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedCategory === 'netbanking'
                    ? 'border-emerald-500 bg-emerald-50/20 shadow-sm'
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      selectedCategory === 'netbanking' ? 'bg-[#00D084] text-slate-950 font-bold' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-sm">Net Banking</span>
                      <p className="text-xs text-slate-500 mt-0.5">Supports HDFC, ICICI, SBI, Axis, Kotak, and 50+ Indian banks</p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedCategory === 'netbanking' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                  }`}>
                    {selectedCategory === 'netbanking' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                {selectedCategory === 'netbanking' && (
                  <div className="mt-4 pt-4 border-t border-emerald-100 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'hdfc', name: 'HDFC Bank' },
                      { id: 'icici', name: 'ICICI Bank' },
                      { id: 'sbi', name: 'State Bank of India' },
                      { id: 'axis', name: 'Axis Bank' },
                    ].map((bank) => (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubMethod(bank.id);
                        }}
                        className={`p-2.5 rounded-xl text-left border transition-all ${
                          selectedSubMethod === bank.id
                            ? 'border-emerald-600 bg-white shadow-xs font-semibold'
                            : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                        }`}
                      >
                        <span className="block text-xs font-bold text-slate-900">{bank.name}</span>
                        <span className="text-[10px] text-slate-400">Direct Gateway</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Wallets */}
              <div
                onClick={() => {
                  setSelectedCategory('wallet');
                  setSelectedSubMethod('paytm_wallet');
                }}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedCategory === 'wallet'
                    ? 'border-emerald-500 bg-emerald-50/20 shadow-sm'
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      selectedCategory === 'wallet' ? 'bg-[#00D084] text-slate-950 font-bold' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-sm">Wallets</span>
                      <p className="text-xs text-slate-500 mt-0.5">Paytm, PhonePe, Mobikwik, Amazon Pay & Freecharge</p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedCategory === 'wallet' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                  }`}>
                    {selectedCategory === 'wallet' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Informational Callout */}
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 text-xs text-slate-600">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Official Razorpay Checkout Integration:</span>
                <p className="mt-0.5 leading-relaxed">
                  Clicking "Pay Securely" creates an official order token on the backend and launches Razorpay's standard checkout with native UPI Intent and QR support.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Pay Button */}
        <div className="lg:col-span-4 space-y-5 sticky top-24">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
              Payment Summary
            </h3>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Fresh-Cart Order</span>
                <span className="font-mono font-semibold text-slate-900">{order.freshcart_order_id}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer</span>
                <span className="font-medium text-slate-900">{order.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery To</span>
                <span className="font-medium text-slate-900 line-clamp-1">{order.delivery_slot}</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal</span>
                <span>₹{order.product_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery Fee</span>
                <span>₹{order.delivery_charge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discounts</span>
                <span>-₹{order.discount.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 flex justify-between items-center font-bold">
              <span className="text-slate-900 text-sm">Total Payable</span>
              <span className="text-2xl text-slate-900">₹{order.total_payable.toFixed(2)}</span>
            </div>

            {/* Error Message Notice */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-left text-xs text-red-900 flex items-start gap-2.5 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-red-950 block">Unable to Connect to Gateway</span>
                  <p className="text-[11px] text-red-800 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Dismissed Notification (Non-blocking) */}
            {dismissedNotice && !error && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 flex items-start gap-2.5 animate-in fade-in">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-950 block">Payment Window Closed</span>
                  <span className="text-[11px] text-amber-800">
                    The payment window was dismissed without completing. No funds were debited. Click below to reopen.
                  </span>
                </div>
              </div>
            )}

            {/* Pay Securely Button with Instant Loading & Disabled State */}
            <button
              onClick={handleContinueToPay}
              disabled={isProcessing}
              className={`w-full py-4 rounded-2xl font-bold text-sm shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                isProcessing
                  ? 'bg-emerald-400 text-slate-900 cursor-wait opacity-85 shadow-emerald-500/10'
                  : 'bg-[#00D084] hover:bg-emerald-500 text-slate-950 shadow-emerald-500/25 hover:shadow-xl cursor-pointer'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>
                    {loadingStage === 'preparing' && 'Preparing secure checkout...'}
                    {loadingStage === 'creating_order' && 'Creating payment order...'}
                    {loadingStage === 'opening_razorpay' && 'Opening Razorpay...'}
                    {loadingStage === 'idle' && 'Connecting to Razorpay...'}
                  </span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pay Securely ₹{order.total_payable.toFixed(2)}</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>End-to-end 256-Bit TLS Encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
