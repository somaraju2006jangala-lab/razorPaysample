import { db } from './db.js';
import { PaymentPersistenceService } from '../services/paymentPersistenceService.js';
export function seedDemoData() {
    const existingCount = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
    if (existingCount > 0) {
        console.log('ℹ️ Database already has data. Skipping demo seed.');
        return;
    }
    console.log('🌱 Seeding realistic Fresh-Cart demo orders and payment transactions...');
    // 1. Initial Sample Demo Order (FC-DEMO-1001)
    PaymentPersistenceService.createOrder({
        freshcart_order_id: 'FC-DEMO-1001',
        amount: 990,
        currency: 'INR',
        customer_name: 'Rahul Sharma',
        customer_email: 'rahul.sharma@example.com',
        customer_phone: '9876543210',
        items: [
            { name: 'Organic Alphonso Mangoes (1kg)', qty: 1, price: 650 },
            { name: 'Fresh Farm Spinach (250g)', qty: 2, price: 70 },
            { name: 'Cold Pressed Coconut Oil (500ml)', qty: 1, price: 280 },
        ],
        notes: {
            delivery_slot: 'Morning 7 AM - 9 AM',
            delivery_address: 'Flat 402, Green Meadows Apt, Indiranagar, Bengaluru',
            product_amount: 1000,
            delivery_charge: 40,
            discount: 50,
            total_payable: 990,
        },
    });
    // 2. A Captured UPI Payment for FC-DEMO-1002
    PaymentPersistenceService.createOrder({
        freshcart_order_id: 'FC-DEMO-1002',
        razorpay_order_id: 'order_DEMO1002xyz',
        amount: 1450,
        currency: 'INR',
        customer_name: 'Priya Patel',
        customer_email: 'priya.patel@example.com',
        customer_phone: '9823456781',
        items: [
            { name: 'A2 Cow Milk 1L', qty: 2, price: 160 },
            { name: 'Organic Brown Rice 5kg', qty: 1, price: 550 },
            { name: 'Himalayan Pink Salt', qty: 1, price: 140 },
            { name: 'Exotic Kiwi Pack', qty: 2, price: 400 },
            { name: 'Fresh Basil leaves', qty: 1, price: 40 },
        ],
    });
    PaymentPersistenceService.recordTransaction({
        freshcart_order_id: 'FC-DEMO-1002',
        razorpay_order_id: 'order_DEMO1002xyz',
        razorpay_payment_id: 'pay_DEMOUPI98231',
        razorpay_signature: 'sig_verified_demo_upi_002',
        amount: 1450,
        currency: 'INR',
        status: 'CAPTURED',
        method: 'upi',
        vpa: 'priya@okhdfcbank',
        signature_verified: true,
    });
    // 3. A Card Payment with Partial/Full Refund for FC-DEMO-1003
    PaymentPersistenceService.createOrder({
        freshcart_order_id: 'FC-DEMO-1003',
        razorpay_order_id: 'order_DEMO1003abc',
        amount: 2200,
        currency: 'INR',
        customer_name: 'Amitabh Sen',
        customer_email: 'amitabh.sen@example.com',
        customer_phone: '9123456789',
        items: [
            { name: 'Artisan Sourdough Loaf', qty: 2, price: 360 },
            { name: 'Gourmet Cheese Platter', qty: 1, price: 1200 },
            { name: 'Extra Virgin Olive Oil 1L', qty: 1, price: 640 },
        ],
    });
    const tx3 = PaymentPersistenceService.recordTransaction({
        freshcart_order_id: 'FC-DEMO-1003',
        razorpay_order_id: 'order_DEMO1003abc',
        razorpay_payment_id: 'pay_DEMOCARD1003',
        razorpay_signature: 'sig_verified_demo_card_003',
        amount: 2200,
        currency: 'INR',
        status: 'REFUNDED',
        method: 'card',
        card_network: 'visa',
        card_type: 'credit',
        signature_verified: true,
    });
    PaymentPersistenceService.recordRefund({
        transaction_id: tx3.id,
        razorpay_payment_id: 'pay_DEMOCARD1003',
        razorpay_refund_id: 'rfnd_DEMO1003ref',
        amount: 2200,
        currency: 'INR',
        status: 'PROCESSED',
        speed: 'optimum',
        notes: 'Order cancelled by customer before dispatch',
    });
    // 4. A Failed Payment for FC-DEMO-1004
    PaymentPersistenceService.createOrder({
        freshcart_order_id: 'FC-DEMO-1004',
        razorpay_order_id: 'order_DEMO1004fail',
        amount: 620,
        currency: 'INR',
        customer_name: 'Ananya Roy',
        customer_email: 'ananya.roy@example.com',
        customer_phone: '9845123456',
        items: [
            { name: 'Organic Almond Milk', qty: 2, price: 420 },
            { name: 'Chia Seeds 250g', qty: 1, price: 200 },
        ],
    });
    PaymentPersistenceService.recordTransaction({
        freshcart_order_id: 'FC-DEMO-1004',
        razorpay_order_id: 'order_DEMO1004fail',
        razorpay_payment_id: 'pay_DEMOFAIL1004',
        amount: 620,
        currency: 'INR',
        status: 'FAILED',
        method: 'card',
        card_network: 'mastercard',
        card_type: 'debit',
        error_code: 'BAD_REQUEST_INSUFFICIENT_FUNDS',
        error_description: 'Payment failed due to insufficient balance in account.',
        signature_verified: false,
    });
    // 5. A Netbanking Payment for FC-DEMO-1005
    PaymentPersistenceService.createOrder({
        freshcart_order_id: 'FC-DEMO-1005',
        razorpay_order_id: 'order_DEMO1005nb',
        amount: 1890,
        currency: 'INR',
        customer_name: 'Karthik Nair',
        customer_email: 'karthik.nair@example.com',
        customer_phone: '9988776655',
        items: [
            { name: 'Pure Forest Honey 500g', qty: 2, price: 780 },
            { name: 'Handpicked Dry Fruits Mix 1kg', qty: 1, price: 1110 },
        ],
    });
    PaymentPersistenceService.recordTransaction({
        freshcart_order_id: 'FC-DEMO-1005',
        razorpay_order_id: 'order_DEMO1005nb',
        razorpay_payment_id: 'pay_DEMONB1005',
        razorpay_signature: 'sig_verified_demo_nb_005',
        amount: 1890,
        currency: 'INR',
        status: 'CAPTURED',
        method: 'netbanking',
        bank: 'HDFC',
        signature_verified: true,
    });
    console.log('✅ Demo data seeded successfully.');
}
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
    seedDemoData();
}
