// iyzico mPOS provider
// Kurulum: npx expo install react-native-iyzico-mpos
// app.json plugins'e ekle:
//   ["react-native-iyzico-mpos", { "iosApiKey": "...", "androidApiKey": "..." }]
// .env.local: EXPO_PUBLIC_POS_PROVIDER=iyzico
//
// NOT: Bu modül BLE native kod içerir — Expo Go'da çalışmaz.
// expo run:android veya expo run:ios gerekir.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  PosProvider,
  PosChargeRequest,
  PosChargeResult,
  PosDeviceStatus,
  PairedDevice,
} from "./types";

// SDK kurulduğunda bu satırı aktif et:
// import IyzicoMpos from 'react-native-iyzico-mpos';

const STORAGE_KEY = "@orbis/pos_device_id";

export class IyzicoProvider implements PosProvider {
  readonly name = "iyzico";

  async initialize() {
    // IyzicoMpos.initialize({
    //   environment: __DEV__ ? 'sandbox' : 'production',
    // });
    throw new Error(
      "iyzico SDK kurulu değil — npx expo install react-native-iyzico-mpos"
    );
  }

  async connectToDevice(deviceId: string) {
    // await IyzicoMpos.connectDevice(deviceId);
  }

  async disconnectDevice() {
    // await IyzicoMpos.disconnect();
  }

  async scanForDevices(_timeoutMs: number): Promise<PairedDevice[]> {
    // const devices = await IyzicoMpos.scanDevices({ timeout: _timeoutMs });
    // return devices.map(d => ({ id: d.uuid, name: d.name, rssi: d.rssi }));
    return [];
  }

  async getDeviceStatus(): Promise<PosDeviceStatus> {
    // const status = await IyzicoMpos.getStatus();
    // return { connected: status.isConnected, batteryLevel: status.batteryLevel };
    return { connected: false };
  }

  async charge(req: PosChargeRequest): Promise<PosChargeResult> {
    // const result = await IyzicoMpos.startPayment({
    //   price: req.amountTRY.toString(),
    //   paidPrice: req.amountTRY.toString(),
    //   currency: 'TRY',
    //   basketId: req.orderId,
    //   conversationId: req.orderId,
    // });
    // if (result.status === 'success') {
    //   return { success: true, transactionId: result.paymentId, chargedAmount: req.amountTRY, provider: 'iyzico' };
    // }
    return {
      success: false,
      errorCode: "NOT_IMPLEMENTED",
      message: "iyzico SDK bağlı değil.",
      retryable: false,
    };
  }

  async cancelCharge() {
    // IyzicoMpos.cancelPayment();
  }

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
