import { useState } from 'react';
import { OrderDetails } from '../types/payment.ts';

const createOrderId = () => {
  return `FC-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
};

const createDefaultOrder = (): OrderDetails => ({
  freshcart_order_id: createOrderId(),
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
});

export function useOrderState() {
  const [order, setOrder] = useState<OrderDetails>(() => {
    const saved = sessionStorage.getItem('freshcart_current_order');

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as OrderDetails;
        if (
          parsed.freshcart_order_id &&
          !parsed.freshcart_order_id.startsWith('FC-DEMO-')
        ) {
          return parsed;
        }
      } catch {
        // Create a fresh order if stored data is invalid.
      }
    }

    const freshOrder = createDefaultOrder();
    sessionStorage.setItem('freshcart_current_order', JSON.stringify(freshOrder));
    return freshOrder;
  });

  const updateOrder = (newOrder: OrderDetails) => {
    const total = Math.max(
      0,
      newOrder.product_amount + newOrder.delivery_charge - newOrder.discount
    );

    const updated = { ...newOrder, total_payable: total };
    setOrder(updated);
    sessionStorage.setItem('freshcart_current_order', JSON.stringify(updated));
  };

  const resetOrder = () => {
    const freshOrder = createDefaultOrder();
    setOrder(freshOrder);
    sessionStorage.setItem('freshcart_current_order', JSON.stringify(freshOrder));
  };

  return { order, updateOrder, resetOrder };
}
