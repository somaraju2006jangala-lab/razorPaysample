import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  ArrowLeft,
  ShieldCheck,
  Hash,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { PaymentApiService } from '../services/api.ts';
import { Refund } from '../types/payment.ts';

export const RefundStatusPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryRefundId = searchParams.get('refundId') || '';
  const [searchInput, setSearchInput] = useState(queryRefundId);
  const [refund, setRefund] = useState<Refund | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRefund = async (id: string) => {
    if (!id.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const res = await PaymentApiService.getRefundStatus(id.trim());
      setRefund(res);
    } catch (err: any) {
      setError(err.message || 'Refund record not found.');
      setRefund(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryRefundId) {
      fetchRefund(queryRefundId);
    }
  }, [queryRefundId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput) {
      fetchRefund(searchInput);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/history')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Transactions</span>
        </button>

        <span className="text-xs font-bold text-slate-500">Refund Tracking Center</span>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-1">Track Fresh-Cart Refund</h2>
        <p className="text-xs text-slate-500 mb-4">Enter Razorpay Refund ID (e.g., rfnd_...) to check settlement status</p>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. rfnd_DEMO1003ref"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-colors"
          >
            Track
          </button>
        </form>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-semibold">Querying refund status from gateway...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <XCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-900">Refund Not Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">{error}</p>
        </div>
      )}

      {/* Refund Details Result */}
      {refund && !loading && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-sm space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-md">
              <RotateCcw className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Refund Status: {refund.status}</span>
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900">Refund Verified</h1>
            <p className="text-xs text-slate-500">Processed back to original payment instrument.</p>

            <div className="pt-2">
              <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Refund Amount</span>
              <span className="text-3xl font-extrabold text-slate-900">₹{refund.amount.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t border-b border-slate-100 py-5 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Refund Reference ID</span>
              <span className="font-mono font-bold text-slate-900">{refund.razorpay_refund_id}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Original Payment ID</span>
              <span className="font-mono font-bold text-slate-900">{refund.razorpay_payment_id}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Processing Speed</span>
              <span className="font-semibold text-slate-900 uppercase">{refund.speed}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Initiated On</span>
              <span className="font-medium text-slate-900">{new Date(refund.created_at).toLocaleString('en-IN')}</span>
            </div>

            {refund.notes && (
              <div className="flex justify-between items-start pt-1">
                <span className="text-slate-500">Refund Reason</span>
                <span className="font-medium text-slate-800 max-w-xs text-right">{refund.notes}</span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-500 leading-relaxed">
            Refunds via UPI or Netbanking are credited instantly or within 24-48 hours. Card refunds reflect on statements within 5-7 banking business days.
          </div>
        </div>
      )}
    </div>
  );
};

