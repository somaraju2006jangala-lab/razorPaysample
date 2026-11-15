import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  LogOut,
  AlertTriangle,
  Loader2,
  FileText,
  Activity,
  PlusCircle,
  TrendingUp,
} from 'lucide-react';
import { PaymentApiService } from '../services/api.ts';
import { DashboardMetrics, Transaction } from '../types/payment.ts';

export const AdminDashboardPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('admin@freshcart2026');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'transactions' | 'webhooks' | 'audit'>('transactions');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Refund Modal State
  const [refundTargetTx, setRefundTargetTx] = useState<Transaction | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState<string>('');
  const [refundSpeed, setRefundSpeed] = useState<'optimum' | 'instant'>('optimum');
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundSuccessMsg, setRefundSuccessMsg] = useState<string | null>(null);
  const [refundErrorMsg, setRefundErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('freshcart_admin_token');
    if (token) {
      setIsAuthenticated(true);
      loadAdminData();
    }
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [stats, txs, webhooks, audits] = await Promise.all([
        PaymentApiService.getAdminStats(),
        PaymentApiService.listTransactions({ limit: 100 }),
        PaymentApiService.getAdminWebhooks(),
        PaymentApiService.getAdminAuditLogs(),
      ]);
      setMetrics(stats);
      setTransactions(txs.transactions);
      setWebhookLogs(webhooks);
      setAuditLogs(audits);
    } catch (e: any) {
      if (e.message?.includes('token') || e.message?.includes('Authentication')) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoggingIn(true);
      setLoginError(null);
      await PaymentApiService.adminLogin(loginUsername, loginPassword);
      setIsAuthenticated(true);
      loadAdminData();
    } catch (err: any) {
      setLoginError(err.message || 'Invalid credentials');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('freshcart_admin_token');
    setIsAuthenticated(false);
  };

  const openRefundModal = (tx: Transaction) => {
    setRefundTargetTx(tx);
    setRefundAmount(tx.amount);
    setRefundReason('Customer requested cancellation / refund via Admin Portal');
    setRefundSuccessMsg(null);
    setRefundErrorMsg(null);
  };

  const handleExecuteRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTargetTx) return;

    try {
      setIsRefunding(true);
      setRefundErrorMsg(null);
      const res = await PaymentApiService.initiateRefund({
        payment_id: refundTargetTx.razorpay_payment_id,
        amount: refundAmount,
        reason: refundReason,
        speed: refundSpeed,
      });

      setRefundSuccessMsg(`Refund initiated successfully: ${res.razorpay_refund_id} for ₹${res.amount}`);
      loadAdminData();
      setTimeout(() => {
        setRefundTargetTx(null);
      }, 1500);
    } catch (err: any) {
      setRefundErrorMsg(err.message || 'Refund failed');
    } finally {
      setIsRefunding(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Admin Payment Portal</h1>
            <p className="text-xs text-slate-500">Sign in to manage Fresh-Cart transactions and refunds</p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Admin Username</label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Secret Key / Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Authenticate & Enter</span>
            </button>
          </form>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500">
            <strong>Default Demo Credentials:</strong>
            <div className="font-mono mt-1 text-slate-700">Username: admin | Password: admin@freshcart2026</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Admin Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Payment Dashboard</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Role: Master Admin
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time settlement metrics, transaction monitoring, and controlled refund execution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAdminData}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-xs"
          >
            Refresh Data
          </button>
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Dashboard Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Transactions</span>
            <span className="text-2xl font-extrabold text-slate-900">{metrics.totalTransactions}</span>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Successful</span>
            <span className="text-2xl font-extrabold text-emerald-600">{metrics.successfulPayments}</span>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider block">Failed</span>
            <span className="text-2xl font-extrabold text-red-600">{metrics.failedPayments}</span>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Pending</span>
            <span className="text-2xl font-extrabold text-amber-600">{metrics.pendingPayments}</span>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Collected</span>
            <span className="text-xl font-extrabold text-slate-900">₹{metrics.totalAmountCollected.toLocaleString('en-IN')}</span>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">Total Refunds</span>
            <span className="text-xl font-extrabold text-purple-600">₹{metrics.totalRefunds.toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'transactions'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Transactions & Refund Operations</span>
        </button>

        <button
          onClick={() => setActiveTab('webhooks')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'webhooks'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Razorpay Webhook Event Logs ({webhookLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Admin Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Transactions Table */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6">Transaction ID</th>
                  <th className="py-3.5 px-6">Order ID</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Amount</th>
                  <th className="py-3.5 px-6">Method</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-mono text-[11px] text-slate-600">
                      {tx.id.substring(0, 8)}...
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      {tx.freshcart_order_id}
                    </td>
                    <td className="py-4 px-6 text-slate-700">
                      <span className="font-semibold block">{tx.customer_name || 'Rahul Sharma'}</span>
                      <span className="text-[11px] text-slate-400">{tx.customer_email || 'customer@freshcart.com'}</span>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900 text-sm">
                      ₹{tx.amount.toFixed(2)}
                    </td>
                    <td className="py-4 px-6 uppercase font-medium text-slate-600">
                      {tx.method || 'upi'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        tx.status === 'CAPTURED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tx.status === 'REFUNDED'
                          ? 'bg-purple-100 text-purple-800'
                          : tx.status === 'FAILED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {tx.status === 'CAPTURED' && (
                        <button
                          onClick={() => openRefundModal(tx)}
                          className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition-colors cursor-pointer mr-2"
                        >
                          Refund
                        </button>
                      )}
                      <a
                        href={`/payment/transaction/${tx.id}`}
                        className="text-emerald-600 hover:text-emerald-700 font-bold"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Razorpay Webhook Event Logs */}
      {activeTab === 'webhooks' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-6 space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Incoming Webhook Event Audit Log</h3>
            <p className="text-xs text-slate-500">Every Razorpay event received is verified against HMAC SHA-256 webhook secret</p>
          </div>

          <div className="space-y-3">
            {webhookLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No webhook events logged yet.</p>
            ) : (
              webhookLogs.map((wh) => (
                <div key={wh.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{wh.event_type}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        wh.signature_valid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {wh.signature_valid ? 'Signature Valid' : 'Invalid Signature'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{new Date(wh.created_at).toLocaleString('en-IN')}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>Payment ID: <span className="font-mono text-slate-900">{wh.razorpay_payment_id || 'N/A'}</span></div>
                    <div>Order ID: <span className="font-mono text-slate-900">{wh.razorpay_order_id || 'N/A'}</span></div>
                  </div>

                  <details className="text-[11px] text-slate-500 pt-1">
                    <summary className="cursor-pointer font-semibold text-emerald-600 hover:text-emerald-700">View Raw Payload</summary>
                    <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl overflow-x-auto mt-1 font-mono text-[10px]">
                      {wh.payload_json}
                    </pre>
                  </details>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Admin Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Administrator Activity Log</h3>
            <p className="text-xs text-slate-500">Security audit trail of refunds and administrative actions</p>
          </div>

          <div className="space-y-3">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No administrative actions logged yet.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{log.action}</span>
                      <span className="text-slate-400">by {log.admin_user}</span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{log.details}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString('en-IN')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Refund Initiation Modal */}
      {refundTargetTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-purple-600" />
                Initiate Controlled Refund
              </h3>
              <button
                onClick={() => setRefundTargetTx(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {refundSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 mb-4 font-semibold">
                {refundSuccessMsg}
              </div>
            )}

            {refundErrorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 mb-4 font-semibold">
                {refundErrorMsg}
              </div>
            )}

            <form onSubmit={handleExecuteRefund} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order:</span>
                  <span className="font-mono font-bold text-slate-900">{refundTargetTx.freshcart_order_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment ID:</span>
                  <span className="font-mono text-slate-700">{refundTargetTx.razorpay_payment_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Captured Amount:</span>
                  <span className="font-bold text-slate-900">₹{refundTargetTx.amount}</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Refund Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  max={refundTargetTx.amount}
                  min="1"
                  required
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 text-sm font-bold"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Full or partial refund up to original payment</span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason for Refund</label>
                <textarea
                  required
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Refund Speed</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRefundSpeed('optimum')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold cursor-pointer ${
                      refundSpeed === 'optimum'
                        ? 'bg-purple-50 border-purple-500 text-purple-900'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Optimum (Normal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundSpeed('instant')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold cursor-pointer ${
                      refundSpeed === 'instant'
                        ? 'bg-purple-50 border-purple-500 text-purple-900'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Instant (Supported Banks)
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={isRefunding}
                  className="flex-1 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  {isRefunding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  <span>Authorize & Refund ₹{refundAmount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRefundTargetTx(null)}
                  className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
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

