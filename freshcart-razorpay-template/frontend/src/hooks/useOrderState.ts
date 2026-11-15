import { useState, useEffect } from 'react';
import { OrderDetails } from '../types/payment.ts';

export const DEFAULT_DEMO_ORDER: OrderDetails = {
  freshcart_order_id: 'FC-DEMO-1001',
  product_amount: 1000,
  delivery_charge: 40,
  discount: 50,
  total_payable: 990,
  currency: 'INR',
  customer: {
    name: 'Rahul Sharma',
    email: 'rahul.sharma@example.com',
    phone: '9876543210',
  },
  items: [
    { name: 'Organic Alphonso Mangoes (1kg)', qty: 1, price: 650 },
    { name: 'Fresh Farm Spinach (250g)', qty: 2, price: 70 },
    { name: 'Cold Pressed Coconut Oil (500ml)', qty: 1, price: 280 },
  ],
  delivery_address: 'Flat 402, Green Meadows Apt, Indiranagar, Bengaluru, 560038',
  delivery_slot: 'Morning 7:00 AM - 9:00 AM (Fresh Express)',
};

export function useOrderState() {
  const [order, setOrder] = useState<OrderDetails>(() => {
    const saved = sessionStorage.getItem('freshcart_current_order');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_DEMO_ORDER;
      }
    }
    return DEFAULT_DEMO_ORDER;
  });

  const updateOrder = (newOrder: OrderDetails) => {
    // Recompute total payable
    const total = Math.max(0, newOrder.product_amount + newOrder.delivery_charge - newOrder.discount);
    const updated = { ...newOrder, total_payable: total };
    setOrder(updated);
    sessionStorage.setItem('freshcart_current_order', JSON.stringify(updated));
  };

  const resetOrder = () => {
    setOrder(DEFAULT_DEMO_ORDER);
    sessionStorage.setItem('freshcart_current_order', JSON.stringify(DEFAULT_DEMO_ORDER));
  };

  return { order, updateOrder, resetOrder };
}

