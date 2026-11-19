import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db.js';

export interface OrderRecord {
  id: string;
  freshcart_order_id: string;
  razorpay_order_id: string | null;
  amount: number;
  amount_in_paise: number;
  currency: string;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items_json: string;
  notes_json: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionRecord {
  id: string;
  freshcart_order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string | null;
  amount: number;
  amount_in_paise: number;
  currency: string;
  status: string;
  method: string | null;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;
  card_network: string | null;
  card_type: string | null;
  error_code: string | null;
  error_description: string | null;
  signature_verified: number;
  raw_payload: string | null;
  created_at: string;
  updated_at: string;
}

export interface RefundRecord {
  id: string;
  transaction_id: string | null;
  razorpay_payment_id: string;
  razorpay_refund_id: string;
  amount: number;
  amount_in_paise: number;
  currency: string;
  status: string;
  speed: string;
  notes: string | null;
  receipt: string | null;
  created_at: string;
  updated_at: string;
}

export class PaymentPersistenceService {
  // Orders
  static createOrder(data: {
    freshcart_order_id: string;
    razorpay_order_id?: string;
    amount: number;
    currency?: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    items?: any[];
    notes?: Record<string, any>;
  }): OrderRecord {
    const id = uuidv4();
    const amountInPaise = Math.round(data.amount * 100);
    const currency = data.currency || 'INR';
    const itemsJson = JSON.stringify(data.items || []);
    const notesJson = JSON.stringify(data.notes || {});

    const stmt = db.prepare(`
      INSERT INTO orders (
        id, freshcart_order_id, razorpay_order_id, amount, amount_in_paise,
        currency, status, customer_name, customer_email, customer_phone,
        items_json, notes_json, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, 'CREATED', ?, ?, ?,
        ?, ?, datetime('now'), datetime('now')
      )
    `);

    stmt.run(
      id,
      data.freshcart_order_id,
      data.razorpay_order_id || null,
      data.amount,
      amountInPaise,
      currency,
      data.customer_name,
      data.customer_email,
      data.customer_phone,
      itemsJson,
      notesJson
    );

    return this.getOrderByFreshCartId(data.freshcart_order_id)!;
  }

  static updateRazorpayOrderId(freshcartOrderId: string, razorpayOrderId: string) {
    const stmt = db.prepare(`
      UPDATE orders
      SET razorpay_order_id = ?, updated_at = datetime('now')
      WHERE freshcart_order_id = ?
    `);
    stmt.run(razorpayOrderId, freshcartOrderId);
  }

  static updateOrderStatus(freshcartOrderId: string, status: string) {
    const stmt = db.prepare(`
      UPDATE orders
      SET status = ?, updated_at = datetime('now')
      WHERE freshcart_order_id = ?
    `);
    stmt.run(status, freshcartOrderId);
  }

  static updateOrderAmount(freshcartOrderId: string, amount: number, amountInPaise: number) {
    const stmt = db.prepare(`
      UPDATE orders
      SET amount = ?, amount_in_paise = ?, updated_at = datetime('now')
      WHERE freshcart_order_id = ?
    `);
    stmt.run(amount, amountInPaise, freshcartOrderId);
  }

