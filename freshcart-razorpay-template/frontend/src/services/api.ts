import {
  OrderDetails,
  RazorpayOrderResponse,
  PaymentVerificationRequest,
  VerifiedPaymentResult,
  Transaction,
  Refund,
  DashboardMetrics,
} from '../types/payment.ts';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://razorpaysample.onrender.com/api').replace(/\/$/, '');

export interface HealthResponse {
  status: string;
  payment_mode: string;
  environment: string;
}

export class PaymentApiService {
  private static cachedHealth: { data: HealthResponse; timestamp: number } | null = null;
  private static healthInFlight: Promise<HealthResponse> | null = null;
  private static orderInFlight: Map<string, Promise<RazorpayOrderResponse>> = new Map();

  private static getHeaders(includeAuth = false): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (includeAuth) {
      const token = localStorage.getItem('freshcart_admin_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  /**
   * Internal wrapper around fetch with configurable timeout and meaningful error messages.
   */
  private static async fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 20000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(
          'Request timed out. The backend server might be spinning up (Render cold start) or your connection is slow. Please retry.'
        );
      }
      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to the backend server. Please verify network connectivity.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Cached health check: avoids multiple redundant requests from MainLayout & PaymentSelectionPage.
   */
  static async checkHealth(): Promise<HealthResponse> {
    const now = Date.now();
    if (this.cachedHealth && now - this.cachedHealth.timestamp < 60000) {
      return this.cachedHealth.data;
    }

    if (this.healthInFlight) {
      return this.healthInFlight;
    }

    this.healthInFlight = (async () => {
      try {
        const res = await this.fetchWithTimeout(`${API_BASE}/health`, {}, 8000);
        const data = await res.json();
        this.cachedHealth = { data, timestamp: Date.now() };
        return data;
      } catch {
        const fallback: HealthResponse = { status: 'offline', payment_mode: 'test', environment: 'development' };
        return fallback;
      } finally {
        this.healthInFlight = null;
      }
    })();

    return this.healthInFlight;
  }

  /**
   * Creates or retrieves a Razorpay order with timeout and duplicate-request protection.
   */
  static async createOrder(order: OrderDetails): Promise<RazorpayOrderResponse> {
    const orderKey = `${order.freshcart_order_id}_${order.total_payable}`;
    const existingPromise = this.orderInFlight.get(orderKey);
    if (existingPromise) {
      return existingPromise;
    }

    const orderPromise = (async () => {
      try {
        const res = await this.fetchWithTimeout(
          `${API_BASE}/orders/create`,
          {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
              freshcart_order_id: order.freshcart_order_id,
              amount: order.total_payable,
              currency: order.currency || 'INR',
              customer: order.customer,
              items: order.items,
              notes: {
                delivery_slot: order.delivery_slot,
                delivery_address: order.delivery_address,
                product_amount: order.product_amount,
                delivery_charge: order.delivery_charge,
                discount: order.discount,
              },
            }),
          },
          25000 // 25s timeout for order creation (handles Render cold start)
        );

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to initialize payment order');
        }
        return data.data;
      } finally {
        this.orderInFlight.delete(orderKey);
      }
    })();

    this.orderInFlight.set(orderKey, orderPromise);
    return orderPromise;
  }

  static async verifyPayment(payload: PaymentVerificationRequest): Promise<VerifiedPaymentResult> {
    const res = await this.fetchWithTimeout(
      `${API_BASE}/payments/verify`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      },
      20000
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Payment signature verification failed');
    }
    return data.data;
  }

  static async reportFailure(params: {
    freshcart_order_id: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    error_code?: string;
    error_description?: string;
  }): Promise<void> {
    try {
      await fetch(`${API_BASE}/payments/report-failure`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(params),
      });
    } catch (e) {
      console.warn('Failed to report failure to backend:', e);
    }
  }

  static async getPaymentStatus(identifier: string): Promise<any> {
    const res = await fetch(`${API_BASE}/payments/status/${identifier}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch status');
    return data.data;
  }

  static async getTransactionDetails(id: string): Promise<{ transaction: Transaction; order: any; refunds: Refund[] }> {
    const res = await fetch(`${API_BASE}/payments/transaction/${id}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch transaction details');
    return data.data;
  }

  static async listTransactions(params: {
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ transactions: Transaction[]; total: number }> {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.offset) query.append('offset', params.offset.toString());

    const res = await fetch(`${API_BASE}/payments/history?${query.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch transaction history');
    return {
      transactions: data.data,
      total: data.pagination.total,
    };
  }

  static async getRefundStatus(refundId: string): Promise<Refund> {
    const res = await fetch(`${API_BASE}/refunds/${refundId}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Refund not found');
    return data.data;
  }

  // Admin APIs
  static async adminLogin(username: string, password: string): Promise<{ token: string; user: any }> {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Authentication failed');
    localStorage.setItem('freshcart_admin_token', data.data.token);
    return data.data;
  }

  static async getAdminStats(): Promise<DashboardMetrics> {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: this.getHeaders(true),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch admin stats');
    return data.data;
  }

  static async getAdminWebhooks(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/admin/webhooks`, {
      headers: this.getHeaders(true),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch webhook logs');
    return data.data;
  }

  static async getAdminAuditLogs(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/admin/audit-logs`, {
      headers: this.getHeaders(true),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch audit logs');
    return data.data;
  }

  static async initiateRefund(params: {
    payment_id: string;
    amount?: number;
    reason?: string;
    speed?: 'optimum' | 'instant' | 'normal';
  }): Promise<Refund> {
    const res = await fetch(`${API_BASE}/refunds/initiate`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to initiate refund');
    return data.data;
  }
}

