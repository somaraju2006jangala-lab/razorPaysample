import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  ArrowRight,
  CheckCircle2,
  Edit3,
  RefreshCw,
  ShoppingBag,
  Clock,
  MapPin,
  Lock,
  Tag,
  Truck,
  Sparkles,
} from 'lucide-react';
import { useOrderState } from '../hooks/useOrderState.ts';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { order, updateOrder, resetOrder } = useOrderState();
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState(order);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrder(editFormData);
    setIsEditing(false);
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50/80 rounded-3xl border border-slate-200/80 p-8 sm:p-12 shadow-sm">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-semibold shadow-xs">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Official Fresh-Cart Payment Gateway Template</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Secure Payments for <br />
            <span className="bg-gradient-to-r from-emerald-600 via-[#00D084] to-emerald-500 bg-clip-text text-transparent">
              Fresh Organic Groceries
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 font-normal max-w-2xl mx-auto leading-relaxed">
            Fast, Easy and Secure Payments powered by Razorpay. Seamlessly integrated with UPI, Cards, Net Banking, and Wallets.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate('/selection')}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#00D084] hover:bg-emerald-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <span>Proceed to Payment Selection</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-emerald-600" />
              <span>Customize Order Details</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Grid: Order Summary & Payment Gateway Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Configurable Demo Order Summary */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Order Summary</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Order Ref: <span className="font-mono font-semibold text-slate-700">{order.freshcart_order_id}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditing(true)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100/80 cursor-pointer transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Order</span>
              </button>
            </div>

            {/* Delivery Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900 block">Deliver to: {order.customer.name}</span>
                  <span className="text-slate-500 line-clamp-1">{order.delivery_address}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900 block">Delivery Slot</span>
                  <span className="text-slate-500">{order.delivery_slot}</span>
                </div>
              </div>
            </div>

            {/* Grocery Items List */}
            <div className="space-y-3 mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Items in Basket</span>
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 text-sm border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                      {item.qty}x
                    </span>
                    <span className="font-medium text-slate-800">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900">₹{item.price * item.qty}</span>
                </div>
              ))}
            </div>

            {/* Pricing Calculation Breakdown */}
            <div className="border-t border-slate-100 pt-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Product Amount</span>
                <span className="font-medium text-slate-900">₹{order.product_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-slate-400" />
                  Delivery Charge
                </span>
                <span className="font-medium text-slate-900">₹{order.delivery_charge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  Fresh-Cart Discount
                </span>
                <span className="font-semibold">-₹{order.discount.toFixed(2)}</span>
              </div>

              {/* Total Payable */}
              <div className="border-t-2 border-dashed border-slate-200 pt-3 flex justify-between items-center text-base font-bold">
                <span className="text-slate-900">Total Payable</span>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-slate-900">
                    ₹{order.total_payable.toFixed(2)}
                  </span>
                  <span className="text-[11px] block font-normal text-slate-500">Inclusive of all taxes</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/selection')}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-[#00D084] hover:bg-emerald-500 text-slate-950 font-bold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Select Payment Method</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={resetOrder}
                title="Reset to default demo values"
                className="px-4 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Demo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Supported Methods & Security Features */}
        <div className="lg:col-span-5 space-y-6">
          {/* Supported Methods Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Supported Payment Methods
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Real-time payment options enabled on Fresh-Cart via Razorpay
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-1.5 hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>UPI Instant</span>
                </div>
                <span className="text-[11px] text-slate-500">GPay, PhonePe, Paytm, BHIM & UPI ID</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-1.5 hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Cards</span>
                </div>
                <span className="text-[11px] text-slate-500">Visa, Mastercard, RuPay, Maestro</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-1.5 hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Net Banking</span>
                </div>
                <span className="text-[11px] text-slate-500">SBI, HDFC, ICICI, Axis & 50+ Banks</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-1.5 hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Wallets</span>
                </div>
                <span className="text-[11px] text-slate-500">Paytm, PhonePe, Mobikwik, Amazon</span>
              </div>
            </div>
          </div>

          {/* Security & Trust Card */}
          <div className="bg-gradient-to-br from-emerald-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#00D084]/20 border border-[#00D084]/40 flex items-center justify-center text-[#00D084]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Bank-Grade Protection</h4>
                <p className="text-xs text-slate-300">PCI-DSS Level 1 & RBI Tokenized</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Customer card details and CVV are never saved or accessed by Fresh-Cart servers. All payments are encrypted and processed by Razorpay's certified banking infrastructure.
            </p>

            <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00D084]" />
                <span>HMAC SHA-256 Verified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00D084]" />
                <span>Instant Auto-Refunds</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00D084]" />
                <span>Webhook Auditing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00D084]" />
                <span>256-Bit SSL Encryption</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Order Modal / Form Drawer */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-600" />
                Customize Demo Order Details
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Fresh-Cart Order ID</label>
                <input
                  type="text"
                  required
                  value={editFormData.freshcart_order_id}
                  onChange={(e) => setEditFormData({ ...editFormData, freshcart_order_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Product (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editFormData.product_amount}
                    onChange={(e) => setEditFormData({ ...editFormData, product_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Delivery (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editFormData.delivery_charge}
                    onChange={(e) => setEditFormData({ ...editFormData, delivery_charge: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editFormData.discount}
                    onChange={(e) => setEditFormData({ ...editFormData, discount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-sm font-semibold text-emerald-600"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center text-sm font-bold">
                <span>Calculated Total:</span>
                <span className="text-emerald-600">
                  ₹{Math.max(0, editFormData.product_amount + editFormData.delivery_charge - editFormData.discount).toFixed(2)}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <span className="font-bold text-slate-900 block">Customer Information</span>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={editFormData.customer.name}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      customer: { ...editFormData.customer, name: e.target.value },
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={editFormData.customer.email}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        customer: { ...editFormData.customer, email: e.target.value },
                      })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Phone</label>
                    <input
                      type="tel"
                      required
                      value={editFormData.customer.phone}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        customer: { ...editFormData.customer, phone: e.target.value },
                      })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-[#00D084] hover:bg-emerald-500 text-slate-950 font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  Save & Apply Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

