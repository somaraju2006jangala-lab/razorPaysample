import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  CreditCard,
  Hash,
  Calendar,
  User,
  ShoppingBag,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { PaymentApiService } from '../services/api.ts';
import { Transaction, Refund } from '../types/payment.ts';

export const TransactionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [refunds, setRefunds] = useState<Refund[]>([]);

  useEffect(() => {
    if (!id) return;

    PaymentApiService.getTransactionDetails(id)
      .then((data) => {
        setTransaction(data.transaction);
        setOrder(data.order);
        setRefunds(data.refunds || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch transaction details.');
        setLoading(false);
      });
  }, [id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CAPTURED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            CAPTURED
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            FAILED
          </span>
        );
      case 'REFUNDED':
      case 'REFUND_INITIATED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-semibold">Loading transaction records...</p>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <XCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Transaction Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'No matching record for identifier.'}</p>
        <button
          onClick={() => navigate('/history')}
          className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold"
        >
          Return to History
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {getStatusBadge(transaction.status)}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Transaction Amount</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">₹{transaction.amount.toFixed(2)}</span>
              <span className="text-xs font-semibold text-slate-500">{transaction.currency}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-slate-400 block">Verification Status</span>
            {transaction.signature_verified ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 mt-1">
                <ShieldCheck className="w-4 h-4" />
                HMAC SHA-256 Validated
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 mt-1">
                <XCircle className="w-4 h-4" />
                Unverified / Signature Absent
              </span>
            )}
          </div>
        </div>

        {/* Detailed Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-400 font-semibold block">Fresh-Cart Order ID</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{transaction.freshcart_order_id}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-400 font-semibold block">Razorpay Order ID</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{transaction.razorpay_order_id}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-400 font-semibold block">Razorpay Payment ID</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{transaction.razorpay_payment_id}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-400 font-semibold block">Payment Method</span>
            <span className="font-bold text-slate-900 text-sm uppercase">
              {transaction.method || 'Not Specified'} {transaction.bank ? `(${transaction.bank})` : ''} {transaction.card_network ? `(${transaction.card_network})` : ''}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-400 font-semibold block">Transaction Date</span>
            <span className="font-medium text-slate-900 text-sm">{new Date(transaction.created_at).toLocaleString('en-IN')}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-400 font-semibold block">Customer</span>
            <span className="font-medium text-slate-900 text-sm">
              {order?.customer_name || 'Rahul Sharma'} ({order?.customer_email || 'N/A'})
            </span>
          </div>
        </div>

        {/* Error Info (if failed) */}
        {transaction.error_code && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
            <span className="font-bold block">Gateway Error: {transaction.error_code}</span>
            <p className="text-red-700">{transaction.error_description}</p>
          </div>
        )}

        {/* Refunds Section */}
        {refunds.length > 0 && (
          <div className="border-t border-slate-100 pt-6 space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-purple-600" />
              Linked Refunds
            </h3>

            {refunds.map((ref) => (
              <div key={ref.id} className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-purple-950 block">{ref.razorpay_refund_id}</span>
                  <span className="text-purple-700">Amount: ₹{ref.amount} • Speed: {ref.speed}</span>
                </div>
                <Link
                  to={`/refunds/status?refundId=${ref.razorpay_refund_id}`}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors"
                >
                  View Refund Status
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

