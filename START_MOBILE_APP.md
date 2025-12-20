# 🚀 Start Mobile App - 3 Commands

## Quick Start

Open **2 terminal windows** and run these commands:

### Terminal 1 - Backend
```bash
cd "/Users/omarshahwan/Documents/Brigado App"
npm run dev
```

### Terminal 2 - Mobile App
```bash
cd "/Users/omarshahwan/Documents/Brigado App/mobile"
npx expo start
```

---

## Then Choose Your Option:

### Option A: Quick Preview (Expo Go)
- Download "Expo Go" app on your phone
- Scan QR code from Terminal 2
- **Note:** NFC won't work, but you can see the UI

### Option B: Full Tap-to-Pay (iOS)
In Terminal 2, press `i` or run:
```bash
npx expo run:ios
```
**Requires:** Mac with Xcode
**Result:** Full NFC tap-to-pay on iPhone!

### Option C: Full Tap-to-Pay (Android)
In Terminal 2, press `a` or run:
```bash
npx expo run:android
```
**Requires:** Android Studio
**Result:** Full NFC tap-to-pay on Android!

---

## Test Payment

Use this test card in sandbox mode:
- **Card:** 4111 1111 1111 1111
- **CVV:** 111
- **Expiry:** 12/25
- **ZIP:** 12345

---

## 📚 More Help

- **Detailed guide:** See `mobile/PHONE_DEPLOYMENT_GUIDE.md`
- **Setup checklist:** See `mobile/SETUP_CHECKLIST.md`
- **Full docs:** See `mobile/README.md`

---

**That's it! Your tap-to-pay app is ready to test!** 🎉
