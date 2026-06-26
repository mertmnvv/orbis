# Orbis Projesi Bağımlılıkları (Dependencies)

Orbis projesi bir monorepo (npm workspaces) yapısındadır. Ana klasörde, uygulamalarda (apps) ve paylaşılan paketlerde (packages) bulunan tüm bağımlılıklar aşağıda listelenmiştir.

## Kök Dizin (Root)
Dosya: `package.json`

**DevDependencies:**
- `@babel/core`: ^8.0.1

**Overrides:**
- `@types/react`: ^18.3.0
- `@types/react-dom`: ^18.3.0
- `react`: 18.2.0
- `react-dom`: 18.2.0

---

## Mobil Uygulama (`@orbis/mobile`)
Dosya: `apps/mobile/package.json` (Expo React Native Projesi)

**Dependencies:**
- `@orbis/shared`: * (Yerel paket)
- `@react-native-async-storage/async-storage`: 1.23.1
- `@react-native-community/netinfo`: 11.3.1
- `@supabase/supabase-js`: ^2.45.0
- `expo`: ~51.0.0
- `expo-constants`: ~16.0.0
- `expo-linking`: ~6.3.0
- `expo-location`: ~17.0.0
- `expo-task-manager`: ~11.8.0
- `expo-notifications`: ~0.28.0
- `expo-router`: ~3.5.0
- `expo-status-bar`: ~1.12.1
- `nativewind`: ^2.0.11
- `react`: 18.2.0
- `react-native`: 0.74.5
- `react-native-maps`: 1.14.0
- `react-native-safe-area-context`: 4.10.5
- `react-native-screens`: 3.31.1
- `react-native-url-polyfill`: ^2.0.0
- `zustand`: ^4.5.0

**DevDependencies:**
- `@babel/core`: ^7.24.0
- `@types/react`: ~18.2.45
- `tailwindcss`: 3.3.2
- `typescript`: ^5.4.0

---

## Web Uygulaması (`@orbis/web`)
Dosya: `apps/web/package.json` (Next.js Projesi)

**Dependencies:**
- `@orbis/shared`: * (Yerel paket)
- `@supabase/supabase-js`: ^2.45.0
- `@supabase/ssr`: ^0.5.0
- `@tanstack/react-query`: ^5.56.0
- `@tanstack/react-query-devtools`: ^5.56.0
- `class-variance-authority`: ^0.7.0
- `clsx`: ^2.1.1
- `lucide-react`: ^0.439.0
- `@react-google-maps/api`: ^2.19.3
- `next`: 14.2.5
- `react`: 18.2.0
- `react-dom`: 18.2.0
- `sonner`: ^1.5.0
- `tailwind-merge`: ^2.5.2
- `tailwindcss-animate`: ^1.0.7

**DevDependencies:**
- `@types/node`: ^20.14.0
- `@types/react`: ^18.3.0
- `@types/react-dom`: ^18.3.0
- `autoprefixer`: ^10.4.19
- `eslint`: ^8.57.0
- `eslint-config-next`: 14.2.5
- `postcss`: ^8.4.40
- `tailwindcss`: ^3.4.7
- `typescript`: ^5.4.0

---

## Paylaşılan Paket (`@orbis/shared`)
Dosya: `packages/shared/package.json` (Ortak TypeScript Kodları)

**DevDependencies:**
- `typescript`: ^5.4.0
