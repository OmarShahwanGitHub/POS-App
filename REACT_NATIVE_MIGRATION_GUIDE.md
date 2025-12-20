# React Native Migration Guide for In-App Tap-to-Pay

## Migration Overview

This guide will help you migrate your existing Next.js web app to React Native with Expo, enabling true in-app NFC tap-to-pay using Square's In-App Payments SDK.

**What Stays:** Your entire backend (Next.js API, tRPC, Prisma, PostgreSQL)
**What Changes:** Frontend only (React web → React Native mobile app)

---

## Architecture After Migration

```
┌─────────────────────────────────────────┐
│      React Native Mobile App           │
│  (iOS & Android - Expo)                 │
│  - Cashier Interface                    │
│  - Kitchen Display                      │
│  - Customer Ordering                    │
│  - Square In-App Payments SDK           │
│  - NFC Tap-to-Pay                       │
└──────────────┬──────────────────────────┘
               │
               │ HTTP/tRPC
               │
┌──────────────▼──────────────────────────┐
│   Existing Backend (NO CHANGES)         │
│  - Next.js API Routes                   │
│  - tRPC Server                          │
│  - NextAuth.js                          │
│  - Prisma ORM                           │
│  - PostgreSQL Database                  │
│  - Square SDK Server Integration        │
└─────────────────────────────────────────┘
```

---

## Phase 1: Setup New React Native Project

### Step 1.1: Create Expo Project

```bash
# Navigate to parent directory
cd "/Users/omarshahwan/Documents"

# Create new Expo project
npx create-expo-app@latest brigado-mobile --template blank-typescript

cd brigado-mobile
```

### Step 1.2: Install Core Dependencies

```bash
# Navigation
npx expo install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context

# State Management & API
npm install @tanstack/react-query @trpc/client @trpc/react-query superjson

# Authentication
npm install expo-secure-store expo-auth-session

# UI Components
npm install react-native-paper
npm install react-native-vector-icons

# Square In-App Payments SDK
npx expo install react-native-square-in-app-payments
```

### Step 1.3: Configure app.json

Update `app.json`:

```json
{
  "expo": {
    "name": "Brigado Burger POS",
    "slug": "brigado-pos",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.brigado.pos",
      "infoPlist": {
        "NFCReaderUsageDescription": "We need NFC access to process contactless payments"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.brigado.pos",
      "permissions": [
        "android.permission.NFC"
      ]
    },
    "plugins": [
      "react-native-square-in-app-payments"
    ]
  }
}
```

---

## Phase 2: Setup API Connection to Existing Backend

### Step 2.1: Create tRPC Client

Create `lib/trpc.ts`:

```typescript
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../../../Brigado App/src/server/routers/_app';
// Adjust path based on your structure

export const trpc = createTRPCReact<AppRouter>();

// Get your backend URL
// Development: http://localhost:3000 or your computer's local IP
// Production: Your deployed Next.js URL
const API_URL = __DEV__
  ? 'http://192.168.1.100:3000' // Replace with YOUR computer's IP
  : 'https://your-production-url.vercel.app';

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${API_URL}/api/trpc`,
      transformer: superjson,
      headers: async () => {
        // Add auth token if available
        const token = await getAuthToken(); // You'll implement this
        return {
          authorization: token ? `Bearer ${token}` : '',
        };
      },
    }),
  ],
});
```

### Step 2.2: Setup React Query Provider

Update `App.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient } from './lib/trpc';
import { useState } from 'react';

export default function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {/* Your app navigation here */}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

---

## Phase 3: Square In-App Payments SDK Integration

### Step 3.1: Initialize Square SDK

Create `lib/square.ts`:

