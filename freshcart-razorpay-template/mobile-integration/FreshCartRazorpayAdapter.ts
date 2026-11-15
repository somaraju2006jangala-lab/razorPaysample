/**
 * FreshCartRazorpayAdapter.ts
 * Reusable Mobile Adapter for Fresh-Cart React Native & Expo Mobile Applications.
 * Encapsulates backend order creation and cryptographic verification.
 */

export interface MobileOrderPayload {
  freshcart_order_id: string;
  total_payable: number;
  currency?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  notes?: Record<string, string>;
}

export interface MobileVerificationResult {
  verified: boolean;
  status: string;
  transaction_id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  freshcart_order_id: string;
  amount: number;
  currency: string;
  timestamp: string;
}

export class FreshCartRazorpayAdapter {
  private backendBaseUrl: string;

  constructor(backendBaseUrl: string) {
    this.backendBaseUrl = backendBaseUrl.replace(/\/$/, '');
  }

  /**
   * Step 1: Request backend to initialize order and generate Razorpay Order ID
   */
  async createPaymentOrder(payload: MobileOrderPayload): Promise<{
    key_id: string;
    razorpay_order_id: string;
    freshcart_order_id: string;
    amount_in_paise: number;
    currency: string;
    customer: any;
  }> {
    const response = await fetch(`${this.backendBaseUrl}/api/orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        freshcart_order_id: payload.freshcart_order_id,
        amount: payload.total_payable,
        currency: payload.currency || 'INR',
        customer: payload.customer,
        notes: payload.notes || {},
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to initiate order on Fresh-Cart payment gateway');
    }

    return data.data;
  }

  /**
   * Step 2: Forward native SDK payment result to backend for cryptographic verification
   */
  async verifyPayment(params: {
    freshcart_order_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<MobileVerificationResult> {
    const response = await fetch(`${this.backendBaseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Payment signature verification failed on server');
    }

    return data.data;
  }

  /**
   * Step 3: Report failure or dismissal back to backend for audit trail
   */
  async reportFailure(params: {
    freshcart_order_id: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    error_code?: string;
    error_description?: string;
  }): Promise<void> {
    try {
      await fetch(`${this.backendBaseUrl}/api/payments/report-failure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
    } catch (e) {
      console.warn('Failed to report failure to backend:', e);
    }
  }
}

