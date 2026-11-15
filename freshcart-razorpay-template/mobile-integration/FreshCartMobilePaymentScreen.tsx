/**
 * FreshCartMobilePaymentScreen.tsx
 * Drop-in Reference Component for React Native / Expo Mobile App.
 * Uses official `react-native-razorpay` with Fresh-Cart branding.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
// @ts-ignore - In mobile app: import RazorpayCheckout from 'react-native-razorpay';
import RazorpayCheckout from 'react-native-razorpay';
import { FreshCartRazorpayAdapter } from './FreshCartRazorpayAdapter';

interface Props {
  backendUrl: string;
  order: {
    orderId: string;
    amount: number;
    customer: {
      name: string;
      email: string;
      phone: string;
    };
  };
  onSuccess: (verifiedResult: any) => void;
  onFailure: (reason: string) => void;
}

export const FreshCartMobilePaymentScreen: React.FC<Props> = ({
  backendUrl,
  order,
  onSuccess,
  onFailure,
}) => {
  const [loading, setLoading] = useState(false);
  const adapter = new FreshCartRazorpayAdapter(backendUrl);

  const startPayment = async () => {
    try {
      setLoading(true);

      // 1. Create order on Fresh-Cart payment backend
      const rzpOrder = await adapter.createPaymentOrder({
        freshcart_order_id: order.orderId,
        total_payable: order.amount,
        customer: order.customer,
      });

      // 2. Configure native Razorpay checkout options
      const options = {
        description: `Fresh-Cart Groceries - Order ${order.orderId}`,
        image: 'https://freshcart.example.com/logo.png',
        currency: rzpOrder.currency,
        key: rzpOrder.key_id,
        amount: rzpOrder.amount_in_paise,
        name: 'Fresh-Cart',
        order_id: rzpOrder.razorpay_order_id,
        prefill: {
          email: order.customer.email,
          contact: order.customer.phone,
          name: order.customer.name,
        },
        theme: { color: '#00D084' },
      };

      // 3. Open Native Razorpay Checkout (UPI Intent, Card, NetBanking)
      RazorpayCheckout.open(options)
        .then(async (data: any) => {
          // 4. Send native parameters to backend for HMAC SHA-256 verification
          try {
            const verifiedResult = await adapter.verifyPayment({
              freshcart_order_id: order.orderId,
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              razorpay_signature: data.razorpay_signature,
            });

            setLoading(false);
            onSuccess(verifiedResult);
          } catch (verifyError: any) {
            setLoading(false);
            Alert.alert('Verification Failed', verifyError.message);
            onFailure(verifyError.message);
          }
        })
        .catch((error: any) => {
          setLoading(false);
          const reason = error.description || 'Payment dismissed or declined';
          adapter.reportFailure({
            freshcart_order_id: order.orderId,
            razorpay_order_id: rzpOrder.razorpay_order_id,
            error_code: error.code?.toString(),
            error_description: reason,
          });
          onFailure(reason);
        });
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Payment Error', err.message);
      onFailure(err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brand}>Fresh-Cart Payments</Text>
        <Text style={styles.orderText}>Order: {order.orderId}</Text>
        <Text style={styles.amount}>₹{order.amount.toFixed(2)}</Text>
        <Text style={styles.subtext}>Secure UPI, Card, Net Banking via Razorpay</Text>

        <TouchableOpacity
          style={styles.payButton}
          onPress={startPayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <Text style={styles.payButtonText}>Pay Securely with Razorpay</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  brand: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  orderText: { fontSize: 13, color: '#64748B', marginBottom: 16, fontFamily: 'monospace' },
  amount: { fontSize: 32, fontWeight: '900', color: '#0F172A', marginBottom: 6 },
  subtext: { fontSize: 12, color: '#64748B', marginBottom: 24 },
  payButton: { backgroundColor: '#00D084', paddingVertical: 16, borderRadius: 18, alignItems: 'center', shadowColor: '#00D084', shadowOpacity: 0.3, shadowRadius: 8, elevation: 2 },
  payButtonText: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
});

