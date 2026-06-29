// SumUp mPOS provider
// Kurulum: npx expo install react-native-sumup
// .env.local: EXPO_PUBLIC_POS_PROVIDER=sumup
//             EXPO_PUBLIC_SUMUP_AFFILIATE_KEY=your_key
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
// import SumUpSDK from 'react-native-sumup';

const STORAGE_KEY = "@orbis/pos_device_id";

export class SumUpProvider implements PosProvider {
  readonly name = "sumup";

  async initialize() {
    // await SumUpSDK.wakeUp({
    //   affiliateKey: process.env.EXPO_PUBLIC_SUMUP_AFFILIATE_KEY!,
    // });
    throw new Error(
      "SumUp SDK kurulu değil — npx expo install react-native-sumup"
    );
  }

  async connectToDevice(deviceId: string) {
    // await SumUpSDK.connectReader({ cardReaderMode: 'BLE', bleDeviceId: deviceId });
  }

  async disconnectDevice() {
    // await SumUpSDK.disconnectReader();
  }

  async scanForDevices(_timeoutMs: number): Promise<PairedDevice[]> {
    // const readers = await SumUpSDK.scanReaders();
    // return readers.map(r => ({ id: r.identifier, name: r.name }));
    return [];
  }

  async getDeviceStatus(): Promise<PosDeviceStatus> {
    // const status = await SumUpSDK.getReaderStatus();
    // return { connected: status.isConnected, batteryLevel: status.batteryLevel };
    return { connected: false };
  }

  async charge(req: PosChargeRequest): Promise<PosChargeResult> {
    // const result = await SumUpSDK.checkout({
    //   totalAmount: req.amountTRY,
    //   currency: 'TRY',
    //   title: `Sipariş #${req.orderId.slice(0, 8)}`,
    // });
    // if (result.success) {
    //   return { success: true, transactionId: result.transactionCode, chargedAmount: result.totalAmount, provider: 'sumup' };
    // }
    return {
      success: false,
      errorCode: "NOT_IMPLEMENTED",
      message: "SumUp SDK bağlı değil.",
      retryable: false,
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
