export interface PosChargeRequest {
  amountTRY: number;
  orderId: string;
  description?: string;
}

export type PosChargeResult =
  | {
      success: true;
      transactionId: string;
      chargedAmount: number;
      provider: string;
    }
  | {
      success: false;
      errorCode: string;
      message: string;
      retryable: boolean;
    };

export interface PosDeviceStatus {
  connected: boolean;
  batteryLevel?: number;
  deviceName?: string;
  signalStrength?: "strong" | "medium" | "weak";
}

export interface PairedDevice {
  id: string;
  name: string;
  rssi?: number;
}

export interface PosProvider {
  readonly name: string;

  initialize(): Promise<void>;
  connectToDevice(deviceId: string): Promise<void>;
  disconnectDevice(): Promise<void>;
  scanForDevices(timeoutMs: number): Promise<PairedDevice[]>;
  getDeviceStatus(): Promise<PosDeviceStatus>;

  charge(request: PosChargeRequest): Promise<PosChargeResult>;
  cancelCharge(): Promise<void>;

  getSavedDeviceId(): Promise<string | null>;
  saveDeviceId(deviceId: string): Promise<void>;
  clearSavedDevice(): Promise<void>;
}
