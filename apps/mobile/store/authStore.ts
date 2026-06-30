import { create } from "zustand";
import { supabase } from "../lib/supabase";

interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAvailable: boolean;
  isActive: boolean;
  restaurantId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  changePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  toggleAvailability: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAvailable: true,
  isActive: true,
  restaurantId: null,

  signIn: async (email, password) => {
    set({ isLoading: true });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      set({ isLoading: false });
      return { error };
    }

    if (data.user) {
      // link user_id by email if not already linked (fallback/signup trigger backup)
      await supabase.rpc("link_courier_user_id_by_email", { p_email: data.user.email });

      const { data: courier, error: courierErr } = await supabase
        .from("couriers")
        .select("name, phone, email, is_available, is_active, restaurant_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (courierErr || !courier) {
        await supabase.auth.signOut();
        set({ isLoading: false });
        return {
          error: new Error("Hesabınız sisteme bağlı bir kurye olarak tanımlı değil."),
        };
      }

      set({
        user: {
          id: data.user.id,
          email: data.user.email ?? "",
          phone: courier.phone ?? "",
          name: courier.name ?? "",
        },
        isAvailable: courier.is_available ?? true,
        isActive: courier.is_active ?? true,
        restaurantId: courier.restaurant_id ?? null,
        isLoading: false,
      });
    }

    return { error: null };
  },

  changePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error as Error | null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, isAvailable: true, isActive: true, restaurantId: null });
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
      if (channelUserId === userId) return;
      channelUserId = userId;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
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
        .select('name, phone, email, is_available, is_active, restaurant_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!courier) {
        await supabase.auth.signOut();
        set({ isLoading: false });
        return;
      }

      set({
        user: {
          id: session.user.id,
          email: session.user.email ?? "",
          phone: courier.phone ?? "",
          name: courier.name ?? "",
        },
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
          .select('name, phone, email, is_available, is_active, restaurant_id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!courier) {
          await supabase.auth.signOut();
          return;
        }

        set({
          user: {
            id: session.user.id,
            email: session.user.email ?? "",
            phone: courier.phone ?? "",
            name: courier.name ?? "",
          },
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
