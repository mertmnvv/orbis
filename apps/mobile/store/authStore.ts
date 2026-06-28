import { create } from "zustand";
import { supabase } from "../lib/supabase";

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
    const fullPhone = phone.startsWith("+") ? phone : `+90${phone}`;
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    if (!error) set({ otpSent: true, phone: fullPhone });
    return { error: error as Error | null };
  },

  verifyOtp: async (phone, token) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    if (!error && data.user) {
      set({
        user: { id: data.user.id, phone: data.user.phone ?? phone },
        otpSent: false,
        isLoading: false,
      });
    }
    return { error: error as Error | null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, otpSent: false, phone: "" });
  },

  initialize: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      set({
        user: { id: session.user.id, phone: session.user.phone ?? "" },
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        set({ user: { id: session.user.id, phone: session.user.phone ?? "" } });
      } else {
        set({ user: null });
      }
    });
  },
}));
