import { create } from "zustand";
import { posProvider } from "../lib/pos";
import type { PosDeviceStatus, PairedDevice } from "../lib/pos";

export type PosConnectionState =
  | "idle"
  | "scanning"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type PosChargeState = "idle" | "charging" | "success" | "failed" | "cancelled";

const MAX_CONNECT_RETRIES = 3;
const CONNECT_TIMEOUT_MS = 10_000;
const RETRY_DELAYS_MS = [2_000, 4_000, 8_000];

interface PosState {
  connectionState: PosConnectionState;
  chargeState: PosChargeState;
  deviceStatus: PosDeviceStatus | null;
  availableDevices: PairedDevice[];
  lastError: string | null;
  lastTransactionId: string | null;
  connectRetryCount: number;

  initializePos: () => Promise<void>;
  connectToSavedDevice: () => Promise<boolean>;
  scanAndConnect: () => Promise<PairedDevice[]>;
  pairDevice: (deviceId: string) => Promise<boolean>;
  forgetDevice: () => Promise<void>;
  chargeCard: (
    amountTRY: number,
    orderId: string
  ) => Promise<{
    success: boolean;
    transactionId?: string;
    chargedAmount?: number;
    error?: string;
  }>;
  cancelCharge: () => Promise<void>;
  refreshDeviceStatus: () => Promise<void>;
}

export const usePosStore = create<PosState>((set, get) => ({
  connectionState: "idle",
  chargeState: "idle",
  deviceStatus: null,
  availableDevices: [],
  lastError: null,
  lastTransactionId: null,
  connectRetryCount: 0,

  initializePos: async () => {
    try {
      await posProvider.initialize();
      await get().connectToSavedDevice();
    } catch (e) {
      console.error("[posStore] initialize failed:", e);
      set({ connectionState: "error", lastError: "POS cihazı başlatılamadı." });
    }
  },

  connectToSavedDevice: async () => {
    const savedId = await posProvider.getSavedDeviceId();
    if (!savedId) {
      set({ connectionState: "idle" });
      return false;
    }

    set({ connectionState: "connecting", lastError: null, connectRetryCount: 0 });

    for (let attempt = 0; attempt < MAX_CONNECT_RETRIES; attempt++) {
      set({ connectRetryCount: attempt + 1 });
      try {
        await Promise.race([
          posProvider.connectToDevice(savedId),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("TIMEOUT")), CONNECT_TIMEOUT_MS)
          ),
        ]);

        const status = await posProvider.getDeviceStatus();
        if (status.connected) {
          set({ connectionState: "connected", deviceStatus: status, connectRetryCount: 0 });
          return true;
        }
      } catch {
        if (attempt < MAX_CONNECT_RETRIES - 1) {
          await delay(RETRY_DELAYS_MS[attempt]);
        }
      }
    }

    set({
      connectionState: "disconnected",
      connectRetryCount: 0,
      lastError: "POS cihazına bağlanılamadı. Cihazın açık ve yakında olduğundan emin olun.",
    });
    return false;
  },

  scanAndConnect: async () => {
    set({ connectionState: "scanning", availableDevices: [], lastError: null });
    try {
      const devices = await posProvider.scanForDevices(CONNECT_TIMEOUT_MS);
      set({
        availableDevices: devices,
        connectionState: devices.length > 0 ? "idle" : "disconnected",
      });
      if (devices.length === 0) {
        set({ lastError: "Yakında POS cihazı bulunamadı. Bluetooth açık mı?" });
      }
      return devices;
    } catch {
      set({ connectionState: "error", lastError: "Tarama başarısız. Bluetooth izinlerini kontrol edin." });
      return [];
    }
  },

  pairDevice: async (deviceId: string) => {
    set({ connectionState: "connecting", lastError: null });
    try {
      await posProvider.connectToDevice(deviceId);
      const status = await posProvider.getDeviceStatus();
      if (status.connected) {
        await posProvider.saveDeviceId(deviceId);
        set({ connectionState: "connected", deviceStatus: status });
        return true;
      }
    } catch {}
    set({ connectionState: "error", lastError: "Cihaz eşleştirilemedi." });
    return false;
  },

  forgetDevice: async () => {
    await posProvider.clearSavedDevice();
    await posProvider.disconnectDevice();
    set({ connectionState: "idle", deviceStatus: null });
  },

  chargeCard: async (amountTRY: number, orderId: string) => {
    if (get().connectionState !== "connected") {
      return { success: false, error: "POS cihazı bağlı değil." };
    }

    set({ chargeState: "charging", lastError: null, lastTransactionId: null });

    const result = await posProvider.charge({ amountTRY, orderId });

    if (result.success) {
      set({ chargeState: "success", lastTransactionId: result.transactionId });
      return {
        success: true,
        transactionId: result.transactionId,
        chargedAmount: result.chargedAmount,
      };
    } else {
      set({ chargeState: "failed", lastError: result.message });
      return { success: false, error: result.message };
    }
  },

  cancelCharge: async () => {
    await posProvider.cancelCharge();
    set({ chargeState: "cancelled" });
  },

  refreshDeviceStatus: async () => {
    try {
      const status = await posProvider.getDeviceStatus();
      set({
        deviceStatus: status,
        connectionState: status.connected ? "connected" : "disconnected",
      });
    } catch {}
  },
}));

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
