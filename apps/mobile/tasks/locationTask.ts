/**
 * COURIER_LOCATION_TASK — Arka plan konum görevi.
 *
 * Bu dosya app/_layout.tsx'e import edilmelidir (modül yan etkisi olarak).
 * TaskManager.defineTask React bağlamı dışında, modül seviyesinde çağrılır.
 * Görev, uygulama arka plandayken bile çalışır ve Supabase REST API'sine
 * doğrudan fetch ile bağlanır — Supabase JS istemcisi gerektirmez.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

export const COURIER_LOCATION_TASK = "COURIER_LOCATION_TASK";

// Env var'lar build zamanında bundle'a gömülür — arka plan context'inde erişilebilir.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const BG_TIMEOUT_MS = 30 * 60 * 1000; // 30 dakika

interface LocationTaskData {
  locations: Location.LocationObject[];
}

async function patchCourierPosition(
  courierId: string,
  lat: number,
  lng: number,
  authToken: string,
): Promise<void> {
  if (!SUPABASE_URL) {
    console.info("[location-task] Mock mode: konum gönderilmedi.");
    return;
  }

  const now = new Date().toISOString();
  const headers = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${authToken}`,
    Prefer: "return=minimal",
  };

  await Promise.all([
    // couriers tablosunda anlık konumu güncelle (Realtime tetikler)
    fetch(`${SUPABASE_URL}/rest/v1/couriers?id=eq.${courierId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ current_lat: lat, current_lng: lng, last_seen_at: now }),
    }),
    // courier_locations tablosuna geçmiş kaydı ekle
    fetch(`${SUPABASE_URL}/rest/v1/courier_locations`, {
      method: "POST",
      headers,
      body: JSON.stringify({ courier_id: courierId, lat, lng, recorded_at: now }),
    }),
  ]);
}

// ─── Görev Tanımı ────────────────────────────────────────────────────────────
// defineTask, modül yüklendiğinde hemen çalışır — hook veya component içinde çağrılmamalı.

TaskManager.defineTask(
  COURIER_LOCATION_TASK,
  async ({ data, error }: TaskManager.TaskManagerTaskBody) => {
    if (error) {
      console.error("[COURIER_LOCATION_TASK] Görev hatası:", error.message);
      return;
    }

    // 30 dakika arka plan timeout kontrolü
    const bgTs = await AsyncStorage.getItem("@orbis/bg_timestamp");
    if (bgTs) {
      const elapsed = Date.now() - parseInt(bgTs, 10);
      if (elapsed > BG_TIMEOUT_MS) {
        console.info("[COURIER_LOCATION_TASK] 30 dk aşıldı, konum takibi durduruluyor.");
        await Location.stopLocationUpdatesAsync(COURIER_LOCATION_TASK).catch(() => {});
        await AsyncStorage.multiRemove(["@orbis/courier_id", "@orbis/bg_timestamp"]);
        return;
      }
    }

    const [courierId, authToken] = await Promise.all([
      AsyncStorage.getItem("@orbis/courier_id"),
      AsyncStorage.getItem("@orbis/auth_token"),
    ]);

    if (!courierId || !authToken) {
      console.warn("[COURIER_LOCATION_TASK] courierId veya authToken bulunamadı; görev atlanıyor.");
      return;
    }

    const { locations } = data as LocationTaskData;
    const loc = locations?.[0];
    if (!loc) return;

    const { latitude, longitude } = loc.coords;
    try {
      await patchCourierPosition(courierId, latitude, longitude, authToken);
      console.info(
        `[COURIER_LOCATION_TASK] ✓ ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      );
    } catch (err) {
      console.error("[COURIER_LOCATION_TASK] Supabase gönderim hatası:", err);
    }
  },
);