```typescript
import {
  SQIPCore,
  SQIPCardEntry,
  SQIPApplePay,
  SQIPGooglePay,
} from 'react-native-square-in-app-payments';

// Your Square Application ID from dashboard
const SQUARE_APP_ID = __DEV__
  ? 'sandbox-sq0idb-YOUR_SANDBOX_APP_ID'
  : 'sq0idp-YOUR_PRODUCTION_APP_ID';

export const initializeSquare = async () => {
  try {
    await SQIPCore.setSquareApplicationId(SQUARE_APP_ID);
    console.log('Square SDK initialized');
  } catch (error) {
    console.error('Failed to initialize Square SDK:', error);
    throw error;
  }
};

export const startCardEntry = async () => {
  try {
    const cardDetails = await SQIPCardEntry.startCardEntryFlow();
    // Returns card nonce (token) to send to your backend
    return cardDetails.nonce;
  } catch (error) {
    console.error('Card entry cancelled or failed:', error);
    throw error;
  }
};

export const canUseApplePay = async () => {
  return await SQIPApplePay.canUseApplePay();
};

export const canUseGooglePay = async () => {
  return await SQIPGooglePay.canUseGooglePay();
};
```

### Step 3.2: Create Payment Screen Component

Create `screens/PaymentScreen.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { initializeSquare, startCardEntry } from '../lib/square';
import { trpc } from '../lib/trpc';

export default function PaymentScreen({ route, navigation }) {
  const { orderId, amount } = route.params;
  const [isProcessing, setIsProcessing] = useState(false);

  const processPayment = trpc.order.processSquarePayment.useMutation();

  useEffect(() => {
    initializeSquare();
  }, []);

  const handleCardPayment = async () => {
    setIsProcessing(true);
    try {
      // Step 1: Get card nonce from Square SDK (this shows tap-to-pay UI)
      const cardNonce = await startCardEntry();

      // Step 2: Send nonce to your backend
      await processPayment.mutateAsync({
        orderId,
        sourceId: cardNonce,
      });

      Alert.alert('Success', 'Payment processed successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.amount}>Total: ${amount.toFixed(2)}</Text>
      <Button
        title={isProcessing ? 'Processing...' : 'Pay with Card/Tap'}
        onPress={handleCardPayment}
        disabled={isProcessing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
```

---

## Phase 4: Migrate Key Screens

### Step 4.1: Cashier Screen (Simplified Example)

Create `screens/CashierScreen.tsx`:

```typescript
import React, { useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet } from 'react-native';
import { trpc } from '../lib/trpc';

export default function CashierScreen({ navigation }) {
  const [cart, setCart] = useState([]);

  // Fetch menu items (same tRPC endpoint!)
  const { data: menuItems } = trpc.menu.getAll.useQuery();
  const createOrder = trpc.order.create.useMutation();

  const addToCart = (item) => {
    setCart([...cart, { ...item, quantity: 1 }]);
  };

  const handleCheckout = async () => {
    try {
      // Create order in database
      const order = await createOrder.mutateAsync({
        items: cart.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity,
        })),
        paymentMethod: 'SQUARE',
        orderType: 'IN_STORE',
      });

      // Navigate to payment screen
      navigation.navigate('Payment', {
        orderId: order.id,
        amount: order.total,
      });
    } catch (error) {
      console.error('Failed to create order:', error);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.menuItem}>
            <Text>{item.name} - ${item.price}</Text>
            <Button title="Add" onPress={() => addToCart(item)} />
          </View>
        )}
      />

      {cart.length > 0 && (
        <Button title="Checkout" onPress={handleCheckout} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
  },
});
```

---

## Phase 5: Configure Square Dashboard

### Step 5.1: Get Application ID

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your application (or create new one)
3. Navigate to **Credentials** tab
4. Copy **Application ID** (sandbox and production)
5. Add to your React Native app's environment config

### Step 5.2: Enable In-App Payments

1. In Square Dashboard, go to **In-App Payments SDK**
2. Enable iOS and Android
3. Add your bundle identifiers:
   - iOS: `com.brigado.pos`
   - Android: `com.brigado.pos`

---

## Phase 6: Development Workflow

