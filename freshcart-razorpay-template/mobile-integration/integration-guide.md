# Fresh-Cart Android & iOS Mobile Integration Guide

This guide details how to integrate the Fresh-Cart Razorpay Payment Module into the Fresh-Cart Mobile Application.

---

## 1. Native SDK vs Responsive Web View

> [!IMPORTANT]
> A responsive website inside a WebView is **not equivalent** to a native mobile Razorpay integration. 
> Native integrations offer:
> 1. Instant UPI Intent switching (opens installed Google Pay / PhonePe apps directly without browser redirects).
> 2. Auto-reading of SMS OTPs on Android.
> 3. Smooth recovery if the OS suspends background tasks during app switching.

---

## 2. Dependencies & Installation

### Bare React Native
```bash
npm install react-native-razorpay
# For iOS:
cd ios && pod install && cd ..
```

### Expo Projects (Expo Development Build)
Because `react-native-razorpay` contains native Java/Kotlin and Objective-C code, it cannot run in the default Expo Go client. You must use an **Expo Development Build**:

```bash
npx expo install react-native-razorpay
npx expo run:android
```

Add the plugin to your `app.json` (or `app.config.js`):
```json
{
  "expo": {
    "name": "Fresh-Cart",
    "slug": "fresh-cart",
    "scheme": "freshcart",
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "minSdkVersion": 21,
            "compileSdkVersion": 34,
            "targetSdkVersion": 34
          }
        }
      ]
    ]
  }
}
```

---

## 3. Android Native Configuration

### A. AndroidManifest.xml: UPI Intent Queries
Starting with Android 11 (API 30), Android restricts package visibility. To detect and launch installed UPI apps (Google Pay, PhonePe, Paytm, BHIM, CRED), add `<queries>` to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- Enable UPI Intent detection for Google Pay, PhonePe, Paytm -->
    <queries>
        <package android:name="com.google.android.apps.nbu.paisa.user" />
        <package android:name="com.phonepe.app" />
        <package android:name="net.one97.paytm" />
        <package android:name="in.org.npci.upiapp" />
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="upi" />
        </intent>
    </queries>

    <application ...>
        <!-- Razorpay Deep Link Redirect Receiver -->
        <activity
            android:name="com.razorpay.CheckoutActivity"
            android:configChanges="keyboard|keyboardHidden|orientation|screenSize"
            android:exported="true"
            android:theme="@style/CheckoutTheme">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <data
                    android:host="rzp.io"
                    android:scheme="io.rzp" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

### B. ProGuard Rules (`android/app/proguard-rules.pro`)
If release shrinking is enabled, add these rules to prevent code minification from stripping Razorpay's native reflection bridges:

```proguard
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** {*;}
-optimizations !class/loading/findclass
-keepclasseswithmembers class * {
    public <init>(android.content.Context, android.util.AttributeSet, int);
}
```

---

## 4. iOS Configuration (`ios/FreshCart/Info.plist`)

Add supported payment schemes to `LSApplicationQueriesSchemes`:
```xml
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>gpay</string>
    <string>phonepe</string>
    <string>paytmmp</string>
    <string>bhim</string>
    <string>credpay</string>
</array>
```

---

## 5. Mobile Payment Lifecycle & App-Switching

When a user selects UPI Intent on Android:
1. `RazorpayCheckout.open(options)` launches the native bottom sheet.
2. The user taps "Google Pay" or "PhonePe".
3. Fresh-Cart is placed into the Android background stack while Google Pay opens.
4. The user enters their 4 or 6-digit UPI PIN in the NPCI secure interface.
5. Google Pay completes the transfer and triggers an Android Intent back to Fresh-Cart.
6. `RazorpayCheckout` callback fires with:
   - `razorpay_payment_id`
   - `razorpay_order_id`
   - `razorpay_signature`
7. The mobile app **immediately forwards these parameters to `POST /api/payments/verify`**.
8. Fresh-Cart mobile confirms the payment **only after the backend responds with `verified: true`**.

---

## 6. Testing on Physical Android Devices

> [!CAUTION]
> UPI Intent flow **cannot be fully simulated in Android Studio Emulators** because emulators do not have real UPI apps linked to bank accounts.
> For physical testing:
> 1. Build an APK or run `npx expo run:android` on a physical device.
> 2. Ensure test mode keys (`rzp_test_...`) are active on your backend.
> 3. Use Razorpay's test UPI VPA (`success@razorpay` or card simulator) in test mode.

