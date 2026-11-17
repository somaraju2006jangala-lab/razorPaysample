import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useOrderState } from '../hooks/useOrderState.ts';
import { PaymentApiService } from '../services/api.ts';

type PaymentCategory = 'upi' | 'card' | 'netbanking' | 'wallet';

export const PaymentSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { order } = useOrderState();

  const [paymentMode, setPaymentMode] = useState<'test' | 'live'>('live');
  const [selectedCategory, setSelectedCategory] = useState<PaymentCategory>('upi');
  const [selectedSubMethod, setSelectedSubMethod] = useState<string>('upi_intent');

  useEffect(() => {
    PaymentApiService.checkHealth()
      .then((health) => {
        if (health?.payment_mode === 'test') {
          setPaymentMode('test');
        } else {
          setPaymentMode('live');
        }
      })
      .catch(() => {
        setPaymentMode('live');
      });
  }, []);

  const handleContinueToPay = () => {
    navigate(`/checkout/launch?method=${selectedCategory}&sub=${selectedSubMethod}`);
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

            <button
              onClick={handleContinueToPay}
              className="w-full py-4 rounded-2xl bg-[#00D084] hover:bg-emerald-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Pay Securely ₹{order.total_payable.toFixed(2)}</span>
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