### Step 6.1: Run Backend

```bash
# Terminal 1: Start your existing Next.js backend
cd "/Users/omarshahwan/Documents/Brigado App"
npm run dev
# Should be running on http://localhost:3000
```

### Step 6.2: Run Mobile App

```bash
# Terminal 2: Start Expo
cd "/Users/omarshahwan/Documents/brigado-mobile"
npx expo start
```

### Step 6.3: Test on Physical Device

**IMPORTANT:** NFC tap-to-pay requires a physical iOS/Android device. Simulators won't work.

```bash
# Scan QR code with Expo Go app on your phone
# OR build development client:
npx expo run:ios
npx expo run:android
```

---

## Phase 7: Testing Tap-to-Pay

### Test Mode Setup

1. **Square Sandbox:** Use test card numbers
2. **Physical Device:** Must have NFC capability
3. **Test Cards:** Square provides test cards for sandbox

### How It Works

```
User taps "Pay with Card"
  → startCardEntry() opens Square's native UI
  → User can:
     - Tap NFC card/phone
     - Insert chip card
     - Swipe card
     - Manually enter card
  → Square SDK returns nonce (token)
  → Send nonce to your backend
  → Backend processes with Square API
  → Payment complete!
```

---

## Key Differences from Web Version

| Feature | Web (Current) | React Native (New) |
|---------|---------------|-------------------|
| Framework | Next.js | Expo + React Native |
| Payment UI | Square Web SDK (manual entry only) | Square In-App SDK (NFC tap-to-pay) |
| Backend | Same (Next.js API) | Same (Next.js API) |
| Database | Same (PostgreSQL) | Same (PostgreSQL) |
| API Layer | Same (tRPC) | Same (tRPC) |
| Tap-to-Pay | ❌ Not supported | ✅ Full support |

---

## Migration Checklist

- [ ] Create new Expo project
- [ ] Install dependencies
- [ ] Setup tRPC client pointing to existing backend
- [ ] Initialize Square In-App Payments SDK
- [ ] Migrate Cashier screen
- [ ] Migrate Kitchen screen
- [ ] Migrate Customer ordering screen
- [ ] Implement payment flow
- [ ] Test on physical iOS device
- [ ] Test on physical Android device
- [ ] Configure Square dashboard
- [ ] Test sandbox payments
- [ ] Deploy backend (if not already)
- [ ] Build production app (EAS Build)
- [ ] Submit to App Store
- [ ] Submit to Google Play

---

## Cost Breakdown

| Item | Cost |
|------|------|
| React Native/Expo | Free |
| Square In-App SDK | Free |
| Square Processing Fees | 2.6% + $0.10 per transaction |
| Apple Developer Account | $99/year (for App Store) |
| Google Play Developer | $25 one-time |
| Backend Hosting | Existing (no change) |

**Total to get started:** $0 (just development)
**Total to publish:** $124 first year, $99/year after

---

## Next Steps

1. **Create Expo project** (15 minutes)
2. **Setup tRPC connection** to existing backend (30 minutes)
3. **Initialize Square SDK** (20 minutes)
4. **Build basic cashier screen** (2-3 hours)
5. **Implement payment flow** (1-2 hours)
6. **Test on device** (30 minutes)

**Estimated total time:** 1-2 days for basic working version
**Estimated time for full migration:** 1-2 weeks

---

## Resources

- [Square In-App Payments SDK Docs](https://developer.squareup.com/docs/in-app-payments-sdk/overview)
- [React Native Square SDK](https://github.com/square/in-app-payments-react-native-plugin)
- [Expo Documentation](https://docs.expo.dev/)
- [tRPC with React Native](https://trpc.io/docs/client/react)

---

## Support & Next Actions

Want me to:
1. Generate the actual code files for you?
2. Set up the Expo project structure?
3. Create detailed screen-by-screen migration code?
4. Help configure Square dashboard step-by-step?

Let me know which part you'd like to tackle first!