  /**
   * Atomically updates an unpaid order with a new Razorpay order ID and matching amount.
   * Uses WHERE status NOT IN ('CAPTURED', 'AUTHORIZED') to ensure paid orders can never be overwritten.
   * Guarantees that the DB amount, amount_in_paise, and Razorpay order ID always match atomically.
   */
  static updateOrderWithNewRazorpayOrder(data: {
    freshcart_order_id: string;
    razorpay_order_id: string;
    amount: number;
    amount_in_paise: number;
    currency?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    items?: any[];
    notes?: Record<string, any>;
  }): boolean {
    const currency = data.currency || 'INR';
    const itemsJson = data.items ? JSON.stringify(data.items) : null;
    const notesJson = data.notes ? JSON.stringify(data.notes) : null;

    const stmt = db.prepare(`
      UPDATE orders
      SET razorpay_order_id = ?,
          amount = ?,
          amount_in_paise = ?,
          currency = ?,
          status = 'CREATED',
          customer_name = COALESCE(?, customer_name),
          customer_email = COALESCE(?, customer_email),
          customer_phone = COALESCE(?, customer_phone),
          items_json = COALESCE(?, items_json),
          notes_json = COALESCE(?, notes_json),
          updated_at = datetime('now')
      WHERE freshcart_order_id = ? AND status NOT IN ('CAPTURED', 'AUTHORIZED')
    `);

    const result = stmt.run(
      data.razorpay_order_id,
      data.amount,
      data.amount_in_paise,
      currency,
      data.customer_name || null,
      data.customer_email || null,
      data.customer_phone || null,
      itemsJson,
      notesJson,
      data.freshcart_order_id
    );

    return result.changes > 0;
  }

  static getOrderByFreshCartId(freshcartOrderId: string): OrderRecord | null {
    const stmt = db.prepare(`SELECT * FROM orders WHERE freshcart_order_id = ?`);
    return (stmt.get(freshcartOrderId) as OrderRecord) || null;
  }

  static getOrderByRazorpayId(razorpayOrderId: string): OrderRecord | null {
    const stmt = db.prepare(`SELECT * FROM orders WHERE razorpay_order_id = ?`);
    return (stmt.get(razorpayOrderId) as OrderRecord) || null;
  }

  // Transactions
  static recordTransaction(data: {
    freshcart_order_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature?: string;
    amount: number;
    currency?: string;
    status: string;
    method?: string;
    bank?: string;
    wallet?: string;
    vpa?: string;
    card_network?: string;
    card_type?: string;
    error_code?: string;
    error_description?: string;
    signature_verified: boolean;
    raw_payload?: any;
  }): TransactionRecord {
    // Check if transaction already recorded (Idempotency)
    const existing = this.getTransactionByPaymentId(data.razorpay_payment_id);
    if (existing) {
      // Update existing record
      const updateStmt = db.prepare(`
        UPDATE transactions
        SET status = ?,
            signature_verified = ?,
            error_code = ?,
            error_description = ?,
            raw_payload = ?,
            updated_at = datetime('now')
        WHERE razorpay_payment_id = ?
      `);
      updateStmt.run(
        data.status,
        data.signature_verified ? 1 : 0,
        data.error_code || existing.error_code,
        data.error_description || existing.error_description,
        data.raw_payload ? JSON.stringify(data.raw_payload) : existing.raw_payload,
        data.razorpay_payment_id
      );

      this.updateOrderStatus(data.freshcart_order_id, data.status);
      return this.getTransactionByPaymentId(data.razorpay_payment_id)!;
    }

    const id = uuidv4();
    const amountInPaise = Math.round(data.amount * 100);
    const currency = data.currency || 'INR';

    const stmt = db.prepare(`
      INSERT INTO transactions (
        id, freshcart_order_id, razorpay_order_id, razorpay_payment_id,
        razorpay_signature, amount, amount_in_paise, currency, status,
        method, bank, wallet, vpa, card_network, card_type,
        error_code, error_description, signature_verified, raw_payload,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        datetime('now'), datetime('now')
      )
    `);

    stmt.run(
      id,
      data.freshcart_order_id,
      data.razorpay_order_id,
      data.razorpay_payment_id,
      data.razorpay_signature || null,
      data.amount,
      amountInPaise,
      currency,
      data.status,
      data.method || null,
      data.bank || null,
      data.wallet || null,
      data.vpa || null,
      data.card_network || null,
      data.card_type || null,
      data.error_code || null,
      data.error_description || null,
      data.signature_verified ? 1 : 0,
      data.raw_payload ? JSON.stringify(data.raw_payload) : null
    );

    // Synchronize order status
    this.updateOrderStatus(data.freshcart_order_id, data.status);

    return this.getTransactionByPaymentId(data.razorpay_payment_id)!;
  }

