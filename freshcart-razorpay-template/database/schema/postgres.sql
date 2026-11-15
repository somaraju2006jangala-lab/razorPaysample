-- Fresh-Cart Razorpay Payment Gateway Database Schema (PostgreSQL)
-- Reusable payment persistence architecture for Fresh-Cart e-commerce ecosystem

-- Orders Table: Stores the checkout session and mapping between Fresh-Cart and Razorpay orders
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    freshcart_order_id VARCHAR(100) NOT NULL UNIQUE,
    razorpay_order_id VARCHAR(100) UNIQUE,
    amount NUMERIC(12, 2) NOT NULL,
    amount_in_paise BIGINT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'CREATED',
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    items_json JSONB,
    notes_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_freshcart_id ON orders(freshcart_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_id ON orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Transactions Table: Detailed record of payment attempts, verified payments and callbacks
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(64) PRIMARY KEY,
    freshcart_order_id VARCHAR(100) NOT NULL REFERENCES orders(freshcart_order_id) ON DELETE CASCADE,
    razorpay_order_id VARCHAR(100) NOT NULL,
    razorpay_payment_id VARCHAR(100) UNIQUE NOT NULL,
    razorpay_signature TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    amount_in_paise BIGINT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    method VARCHAR(50), -- 'upi', 'card', 'netbanking', 'wallet'
    bank VARCHAR(100),
    wallet VARCHAR(100),
    vpa VARCHAR(255),
    card_network VARCHAR(50), -- 'visa', 'mastercard', 'rupay', etc.
    card_type VARCHAR(50), -- 'credit', 'debit'
    error_code VARCHAR(100),
    error_description TEXT,
    signature_verified BOOLEAN DEFAULT FALSE,
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tx_freshcart_order ON transactions(freshcart_order_id);
CREATE INDEX IF NOT EXISTS idx_tx_razorpay_order ON transactions(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_tx_razorpay_payment ON transactions(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at DESC);

-- Refunds Table: Tracking initiated and completed refunds
CREATE TABLE IF NOT EXISTS refunds (
    id VARCHAR(64) PRIMARY KEY,
    transaction_id VARCHAR(64) REFERENCES transactions(id),
    razorpay_payment_id VARCHAR(100) NOT NULL,
    razorpay_refund_id VARCHAR(100) UNIQUE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    amount_in_paise BIGINT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSED, FAILED
    speed VARCHAR(50) DEFAULT 'optimum', -- optimum, instant, normal
    notes TEXT,
    receipt VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refunds(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_refund_id ON refunds(razorpay_refund_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

-- Webhook Logs Table: Independent audit trail for all incoming Razorpay webhooks
CREATE TABLE IF NOT EXISTS webhook_logs (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(100),
    event_type VARCHAR(100) NOT NULL,
    razorpay_payment_id VARCHAR(100),
    razorpay_order_id VARCHAR(100),
    signature_valid BOOLEAN NOT NULL,
    payload_json JSONB,
    processed BOOLEAN DEFAULT FALSE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhooks_event ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_payment ON webhook_logs(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_created ON webhook_logs(created_at DESC);

-- Admin Audit Logs Table: Administrative actions (e.g. refunds initiated)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    admin_user VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

