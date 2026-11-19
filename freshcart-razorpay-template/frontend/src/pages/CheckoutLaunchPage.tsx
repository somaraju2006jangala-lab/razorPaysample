import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  Lock,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Smartphone,
  CreditCard,
  Building2,
  Wallet,
  X,
  ChevronRight,
  Info,
  RefreshCw,
} from 'lucide-react';
import { useOrderState } from '../hooks/useOrderState.ts';
import { PaymentApiService } from '../services/api.ts';
import { RazorpayOrderResponse } from '../types/payment.ts';
import { loadRazorpaySdk } from '../utils/razorpayLoader.ts';

export const CheckoutLaunchPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { order } = useOrderState();

  const passedOrderResponse = (location.state as any)?.orderResponse as RazorpayOrderResponse | undefined;

  const [isLoading, setIsLoading] = useState(!passedOrderResponse);
  const [error, setError] = useState<string | null>(null);
  const [rzpOrder, setRzpOrder] = useState<RazorpayOrderResponse | null>(passedOrderResponse || null);
  const [showSimulatedModal, setShowSimulatedModal] = useState(passedOrderResponse?.is_simulated || false);
  const [activeSimMethod, setActiveSimMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [wasDismissed, setWasDismissed] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const autoLaunchRef = useRef(false);

  const selectedCategory = searchParams.get('method') || 'upi';
  const selectedSubMethod = searchParams.get('sub') || 'upi_intent';

  // Step 1: Initialize Order with Backend & Preload SDK (only if not already passed)
  useEffect(() => {
    let isMounted = true;

    async function initOrder() {
      // If orderResponse was already created on selection page, reuse it completely without calling API
      if (passedOrderResponse) {
        if (isMounted) {
          setRzpOrder(passedOrderResponse);
          setIsLoading(false);
          if (passedOrderResponse.is_simulated) {
            setShowSimulatedModal(true);
          }
        }
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Preload SDK in parallel with order creation
        const [_, orderResponse] = await Promise.all([
          loadRazorpaySdk().catch(() => false),
          PaymentApiService.createOrder(order),
        ]);

        if (isMounted) {
          setRzpOrder(orderResponse);
          setIsLoading(false);
          if (orderResponse.is_simulated) {
            setShowSimulatedModal(true);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to initiate order with Razorpay gateway.');
          setIsLoading(false);
        }
      }
    }

    initOrder();
    return () => {
      isMounted = false;
    };
  }, [order, passedOrderResponse]);

  const isTestMode = rzpOrder
    ? rzpOrder.payment_mode === 'test' || rzpOrder.key_id?.startsWith('rzp_test_')
    : true;

  // Launch Razorpay Standard Checkout
  const launchRazorpayModal = () => {
    if (!rzpOrder || isLaunching) return;

    if (rzpOrder.is_simulated) {
      setShowSimulatedModal(true);
      return;
    }

    if (typeof window.Razorpay === 'undefined') {
      setError('Razorpay SDK failed to load. Please check your internet connection.');
      return;
    }

    try {
      setIsLaunching(true);
      setWasDismissed(false);

      const options: any = {
        key: rzpOrder.key_id,
        amount: rzpOrder.amount_in_paise,
        currency: rzpOrder.currency,
        name: 'Fresh-Cart Groceries',
        description: `Order ${order.freshcart_order_id} • Total: ₹${order.total_payable}`,
        order_id: rzpOrder.razorpay_order_id,
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
        handler: function (response: any) {
          setIsLaunching(false);
          // Send to cryptographic signature verification on backend
          navigate('/processing', {
            state: {
              freshcart_order_id: order.freshcart_order_id,
              razorpay_order_id: response.razorpay_order_id || rzpOrder.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
          });
        },
        modal: {
          backdropclose: false, // Prevent accidental dismissal when clicking outside
          escape: true,
          handleback: true,
          confirm_close: true, // Ask confirmation before closing
          ondismiss: function () {
            setIsLaunching(false);
            console.log('Payment modal was closed by user');
            setWasDismissed(true);
            PaymentApiService.reportFailure({
              freshcart_order_id: order.freshcart_order_id,
              razorpay_order_id: rzpOrder.razorpay_order_id,
              error_code: 'MODAL_DISMISSED',
              error_description: 'Customer dismissed payment window without paying.',
            });
          },
        },
      };

      const isTestOrder =
        rzpOrder.payment_mode === 'test' ||
        rzpOrder.key_id?.startsWith('rzp_test_');

      // LIVE MODE: Explicitly hide the deprecated UPI Collect flow using Razorpay's supported configuration.
      // This preserves supported UPI Intent and Dynamic QR payment options, without forcing rigid app-specific configurations.
      // Razorpay Standard Checkout will display supported UPI apps according to device and merchant account eligibility.
      if (!isTestOrder) {
        options.config = {
          display: {
            hide: [
              {
                method: 'upi',
                flows: ['collect'],
              },
            ],
            preferences: {
              show_default_blocks: true,
            },
          },
        };
      }
      // TEST MODE: Rely on Razorpay's supported simulated UPI testing flow (success@razorpay).
      // Sandbox mock VPAs do not exist on the live NPCI switch.

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', function (resp: any) {
        setIsLaunching(false);
        PaymentApiService.reportFailure({
          freshcart_order_id: order.freshcart_order_id,
          razorpay_order_id: rzpOrder.razorpay_order_id,
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
    } catch (e: any) {
      console.error('Failed to open Razorpay modal:', e);
      setIsLaunching(false);
      setError(e.message || 'Error triggering Razorpay modal.');
    }
  };

  // Attempt auto-launch once ready
  useEffect(() => {
    if (rzpOrder && !rzpOrder.is_simulated && !autoLaunchRef.current) {
      autoLaunchRef.current = true;
      try {
        launchRazorpayModal();
      } catch (e) {
        console.warn('Auto-launch blocked or interrupted:', e);
      }
    }
  }, [rzpOrder]);

  // Fallback simulator handler ONLY used when backend is offline/dummy-key mode
  const handleSimulatedOfflineSuccess = () => {
    if (!rzpOrder) return;
    const testPaymentId = `pay_sim_${Math.random().toString(36).substring(2, 10)}`;
    navigate('/processing', {
      state: {
        freshcart_order_id: order.freshcart_order_id,
        razorpay_order_id: rzpOrder.razorpay_order_id,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: 'simulated_valid_signature',
      },
    });
  };

  const handleSimulatedOfflineFailure = () => {
    if (!rzpOrder) return;
    PaymentApiService.reportFailure({
      freshcart_order_id: order.freshcart_order_id,
      razorpay_order_id: rzpOrder.razorpay_order_id,
      error_code: 'BANK_DECLINED',
      error_description: 'Simulated Card / UPI declined by issuing bank.',
    });
    navigate('/payment/failed', {
      state: {
        orderId: order.freshcart_order_id,
        reason: 'Simulated failure: Insufficient funds or bank server timeout.',
        errorCode: 'BANK_DECLINED',
      },
    });
  };

  const handleSimulatedDismiss = () => {
    setShowSimulatedModal(false);
    setWasDismissed(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/selection')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Change Payment Method</span>
        </button>

        <span className="text-xs font-semibold text-slate-400">Order: {order.freshcart_order_id}</span>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm text-center space-y-6">
        {isLoading ? (
          <div className="py-12 space-y-4">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-slate-900">Connecting to Razorpay Gateway...</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Generating secure Razorpay order token and establishing encrypted session.
            </p>
          </div>
        ) : error ? (
          <div className="py-8 space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Unable to Connect to Gateway</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed bg-red-50 p-3 rounded-xl border border-red-100">
              {error}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => navigate('/selection')}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto shadow-xs">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-2xl font-extrabold text-slate-900">Razorpay Checkout Ready</h2>
                {isTestMode && (
                  <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Test Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Razorpay Order ID: <span className="font-mono font-semibold text-slate-800">{rzpOrder?.razorpay_order_id}</span>
              </p>
            </div>

            {/* Order details summary pill */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Payable Amount:</span>
              <span className="text-base font-extrabold text-slate-900">₹{order.total_payable.toFixed(2)}</span>
            </div>

            {/* Gateway Information Badge */}
            {isTestMode ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Razorpay Test Mode Active
                  </span>
                  <span className="text-[10px] bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                    Sandbox
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Test transactions simulate payments without deducting money. Inside the Razorpay popup, use the official test flow (<code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">success@razorpay</code> or simulated cards).
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Razorpay Live Payments Active
                  </span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                    Production
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Real bank settlement enabled. Pay with Google Pay, PhonePe, Paytm, dynamic QR scan, or Cards.
                </p>
              </div>
            )}

            {/* Supported Payment Instruments Pill */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {['UPI Intent (GPay / PhonePe / Paytm)', 'Scan & Pay QR', 'Cards', 'NetBanking'].map((badge) => (
                <span
                  key={badge}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200"
                >
                  {badge}
                </span>
              ))}
            </div>

            {/* Dismissed Notification (Non-blocking) */}
            {wasDismissed && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-950 block">Payment Window Was Closed</span>
                  <span className="text-[11px] text-amber-800">
                    The checkout popup was dismissed without paying. Click the button below to reopen the Razorpay payment window.
                  </span>
                </div>
              </div>
            )}

            {/* Launch Modal Action */}
            <button
              onClick={() => launchRazorpayModal()}
              disabled={isLaunching}
              className={`w-full py-4 rounded-2xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                isLaunching
                  ? 'bg-emerald-400 text-slate-900 cursor-wait opacity-85 shadow-emerald-500/10'
                  : 'bg-[#00D084] hover:bg-emerald-500 text-slate-950 shadow-emerald-500/25 hover:shadow-xl cursor-pointer'
              }`}
            >
              {isLaunching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Opening Razorpay Checkout...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Open Razorpay Checkout Popup</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Offline Dummy Mode Simulator Modal (Only shows if backend is running in offline dummy mode) */}
      {showSimulatedModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-extrabold flex items-center justify-center text-sm shadow-md">
                  FC
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    Fresh-Cart Groceries
                    <ShieldCheck className="w-4 h-4 text-[#00D084]" />
                  </h3>
                  <p className="text-[11px] text-slate-400">Order Ref: {order.freshcart_order_id}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Amount</span>
                  <span className="text-lg font-extrabold text-[#00D084]">₹{order.total_payable.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleSimulatedDismiss}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Dismiss payment window"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Offline Test Simulation Notice */}
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-[11px] text-amber-900 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Razorpay Checkout Simulator (Offline Dummy Key Mode)
              </span>
              <span className="text-[10px] bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full font-bold">
                Offline Demo
              </span>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Select Payment Option
              </span>

              {/* Method Tabs */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSimMethod('upi')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    activeSimMethod === 'upi'
                      ? 'border-emerald-500 bg-emerald-50/50 text-slate-900 font-bold'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <Smartphone className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  <span className="text-xs block">UPI</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSimMethod('card')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    activeSimMethod === 'card'
                      ? 'border-emerald-500 bg-emerald-50/50 text-slate-900 font-bold'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <CreditCard className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  <span className="text-xs block">Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSimMethod('netbanking')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    activeSimMethod === 'netbanking'
                      ? 'border-emerald-500 bg-emerald-50/50 text-slate-900 font-bold'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <Building2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  <span className="text-xs block">NetBanking</span>
                </button>
              </div>

              {/* Details per method */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                {activeSimMethod === 'upi' && (
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800 block">UPI Collect (Test Mode)</span>
                    <p className="text-[11px] text-slate-500">Virtual Payment Address: success@razorpay</p>
                  </div>
                )}
                {activeSimMethod === 'card' && (
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800 block">Visa / Mastercard / RuPay</span>
                    <p className="text-[11px] text-slate-500">Card ending in •••• 4242</p>
                  </div>
                )}
                {activeSimMethod === 'netbanking' && (
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800 block">HDFC Bank Direct Gateway</span>
                    <p className="text-[11px] text-slate-500">Instant netbanking settlement</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleSimulatedOfflineSuccess}
                  className="w-full py-3.5 rounded-2xl bg-[#00D084] hover:bg-emerald-500 text-slate-950 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Simulate Success (₹{order.total_payable.toFixed(2)})</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulatedOfflineFailure}
                  className="w-full py-2.5 rounded-2xl bg-white hover:bg-red-50 text-red-600 font-semibold text-xs border border-red-200 transition-colors cursor-pointer"
                >
                  Simulate Bank Decline / Failure
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Encrypted with Razorpay 256-Bit SSL Standard</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