  static getTransactionByPaymentId(paymentId: string): TransactionRecord | null {
    const stmt = db.prepare(`SELECT * FROM transactions WHERE razorpay_payment_id = ?`);
    return (stmt.get(paymentId) as TransactionRecord) || null;
  }

  static getTransactionByFreshCartOrderId(freshcartOrderId: string): TransactionRecord | null {
    const stmt = db.prepare(`
      SELECT * FROM transactions 
      WHERE freshcart_order_id = ? 
      ORDER BY created_at DESC LIMIT 1
    `);
    return (stmt.get(freshcartOrderId) as TransactionRecord) || null;
  }

  static getTransactionById(id: string): TransactionRecord | null {
    const stmt = db.prepare(`SELECT * FROM transactions WHERE id = ?`);
    return (stmt.get(id) as TransactionRecord) || null;
  }

  static listTransactions(params: {
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): { transactions: any[]; total: number } {
    const { status, search, startDate, endDate, limit = 50, offset = 0 } = params;

    let query = `
      SELECT t.*, o.customer_name, o.customer_email, o.customer_phone,
             (SELECT COUNT(*) FROM refunds r WHERE r.razorpay_payment_id = t.razorpay_payment_id) as refund_count,
             (SELECT status FROM refunds r WHERE r.razorpay_payment_id = t.razorpay_payment_id ORDER BY r.created_at DESC LIMIT 1) as refund_status
      FROM transactions t
      LEFT JOIN orders o ON t.freshcart_order_id = o.freshcart_order_id
      WHERE 1=1
    `;
    const countQuery = `
      SELECT COUNT(*) as count
      FROM transactions t
      LEFT JOIN orders o ON t.freshcart_order_id = o.freshcart_order_id
      WHERE 1=1
    `;

    const conditions: string[] = [];
    const values: any[] = [];

    if (status && status !== 'ALL') {
      conditions.push(`t.status = ?`);
      values.push(status);
    }

    if (search) {
      conditions.push(`(
        t.freshcart_order_id LIKE ? OR
        t.razorpay_order_id LIKE ? OR
        t.razorpay_payment_id LIKE ? OR
        o.customer_name LIKE ? OR
        o.customer_email LIKE ?
      )`);
      const s = `%${search}%`;
      values.push(s, s, s, s, s);
    }

    if (startDate) {
      conditions.push(`t.created_at >= ?`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`t.created_at <= ?`);
      values.push(endDate);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';

    const totalStmt = db.prepare(countQuery + whereClause);
    const totalResult = totalStmt.get(...values) as { count: number };

    const listStmt = db.prepare(`
      ${query} ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `);

    const transactions = listStmt.all(...values, limit, offset);

    return {
      transactions,
      total: totalResult ? totalResult.count : 0,
    };
  }

  // Refunds
  static recordRefund(data: {
    transaction_id?: string | null;
    razorpay_payment_id: string;
    razorpay_refund_id: string;
    amount: number;
    currency?: string;
    status: string;
    speed?: string;
    notes?: string | null;
    receipt?: string | null;
  }): RefundRecord {
    const id = uuidv4();
    const amountInPaise = Math.round(data.amount * 100);
    const currency = data.currency || 'INR';

    const stmt = db.prepare(`
      INSERT INTO refunds (
        id, transaction_id, razorpay_payment_id, razorpay_refund_id,
        amount, amount_in_paise, currency, status, speed,
        notes, receipt, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, datetime('now'), datetime('now')
      )
    `);

    stmt.run(
      id,
      data.transaction_id || null,
      data.razorpay_payment_id,
      data.razorpay_refund_id,
      data.amount,
      amountInPaise,
      currency,
      data.status,
      data.speed || 'optimum',
      data.notes || null,
      data.receipt || null
    );

    // Update parent transaction status to REFUND_INITIATED or REFUNDED
    const tx = this.getTransactionByPaymentId(data.razorpay_payment_id);
    if (tx) {
      const newStatus = data.status === 'PROCESSED' ? 'REFUNDED' : 'REFUND_INITIATED';
      const txUpdate = db.prepare(`
        UPDATE transactions
        SET status = ?, updated_at = datetime('now')
        WHERE razorpay_payment_id = ?
      `);
      txUpdate.run(newStatus, data.razorpay_payment_id);
      this.updateOrderStatus(tx.freshcart_order_id, newStatus);
    }

    return this.getRefundByRefundId(data.razorpay_refund_id)!;
  }

  static getRefundByRefundId(refundId: string): RefundRecord | null {
    const stmt = db.prepare(`SELECT * FROM refunds WHERE razorpay_refund_id = ?`);
    return (stmt.get(refundId) as RefundRecord) || null;
  }

  static getRefundsForPayment(paymentId: string): RefundRecord[] {
    const stmt = db.prepare(`SELECT * FROM refunds WHERE razorpay_payment_id = ? ORDER BY created_at DESC`);
    return stmt.all(paymentId) as RefundRecord[];
  }

  // Webhook Logs
  static logWebhook(data: {
    event_id?: string;
    event_type: string;
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    signature_valid: boolean;
    payload_json: any;
    processed?: boolean;
    error?: string;
  }) {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO webhook_logs (
        id, event_id, event_type, razorpay_payment_id, razorpay_order_id,
        signature_valid, payload_json, processed, error, created_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, datetime('now')
      )
    `);

    stmt.run(
      id,
      data.event_id || null,
      data.event_type,
      data.razorpay_payment_id || null,
      data.razorpay_order_id || null,
      data.signature_valid ? 1 : 0,
      JSON.stringify(data.payload_json),
      data.processed ? 1 : 0,
      data.error || null
    );
  }

  static isWebhookEventProcessed(eventId: string): boolean {
    if (!eventId) return false;
    const stmt = db.prepare(`SELECT id FROM webhook_logs WHERE event_id = ? AND processed = 1`);
    return !!stmt.get(eventId);
  }

  static listWebhookLogs(limit = 20): any[] {
    const stmt = db.prepare(`SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT ?`);
    return stmt.all(limit);
  }

  // Admin Dashboard Metrics
  static getDashboardMetrics() {
    const totalTransactions = (db.prepare(`SELECT COUNT(*) as count FROM transactions`).get() as any).count;
    const successfulPayments = (db.prepare(`SELECT COUNT(*) as count FROM transactions WHERE status IN ('CAPTURED', 'REFUNDED', 'REFUND_INITIATED')`).get() as any).count;
    const failedPayments = (db.prepare(`SELECT COUNT(*) as count FROM transactions WHERE status = 'FAILED'`).get() as any).count;
    const pendingPayments = (db.prepare(`SELECT COUNT(*) as count FROM transactions WHERE status IN ('PENDING', 'AUTHORIZED')`).get() as any).count;
    
    const amountCollected = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status IN ('CAPTURED', 'REFUNDED', 'REFUND_INITIATED')`).get() as any).total;
    const totalRefunds = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM refunds WHERE status = 'PROCESSED'`).get() as any).total;

    return {
      totalTransactions,
      successfulPayments,
      failedPayments,
      pendingPayments,
      totalAmountCollected: Number(amountCollected.toFixed(2)),
      totalRefunds: Number(totalRefunds.toFixed(2)),
    };
  }

  // Audit Logs
  static logAdminAction(adminUser: string, action: string, details: string, ipAddress?: string) {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO admin_audit_logs (id, admin_user, action, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(id, adminUser, action, details, ipAddress || '127.0.0.1');
  }

  static listAuditLogs(limit = 20): any[] {
    const stmt = db.prepare(`SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT ?`);
    return stmt.all(limit);
  }
}
