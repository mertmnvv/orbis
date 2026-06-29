import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  PosProvider,
  PosChargeRequest,
  PosChargeResult,
  PosDeviceStatus,
  PairedDevice,
} from "./types";

const MOCK_DEVICE_ID = "MOCK-POS-001";
const STORAGE_KEY = "@orbis/pos_device_id";

export class MockPosProvider implements PosProvider {
  readonly name = "mock";
  private connected = false;

  async initialize() {}

  async connectToDevice(deviceId: string) {
    await delay(800);
    this.connected = deviceId === MOCK_DEVICE_ID;
    if (!this.connected) throw new Error("Device not found");
  }

  async disconnectDevice() {
    this.connected = false;
  }

  async scanForDevices(timeoutMs: number): Promise<PairedDevice[]> {
    await delay(Math.min(timeoutMs, 1500));
    return [{ id: MOCK_DEVICE_ID, name: "Orbis Test POS", rssi: -55 }];
  }

  async getDeviceStatus(): Promise<PosDeviceStatus> {
    return {
      connected: this.connected,
      batteryLevel: 87,
      deviceName: "Orbis Test POS",
      signalStrength: "strong",
    };
  }

  async charge(req: PosChargeRequest): Promise<PosChargeResult> {
    await delay(2000);
    // Tutarı .99 kuruşla bitenler kart reddini simüle eder (test için)
    if (Math.round(req.amountTRY * 100) % 100 === 99) {
      return {
        success: false,
        errorCode: "CARD_DECLINED",
        message: "Kart reddedildi. Farklı kart deneyin.",
        retryable: true,
      };
    }
    return {
      success: true,
      transactionId: `MOCK-${Date.now()}`,
      chargedAmount: req.amountTRY,
      provider: "mock",
    };
  }

  async cancelCharge() {}

  async getSavedDeviceId() {
    return AsyncStorage.getItem(STORAGE_KEY);
  }

  async saveDeviceId(id: string) {
    return AsyncStorage.setItem(STORAGE_KEY, id);
  }

  async clearSavedDevice() {
    return AsyncStorage.removeItem(STORAGE_KEY);
  }
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
