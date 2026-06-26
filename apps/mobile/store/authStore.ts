import { create } from "zustand";

interface User {
  id: string;
  phone: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  otpSent: boolean;
  phone: string;
  setPhone: (phone: string) => void;
  sendOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  otpSent: false,
  phone: "",

  setPhone: (phone) => set({ phone }),

  sendOtp: async (phone) => {
    // Production: const { error } = await supabase.auth.signInWithOtp({ phone });
    console.log("[mock] Sending OTP to", phone);
    await new Promise((r) => setTimeout(r, 800));
    set({ otpSent: true, phone });
    return { error: null };
  },

  verifyOtp: async (phone, token) => {
    // Production: const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    console.log("[mock] Verifying OTP", token, "for", phone);
    await new Promise((r) => setTimeout(r, 800));
    if (token.length !== 6 || !/^\d+$/.test(token)) {
      return { error: new Error("Invalid OTP. Enter the 6-digit code.") };
    }
    set({
      user: { id: "mock-courier-001", phone },
      otpSent: false,
      isLoading: false,
    });
    return { error: null };
  },

  signOut: async () => {
    // Production: await supabase.auth.signOut();
    set({ user: null, otpSent: false, phone: "" });
  },

  initialize: async () => {
    // Production: restore session from AsyncStorage via supabase.auth.getSession()
    await new Promise((r) => setTimeout(r, 300));
    set({ isLoading: false });
  },
}));
