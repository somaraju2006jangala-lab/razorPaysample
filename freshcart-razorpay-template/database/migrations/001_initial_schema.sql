-- Migration 001: Initial Payment Gateway Persistence Schema
-- Supports Orders, Transactions, Refunds, and Webhook Audit Logs

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    freshcart_order_id TEXT NOT NULL UNIQUE,
    razorpay_order_id TEXT UNIQUE,
    amount REAL NOT NULL,
    amount_in_paise INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'CREATED',
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    items_json TEXT,
    notes_json TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_freshcart_id ON orders(freshcart_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_id ON orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    freshcart_order_id TEXT NOT NULL REFERENCES orders(freshcart_order_id) ON DELETE CASCADE,
    razorpay_order_id TEXT NOT NULL,
    razorpay_payment_id TEXT UNIQUE NOT NULL,
    razorpay_signature TEXT,
    amount REAL NOT NULL,
    amount_in_paise INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'PENDING',
    method TEXT,
    bank TEXT,
    wallet TEXT,
    vpa TEXT,
    card_network TEXT,
    card_type TEXT,
    error_code TEXT,
    error_description TEXT,
    signature_verified INTEGER DEFAULT 0,
    raw_payload TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tx_freshcart_order ON transactions(freshcart_order_id);
CREATE INDEX IF NOT EXISTS idx_tx_razorpay_order ON transactions(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_tx_razorpay_payment ON transactions(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at DESC);

CREATE TABLE IF NOT EXISTS refunds (
    id TEXT PRIMARY KEY,
    transaction_id TEXT REFERENCES transactions(id),
    razorpay_payment_id TEXT NOT NULL,
    razorpay_refund_id TEXT UNIQUE NOT NULL,
    amount REAL NOT NULL,
    amount_in_paise INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'PENDING',
    speed TEXT DEFAULT 'optimum',
    notes TEXT,
    receipt TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refunds(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_refund_id ON refunds(razorpay_refund_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

CREATE TABLE IF NOT EXISTS webhook_logs (
    id TEXT PRIMARY KEY,
    event_id TEXT,
    event_type TEXT NOT NULL,
    razorpay_payment_id TEXT,
    razorpay_order_id TEXT,
    signature_valid INTEGER NOT NULL,
    payload_json TEXT,
    processed INTEGER DEFAULT 0,
    error TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_webhooks_event ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_payment ON webhook_logs(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_created ON webhook_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id TEXT PRIMARY KEY,
    admin_user TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

