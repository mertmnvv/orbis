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
  isAvailable: boolean;
  isActive: boolean;
  restaurantId: string | null;
  setPhone: (phone: string) => void;
  sendOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  toggleAvailability: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  otpSent: false,
  phone: "",
  isAvailable: true,
  isActive: true,
  restaurantId: null,

  setPhone: (phone) => set({ phone }),

  sendOtp: async (phone) => {
    // Geliştirme bypass: SMS göndermeden direkt OTP ekranına geç
    if (__DEV__) {
      const fullPhone = phone.startsWith("+") ? phone : `+90${phone}`;
      set({ otpSent: true, phone: fullPhone });
      return { error: null };
    }

    const fullPhone = phone.startsWith("+") ? phone : `+90${phone}`;
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    if (!error) set({ otpSent: true, phone: fullPhone });
    return { error: error as Error | null };
  },

  verifyOtp: async (phone, token) => {
    // Geliştirme bypass: "000000" kodu → tek bir sabit test hesabıyla giriş
    if (__DEV__ && token === "000000") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "devtest@orbiscourier.com",
        password: "OrbisTest2024!",
      });
      if (!error && data.user) {
        const { data: courier } = await supabase
          .from('couriers')
          .select('is_available, is_active, restaurant_id')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (!courier) {
          await supabase.auth.signOut();
          return {
            error: new Error(
              "Dev kurye satırı bulunamadı. Supabase'de couriers tablosunda\n" +
              "user_id = devtest kullanıcısı olan bir satır olmalı."
            ),
          };
        }

        set({
          user: { id: data.user.id, phone },
          isAvailable: courier.is_available ?? true,
          isActive: courier.is_active ?? true,
          restaurantId: courier.restaurant_id ?? null,
          otpSent: false,
          isLoading: false,
        });
        return { error: null };
      }
      return {
        error: new Error(
          "Dev kullanıcısı bulunamadı. Supabase → Authentication → Users'dan\n" +
          "Email: devtest@orbiscourier.com  Password: OrbisTest2024! ekle."
        ),
      };
    }

    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    if (!error && data.user) {
      const userPhone = data.user.phone ?? phone;

      // Link user_id to pre-registered courier row if not already linked
      // (handles couriers who had an auth account before being pre-registered)
      const { error: rpcError } = await supabase.rpc('link_courier_user_id', { p_phone: userPhone });
      if (rpcError) console.warn('[verifyOtp] link_courier_user_id failed:', rpcError.message);

      const { data: courier } = await supabase
        .from('couriers')
        .select('is_available, is_active, restaurant_id')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (!courier) {
        await supabase.auth.signOut();
        return {
          error: new Error(
            'Bu numara sisteme kayıtlı değil.\nRestoran yöneticinizden sizi eklemesini isteyin.'
          ),
        };
      }

      set({
        user: { id: data.user.id, phone: userPhone },
        isAvailable: courier.is_available ?? true,
        isActive: courier.is_active ?? true,
        restaurantId: courier.restaurant_id ?? null,
        otpSent: false,
        isLoading: false,
      });
    }
    return { error: error as Error | null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, otpSent: false, phone: "", isAvailable: true, isActive: true, restaurantId: null });
  },

  toggleAvailability: async () => {
    const currentVal = get().isAvailable;
    const newVal = !currentVal;
    set({ isAvailable: newVal });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('couriers')
      .update({ is_available: newVal })
      .eq('user_id', user.id);
  },

  initialize: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    let channel: any = null;
    let channelUserId: string | null = null;

    const setupRealtime = (userId: string) => {
      // Guard: skip if already subscribed for this user to prevent
      // "cannot add callbacks after subscribe()" when onAuthStateChange
      // fires immediately after initialize with the same session.
      if (channelUserId === userId) return;
      channelUserId = userId;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      // Unique channel name (Date.now) avoids Supabase client-side cache reuse.
      channel = supabase
        .channel(`courier-${userId}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'couriers',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const updated = payload.new as any;
            if (updated) {
              set({
                isActive: updated.is_active ?? true,
                isAvailable: updated.is_available ?? true,
                restaurantId: updated.restaurant_id ?? null,
              });
            }
          }
        )
        .subscribe();
    };

    if (session?.user) {
      const { data: courier } = await supabase
        .from('couriers')
        .select('is_available, is_active, restaurant_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!courier) {
        await supabase.auth.signOut();
        set({ isLoading: false });
        return;
      }

      set({
        user: { id: session.user.id, phone: session.user.phone ?? "" },
        isAvailable: courier.is_available ?? true,
        isActive: courier.is_active ?? true,
        restaurantId: courier.restaurant_id ?? null,
        isLoading: false,
      });

      setupRealtime(session.user.id);
    } else {
      set({ isLoading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: courier } = await supabase
          .from('couriers')
          .select('is_available, is_active, restaurant_id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!courier) {
          await supabase.auth.signOut();
          return;
        }

        set({
          user: { id: session.user.id, phone: session.user.phone ?? "" },
          isAvailable: courier.is_available ?? true,
          isActive: courier.is_active ?? true,
          restaurantId: courier.restaurant_id ?? null,
        });

        setupRealtime(session.user.id);
      } else {
        channelUserId = null;
        if (channel) {
          supabase.removeChannel(channel);
          channel = null;
        }
        set({ user: null, isAvailable: true, isActive: true, restaurantId: null });
      }
    });
  },
}));
