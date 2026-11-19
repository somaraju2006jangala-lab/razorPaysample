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
   * Internal wrapper around fetch with configurable timeout, automatic retry for transient
   * network / Render cold-start proxy errors (502, 503, 504), and meaningful error messages.
   * Never exposes credentials, secrets, or sensitive details in error outputs.
   */
  private static async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = 120000,
    retries = 1,
    retryDelayMs = 2500
  ): Promise<Response> {
    let lastError: any = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        if (attempt > 0) {
          console.warn(`[PaymentGateway] Retrying request (attempt ${attempt + 1}/${retries + 1})...`);
        }

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        // Handle temporary Render cold-start gateway errors (502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout)
        if (
          (response.status === 502 || response.status === 503 || response.status === 504) &&
          attempt < retries
        ) {
          console.warn(
            `[PaymentGateway] Backend proxy returned HTTP ${response.status} (container waking up). Retrying in ${retryDelayMs}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          continue;
        }

        return response;
      } catch (err: any) {
        lastError = err;
        const isAbort = err.name === 'AbortError';
        const isNetworkError =
          err.message &&
          (err.message.includes('Failed to fetch') ||
            err.message.includes('NetworkError') ||
            err.message.includes('network'));

        // If request timed out or experienced temporary connection drop while container was booting, retry if attempts remain
        if (attempt < retries && (isAbort || isNetworkError)) {
          console.warn(
            `[PaymentGateway] Attempt ${attempt + 1} ${isAbort ? 'timed out' : 'network dropped'}. Server may be spinning up. Retrying in ${retryDelayMs}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          continue;
        }

        if (isAbort) {
          throw new Error(
            'Request timed out. The backend server took longer than expected to start up. Please tap Pay Securely to try again.'
          );
        }
        if (isNetworkError) {
          throw new Error('Unable to connect to the backend server. Please verify your network connectivity.');
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw lastError || new Error('Request failed after retries.');
  }

  /**
   * Cached health check & proactive container pre-warming probe.
   * Avoids multiple redundant requests and gracefully handles cold starts.
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
        console.log('[PaymentGateway] Checking backend health / pre-warming container...');
        // 120s timeout and 1 retry to accommodate Render cold start
        const res = await this.fetchWithTimeout(`${API_BASE}/health`, {}, 120000, 1, 2000);
        const data = await res.json();
        console.log(`[PaymentGateway] Backend healthy (Mode: ${data.payment_mode || 'unknown'}, Env: ${data.environment || 'unknown'})`);
        this.cachedHealth = { data, timestamp: Date.now() };
        return data;
      } catch (err: any) {
        console.warn('[PaymentGateway] Gateway health probe notice:', err.message);
        const fallback: HealthResponse = { status: 'offline', payment_mode: 'live', environment: 'production' };
        return fallback;
      } finally {
        this.healthInFlight = null;
      }
    })();

    return this.healthInFlight;
  }

  /**
   * Creates or retrieves a Razorpay order with cold-start tolerance and idempotency protection.
   * Tolerates Render cold-start duration with 120s window without premature aborts.
   */
  static async createOrder(order: OrderDetails): Promise<RazorpayOrderResponse> {
    const orderKey = `${order.freshcart_order_id}_${order.total_payable}`;
    const existingPromise = this.orderInFlight.get(orderKey);
    if (existingPromise) {
      console.log(`[PaymentGateway] Reusing in-flight order request for ${order.freshcart_order_id}`);
      return existingPromise;
    }

    const orderPromise = (async () => {
      try {
        console.log(`[PaymentGateway] Initiating payment order for ${order.freshcart_order_id} (Amount: ₹${order.total_payable})...`);
        // 120s timeout accommodates Render cold start without premature aborts, 1 retry on 502/503 cold-start proxy errors
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
          120000,
          1,
          2500
        );

        let data: any = null;
        try {
          data = await res.json();
        } catch {
          if (!res.ok) {
            throw new Error(`Payment gateway server returned HTTP ${res.status} (${res.statusText || 'Server Error'}). Please try again.`);
          }
        }

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || `Failed to initialize payment order (HTTP ${res.status}). Please try again.`);
        }

        console.log(`[PaymentGateway] Order initialized successfully: ${data.data.razorpay_order_id}`);
        return data.data;
      } catch (err: any) {
        console.error(`[PaymentGateway] Order creation failed for ${order.freshcart_order_id}:`, err.message);
        throw err;
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
      30000,
      1,
      1500
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

