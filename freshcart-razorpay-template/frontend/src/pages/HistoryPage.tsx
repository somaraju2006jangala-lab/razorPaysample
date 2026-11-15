import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Download,
  Calendar,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { PaymentApiService } from '../services/api.ts';
import { Transaction } from '../types/payment.ts';

export const HistoryPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await PaymentApiService.listTransactions({
        status: statusFilter,
        search: searchTerm,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setTransactions(res.transactions);
      setTotal(res.total);
    } catch (e) {
      console.error('Failed to load transaction history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  const exportToCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['Transaction ID', 'Order ID', 'Razorpay Payment ID', 'Amount', 'Currency', 'Method', 'Status', 'Date'];
    const rows = transactions.map((t) => [
      t.id,
      t.freshcart_order_id,
      t.razorpay_payment_id,
      t.amount,
      t.currency,
      t.method || 'N/A',
      t.status,
      new Date(t.created_at).toISOString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `freshcart_transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CAPTURED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            CAPTURED
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 inline-flex items-center gap-1">
            <XCircle className="w-3 h-3 text-red-600" />
            FAILED
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
            <RotateCcw className="w-3 h-3 text-purple-600" />
            REFUNDED
          </span>
        );
      case 'REFUND_INITIATED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
            <RotateCcw className="w-3 h-3 text-purple-600" />
            REFUND PENDING
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Transaction History</h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit log of all payments processed via Fresh-Cart Razorpay Gateway
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchHistory}
            className="p-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Filter:</span>
          {['ALL', 'CAPTURED', 'FAILED', 'PENDING', 'REFUNDED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Order ID, Payment ID, or Customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-4 flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl border border-slate-200 text-xs text-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl border border-slate-200 text-xs text-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-2xl bg-[#00D084] hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        </form>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-semibold">Loading transactions from database...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-sm font-bold text-slate-700">No transactions found</p>
            <p className="text-xs text-slate-400">Try adjusting your filters or complete a demo checkout first.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6">Fresh-Cart Order</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Razorpay Payment ID</th>
                  <th className="py-3.5 px-6">Amount</th>
                  <th className="py-3.5 px-6">Method</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      {t.freshcart_order_id}
                    </td>
                    <td className="py-4 px-6 text-slate-700">
                      <span className="font-semibold block">{t.customer_name || 'Rahul Sharma'}</span>
                      <span className="text-[11px] text-slate-400">{t.customer_phone || ''}</span>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-600 text-[11px]">
                      {t.razorpay_payment_id}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900 text-sm">
                      ₹{t.amount.toFixed(2)}
                    </td>
                    <td className="py-4 px-6 uppercase font-medium text-slate-600">
                      {t.method || 'upi'}
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(t.status)}
                    </td>
                    <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/payment/transaction/${t.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs text-slate-500">
          <span>Total records: <strong>{total}</strong></span>
          <span>Showing latest transactions</span>
        </div>
      </div>
    </div>
  );
};

