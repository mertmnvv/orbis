<div align="center">
  <img src="https://media.giphy.com/media/l41lFw057lAJQMwg0/giphy.gif" alt="Delivery" width="200" />
  
  # 🚀 Orbis
  **Restaurant Courier Tracking System**
  
  [![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![Expo](https://img.shields.io/badge/Expo-Mobile-000020?style=for-the-badge&logo=expo)](https://expo.dev/)
  [![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
</div>

<br/>

## 🌟 Overview

Welcome to **Orbis**! A modern, high-performance restaurant and courier tracking system. 
This repository is structured as a **Monorepo** ensuring seamless integration between the web dashboard and mobile app. 🏎️💨

## 📁 Monorepo Layout

```text
/apps
  ├── 🌐 /web        → Next.js 14 restaurant dashboard (App Router, TS, Tailwind, shadcn/ui)
  └── 📱 /mobile     → Expo courier app (React Native, TS, NativeWind)
/packages
  └── 📦 /shared     → Shared types, utils, and constants
/supabase
  ├── 🗄️ /migrations → SQL migrations
  └── ⚡ /functions  → Edge Functions
```

## 🛠️ Tech Stack

✨ **Web:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui  
✨ **Mobile:** React Native (Expo), TypeScript, NativeWind  
✨ **Backend:** Supabase (PostgreSQL + Realtime + Auth + Edge Functions)  
✨ **Maps:** Google Maps API  
✨ **Notifications:** Firebase FCM  

## 🚀 Getting Started

To get the project up and running locally, follow these steps:

**1. Install Dependencies:**
```bash
npm install
```

**2. Setup Environment Variables:**
```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
```
*(Don't forget to fill in your API keys! 🔑)*

**3. Run the Development Servers:**
- 💻 **Web:** `npm run web` (Starts the Next.js dashboard)
- 📲 **Mobile:** `npm run mobile` (Starts the Expo courier app)

---
<div align="center">
  <i>🚧 This repo is currently <b>scaffolding only</b> — no business logic yet. 🚧</i>
  <br/>
  <img src="https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif" alt="Coding" width="200" />
</div>
