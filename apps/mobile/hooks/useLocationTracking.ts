/**
 * useLocationTracking
 *
 * Aktif sipariş varken arka plan konum takibini yönetir.
 * — Sipariş kabul edildiğinde → startTracking()
 * — Sipariş teslim edildiğinde / iptal edildiğinde → stopTracking()
 * — Uygulama > 30 dk arka planda kalırsa → stopTracking()
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { useAuthStore } from "../store/authStore";
import { useOrderStore } from "../store/orderStore";
import { COURIER_LOCATION_TASK } from "../tasks/locationTask";

const BG_TIMEOUT_MS = 30 * 60 * 1000;

export function useLocationTracking() {
  const activeOrders = useOrderStore((s) => s.activeOrders);
  const user = useAuthStore((s) => s.user);
  const bgEnteredAt = useRef<number | null>(null);
  const hasActive = activeOrders && activeOrders.length > 0;

  // Sipariş durumuna göre takibi başlat / durdur
  useEffect(() => {
    if (hasActive && user) {
      // Arka plan görevinin kullanacağı değerleri AsyncStorage'a kaydet.
      // Production'da: user.session.access_token kullan.
      AsyncStorage.multiSet([
        ["@orbis/courier_id", user.id],
        ["@orbis/auth_token", "mock-token"],
      ]);
      startTracking();
    } else {
      stopTracking();
    }
    // Cleanup: bileşen unmount olduğunda takibi durdurma —
    // arka plan görevi uygulama kapatılana kadar çalışmaya devam etmeli.
  }, [hasActive, user?.id]);

  // AppState: arka plana geçişi ve geri dönüşü izle
  useEffect(() => {
    const handleAppState = async (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        bgEnteredAt.current = Date.now();
        // Arka plan görevinin timeout kontrolü için de kaydet
        await AsyncStorage.setItem("@orbis/bg_timestamp", Date.now().toString());
      } else if (nextState === "active") {
        if (
          bgEnteredAt.current !== null &&
          Date.now() - bgEnteredAt.current > BG_TIMEOUT_MS
        ) {
          await stopTracking();
        }
        bgEnteredAt.current = null;
        await AsyncStorage.removeItem("@orbis/bg_timestamp");
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, []);
}

// ─── Yardımcı Fonksiyonlar ───────────────────────────────────────────────────

async function startTracking(): Promise<void> {
  try {
    // Zaten çalışıyorsa tekrar başlatma
    const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(
      COURIER_LOCATION_TASK,
    ).catch(() => false);
    if (alreadyRunning) return;

    // Ön plan izni
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== "granted") {
      console.warn("[location] Ön plan konum izni reddedildi.");
      return;
    }

    // Arka plan izni (iOS'ta kritik; Android'de ayrı bir dialog gösterir)
    const { status: bg } = await Location.requestBackgroundPermissionsAsync();
    if (bg !== "granted") {
      console.warn("[location] Arka plan konum izni verilmedi; yalnızca ön plan takibi aktif.");
    }

    await Location.startLocationUpdatesAsync(COURIER_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10_000,      // Android: en az 10 sn'de bir güncelle
      distanceInterval: 0,        // Hareket olmasa da güncelle
      showsBackgroundLocationIndicator: true, // iOS: üstte mavi şerit
      foregroundService: {        // Android: bildirim şeridi (zorunlu)
        notificationTitle: "Orbis Kurye",
        notificationBody: "Konum takibi aktif — teslimat devam ediyor",
        notificationColor: "#f97316",
      },
      pausesUpdatesAutomatically: false,
    });

    console.info("[location] Arka plan konum takibi başlatıldı.");
  } catch (err) {
    console.error("[location] startTracking hatası:", err);
  }
}

async function stopTracking(): Promise<void> {
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(
      COURIER_LOCATION_TASK,
    ).catch(() => false);

    if (running) {
      await Location.stopLocationUpdatesAsync(COURIER_LOCATION_TASK);
      console.info("[location] Konum takibi durduruldu.");
    }
    await AsyncStorage.multiRemove([
      "@orbis/courier_id",
      "@orbis/auth_token",
      "@orbis/bg_timestamp",
    ]);
  } catch (err) {
    console.error("[location] stopTracking hatası:", err);
  }
}
