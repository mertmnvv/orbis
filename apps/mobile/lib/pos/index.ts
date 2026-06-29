import type { PosProvider } from "./types";
import { MockPosProvider } from "./MockPosProvider";

// Provider seçimi: .env.local dosyasında EXPO_PUBLIC_POS_PROVIDER ayarla
//   mock   → geliştirme (varsayılan)
//   iyzico → iyzico mPOS (react-native-iyzico-mpos kurulu olmalı)
//   sumup  → SumUp Air (react-native-sumup kurulu olmalı)
const PROVIDER = (process.env.EXPO_PUBLIC_POS_PROVIDER ?? "mock") as
  | "mock"
  | "iyzico"
  | "sumup";

function createProvider(): PosProvider {
  if (PROVIDER === "mock") return new MockPosProvider();
  // Lazy require: kullanılmayan SDK'yı bundle'a dahil etmez
  if (PROVIDER === "iyzico") {
    const { IyzicoProvider } = require("./IyzicoProvider");
    return new IyzicoProvider();
  }
  if (PROVIDER === "sumup") {
    const { SumUpProvider } = require("./SumUpProvider");
    return new SumUpProvider();
  }
  throw new Error(`Bilinmeyen POS provider: ${PROVIDER}`);
}

export const posProvider: PosProvider = createProvider();

export type {
  PosProvider,
  PosChargeRequest,
  PosChargeResult,
  PosDeviceStatus,
  PairedDevice,
} from "./types";
