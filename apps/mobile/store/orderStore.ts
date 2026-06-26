import { create } from "zustand";
import { Order, OrderStatus } from "../types";
import { MOCK_HISTORY, MOCK_ORDERS } from "../mocks/data";

interface OrderState {
  availableOrders: Order[];
  activeOrder: Order | null;
  history: Order[];
  isLoadingOrders: boolean;
  isLoadingHistory: boolean;

  fetchAvailableOrders: () => Promise<void>;
  acceptOrder: (orderId: string) => void;
  rejectOrder: (orderId: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  fetchHistory: () => Promise<void>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  availableOrders: [],
  activeOrder: null,
  history: [],
  isLoadingOrders: false,
  isLoadingHistory: false,

  fetchAvailableOrders: async () => {
    set({ isLoadingOrders: true });
    // Production: const { data } = await supabase.from('orders').select('*').eq('status', 'pending');
    await new Promise((r) => setTimeout(r, 600));
    set({ availableOrders: MOCK_ORDERS, isLoadingOrders: false });
  },

  acceptOrder: (orderId) => {
    const order = get().availableOrders.find((o) => o.id === orderId);
    if (!order) return;
    // Production: await supabase.from('orders').update({ status: 'accepted', courier_id: user.id }).eq('id', orderId);
    set((state) => ({
      activeOrder: { ...order, status: "accepted" },
      availableOrders: state.availableOrders.filter((o) => o.id !== orderId),
    }));
  },

  rejectOrder: (orderId) => {
    // Production: log rejection or re-assign via backend
    set((state) => ({
      availableOrders: state.availableOrders.filter((o) => o.id !== orderId),
    }));
  },

  updateOrderStatus: (orderId, status) => {
    const { activeOrder } = get();
    if (!activeOrder || activeOrder.id !== orderId) return;
    // Production: await supabase.from('orders').update({ status }).eq('id', orderId);
    if (status === "delivered") {
      set((state) => ({
        activeOrder: null,
        history: [{ ...activeOrder, status }, ...state.history],
      }));
    } else {
      set({ activeOrder: { ...activeOrder, status } });
    }
  },

  fetchHistory: async () => {
    set({ isLoadingHistory: true });
    // Production: const { data } = await supabase.from('orders').select('*').eq('status', 'delivered').order('created_at', { ascending: false });
    await new Promise((r) => setTimeout(r, 400));
    set({ history: MOCK_HISTORY, isLoadingHistory: false });
  },
}));
