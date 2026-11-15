export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUND_INITIATED'
  | 'REFUNDED';

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

export interface OrderDetails {
  freshcart_order_id: string;
  razorpay_order_id?: string;
  product_amount: number;
  delivery_charge: number;
  discount: number;
  total_payable: number;
  currency: string;
  customer: CustomerInfo;
  items: OrderItem[];
  delivery_address: string;
  delivery_slot: string;
}

export interface RazorpayOrderResponse {
  key_id: string;
  razorpay_order_id: string;
  freshcart_order_id: string;
  amount: number;
  amount_in_paise: number;
  currency: string;
  customer: CustomerInfo;
  payment_mode: 'test' | 'live';
  is_simulated: boolean;
}

export interface PaymentVerificationRequest {
  freshcart_order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifiedPaymentResult {
  verified: boolean;
  status: PaymentStatus;
  transaction_id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  freshcart_order_id: string;
  amount: number;
  currency: string;
  method?: string;
  payment_details?: {
    bank?: string;
    wallet?: string;
    vpa?: string;
    card_network?: string;
  };
  customer: CustomerInfo;
  timestamp: string;
}

export interface Transaction {
  id: string;
  freshcart_order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;
  card_network: string | null;
  card_type: string | null;
  error_code: string | null;
  error_description: string | null;
  signature_verified: number;
  created_at: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  refund_status?: string | null;
}

export interface Refund {
  id: string;
  transaction_id: string | null;
  razorpay_payment_id: string;
  razorpay_refund_id: string;
  amount: number;
  currency: string;
  status: string;
  speed: string;
  notes: string | null;
  receipt: string | null;
  created_at: string;
}

export interface DashboardMetrics {
  totalTransactions: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  totalAmountCollected: number;
  totalRefunds: number;
}

