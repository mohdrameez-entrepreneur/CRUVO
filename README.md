# CRUVO

**Group Motorcycle Touring & Real-Time Fleet Telemetry Platform**

CRUVO is a real-time group riding platform designed for motorcycle crews and touring enthusiasts. It provides sub-second GPS radar, multi-rider route navigation, instant safety & pitstop flagging, and hardware-grade battery optimization.

---

## 🛠️ Project Architecture

- **Mobile App (`mobile/`)**: Built with React Native & Expo. Features custom glassmorphic UI, live map tracking (`FreeMap`), hardware token security (`expo-secure-store`), and custom action modals.
- **Web Portal (`cruvo-web/`)**: Zero-backend static landing & direct APK download portal. Features scannable QR code installation, dark glassmorphism design, and zero-latency downloads.
- **Backend API (`backend/` & `pages/`)**: Powered by Django, Django REST Framework, Daphne, Channels (WebSockets), and Redis for real-time location mesh broadcasting.

---

## 🚀 Mobile App Setup & Running

```bash
cd mobile
npm install
npx expo start
```

---

## 🌐 Deploying the Web Download Portal

The web landing portal in `cruvo-web/` is 100% static:
1. On GitHub (`mohdrameez-entrepreneur/CRUVO`), go to **Settings → Pages**.
2. Select branch `main` and folder `/cruvo-web`.
3. Save to publish instantly!