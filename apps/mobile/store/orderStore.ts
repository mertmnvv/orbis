import * as Location from "expo-location";
import { create } from "zustand";
import NetInfo from "@react-native-community/netinfo";
import { Order, OrderItem, OrderStatus, PaymentStatus, PosSyncStatus, DeliveryZone, PaymentMethod } from "../types";
import { supabase } from "../lib/supabase";
import { useSyncQueue } from "./syncQueue";
import { point } from "@turf/helpers";
import distance from "@turf/distance";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { useAuthStore } from "./authStore";

async function fetchRouteFromCurrentLocation(
  currentLng: number,
  currentLat: number,
  destLng: number,
  destLat: number
): Promise<{ distance: string; duration: string } | null> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!baseUrl) return null;
  try {
    const params = new URLSearchParams({
      originLng: String(currentLng),
      originLat: String(currentLat),
      destLng: String(destLng),
      destLat: String(destLat),
    });
    const res = await fetch(`${baseUrl}/api/directions?${params}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.distance || !json.duration) return null;
    return { distance: json.distance, duration: json.duration };
  } catch {
    return null;
  }
}

interface OrderState {
  availableOrders: Order[];
  activeOrders: Order[];
  history: Order[];
  isLoadingOrders: boolean;
  isLoadingHistory: boolean;
  _courierId: string | null;
  _isFetching: boolean;

  initializeCourier: () => Promise<void>;
  fetchAvailableOrders: () => Promise<void>;
  acceptOrder: (orderId: string) => Promise<void>;
  acceptOrders: (orderIds: string[]) => Promise<boolean>;
  rejectOrder: (orderId: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  recordPayment: (orderId: string, collected: boolean, paymentMethod?: PaymentMethod, notes?: string, posTransactionId?: string, collectedAmount?: number) => Promise<void>;
  updateCourierStatusNote: (orderId: string, note: string | null) => Promise<void>;
  fetchHistory: () => Promise<void>;
}

const RESTAURANTS_SELECT = "name, address, lat, lng, max_multi_order_km, max_multi_order_count, avg_prep_time_minutes";

function mapRow(row: Record<string, any>): Order {
  const r = row.restaurants as Record<string, any> | null;
  return {
    id: row.id,
    restaurantName: r?.name ?? "",
    restaurantAddress: r?.address ?? "",
    restaurantLat: Number(r?.lat) || 0,
    restaurantLng: Number(r?.lng) || 0,
    restaurantAvgPrepTime: r?.avg_prep_time_minutes ? Number(r.avg_prep_time_minutes) : undefined,
    customerName: row.customer_name,
    customerAddress: row.customer_address,
    customerLat: Number(row.customer_lat) || 0,
    customerLng: Number(row.customer_lng) || 0,
    customerPhone: row.customer_phone ?? "",
    items: (row.items as OrderItem[]) ?? [],
    totalAmount: Number(row.total_amount),
    status: row.status as OrderStatus,
    createdAt: row.created_at,
    estimatedDistance: "",
    estimatedTime: "",
    preparationTimeMinutes: row.preparation_time_minutes ?? undefined,
    estimatedReadyAt: row.estimated_ready_at ?? undefined,
    notes: row.notes ?? undefined,
    restaurantMaxMultiOrderKm: r?.max_multi_order_km ? Number(r.max_multi_order_km) : 3.0,
    restaurantMaxMultiOrderCount: r?.max_multi_order_count ? Number(r.max_multi_order_count) : 3,
    paymentMethod: row.payment_method ?? "cash",
    paymentStatus: row.payment_status ?? "pending",
    paymentCollectedAt: row.payment_collected_at ?? null,
    paymentNotes: row.payment_notes ?? null,
    courierStatusNote: row.courier_status_note ?? null,
    posTransactionId: row.pos_transaction_id ?? null,
    collectedAmount: row.collected_amount ? Number(row.collected_amount) : null,
    posSyncStatus: (row.pos_sync_status ?? "not_applicable") as PosSyncStatus,
    posSyncedAt: row.pos_synced_at ?? null,
  };
}

async function getCourierId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("couriers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.id ?? null;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  availableOrders: [],
  activeOrders: [],
  history: [],
  isLoadingOrders: false,
  isLoadingHistory: false,
  _courierId: null,
  _isFetching: false,

  initializeCourier: async () => {
    const userId = useAuthStore.getState().user?.id;
    let cid: string | null = null;
    if (userId) {
      // Use in-memory user ID to skip the auth.getUser() roundtrip.
      const { data } = await supabase
        .from("couriers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      cid = data?.id ?? null;
    } else {
      cid = await getCourierId();
    }
    if (cid) {
      set({ _courierId: cid });
      const { data } = await supabase
        .from("orders")
        .select(`*, restaurants(${RESTAURANTS_SELECT})`)
        .in("status", ["assigned", "picked_up"])
        .eq("courier_id", cid)
        .order("assigned_at", { ascending: true });
      if (data) {
        set({ activeOrders: data.map(mapRow) });
      }
    }
  },

  fetchAvailableOrders: async () => {
    if (get()._isFetching) return;
    const { isAvailable } = useAuthStore.getState();
    if (!isAvailable) {
      set({ availableOrders: [], isLoadingOrders: false });
      return;
    }

    set({ isLoadingOrders: true, _isFetching: true });

    // Fetch delivery zones
    const { data: zonesData } = await supabase.from("delivery_zones").select("*").eq("is_active", true);
    const zones = (zonesData || []) as DeliveryZone[];

    const { data, error } = await supabase
      .from("orders")
      .select(`*, restaurants(${RESTAURANTS_SELECT})`)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[fetchAvailableOrders] error:", JSON.stringify(error));
      set({ isLoadingOrders: false, _isFetching: false });
      return;
    }

    let orders = (data ?? []).map(mapRow);
    const { activeOrders } = get();

    if (activeOrders.length > 0) {
      const activeZones = new Set<string>();
      for (const ao of activeOrders) {
        const pt = point([ao.customerLng, ao.customerLat]);
        for (const z of zones) {
          if (booleanPointInPolygon(pt, z.polygon)) {
            activeZones.add(z.id);
          }
        }
      }

      orders = orders.filter((o) => {
        let inSameZone = activeZones.size === 0;
        const pt = point([o.customerLng, o.customerLat]);
        for (const z of zones) {
          if (activeZones.has(z.id) && booleanPointInPolygon(pt, z.polygon)) {
            inSameZone = true;
            break;
          }
        }
        if (!inSameZone) return false;

        const maxKm = o.restaurantMaxMultiOrderKm ?? 3.0;
        let withinDistance = false;
        const newRestPt = point([o.restaurantLng, o.restaurantLat]);
        const newCustPt = point([o.customerLng, o.customerLat]);

        for (const ao of activeOrders) {
          const aoRestPt = point([ao.restaurantLng, ao.restaurantLat]);
          const aoCustPt = point([ao.customerLng, ao.customerLat]);
          if (
            distance(newRestPt, aoRestPt) <= maxKm ||
            distance(newRestPt, aoCustPt) <= maxKm ||
            distance(newCustPt, aoRestPt) <= maxKm ||
            distance(newCustPt, aoCustPt) <= maxKm
          ) {
            withinDistance = true;
            break;
          }
        }
        return withinDistance;
      });
    }

    set({ availableOrders: orders, isLoadingOrders: false, _isFetching: false });
  },

  acceptOrder: async (orderId) => {
    let courierId = get()._courierId;
    if (!courierId) {
      courierId = await getCourierId();
      if (!courierId) return;
      set({ _courierId: courierId });
    }

    const { error } = await supabase
      .from("orders")
      .update({
        status: "assigned",
        courier_id: courierId,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("[acceptOrder] DB error:", error.message);
      return;
    }

    await get().initializeCourier();
    await get().fetchAvailableOrders();
  },

  acceptOrders: async (orderIds) => {
    let courierId = get()._courierId;
    if (!courierId) {
      courierId = await getCourierId();
      if (!courierId) return false;
      set({ _courierId: courierId });
    }

    const { error } = await supabase
      .from("orders")
      .update({
        status: "assigned",
        courier_id: courierId,
        assigned_at: new Date().toISOString(),
      })
      .in("id", orderIds);

    if (error) {
      console.error("[acceptOrders] DB error:", JSON.stringify(error));
      return false;
    }

    await get().initializeCourier();
    await get().fetchAvailableOrders();

    return true;
  },

  rejectOrder: (orderId) => {
    set((state) => ({
      availableOrders: state.availableOrders.filter((o) => o.id !== orderId),
    }));
  },

  updateOrderStatus: async (orderId, status) => {
    const { activeOrders } = get();
    const activeOrder = activeOrders.find(o => o.id === orderId);
    if (!activeOrder) return;

    const updatedOrder = { ...activeOrder, status };

    if (status === "delivered") {
      // Optimistic: remove from active, add to history
      set((state) => ({
        activeOrders: state.activeOrders.filter(o => o.id !== orderId),
        history: [updatedOrder, ...state.history],
      }));
      // Await DB write — history correctness depends on this succeeding.
      const { error } = await supabase.from("orders").update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
      }).eq("id", orderId);
      if (error) {
        console.error("[updateOrderStatus] delivered DB error:", error.message);
        // Revert optimistic update so user can retry
        set((state) => ({
          activeOrders: [{ ...activeOrder, status: "picked_up" as OrderStatus }, ...state.activeOrders],
          history: state.history.filter(o => o.id !== orderId),
        }));
      }
      return;
    }

    // "picked_up": optimistic update + background location/route (non-critical)
    set((state) => ({
      activeOrders: state.activeOrders.map(o => o.id === orderId ? updatedOrder : o),
    }));

    const backgroundTask = async () => {
      const updates: Record<string, string | number> = { status, picked_up_at: new Date().toISOString() };
      try {
        const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
        if (permStatus === "granted") {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const { latitude, longitude } = pos.coords;
          updates.picked_up_lat = latitude;
          updates.picked_up_lng = longitude;
          const route = await fetchRouteFromCurrentLocation(
            longitude, latitude, activeOrder.customerLng, activeOrder.customerLat
          );
          if (route) {
            set((state) => ({
              activeOrders: state.activeOrders.map(o =>
                o.id === orderId
                  ? { ...updatedOrder, estimatedDistance: route.distance, estimatedTime: route.duration, pickedUpLat: latitude, pickedUpLng: longitude }
                  : o
              ),
            }));
          }
        }
      } catch {}
      const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
      if (error) {
        console.error("[updateOrderStatus] picked_up DB error:", error.message);
        set((state) => ({
          activeOrders: state.activeOrders.map(o =>
            o.id === orderId ? { ...o, status: activeOrder.status } : o
          ),
        }));
      }
    };

    backgroundTask().catch((e) => console.error("[updateOrderStatus] backgroundTask threw:", e));
  },

  recordPayment: async (orderId, collected, paymentMethod, notes, posTransactionId, collectedAmount) => {
    const status: PaymentStatus = collected ? "collected" : "failed";
    const posSyncStatus: PosSyncStatus = posTransactionId ? "pending" : "not_applicable";

    // Optimistik güncelleme — her zaman, ağ durumundan bağımsız
    set((state) => ({
      activeOrders: state.activeOrders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              paymentStatus: status,
              paymentNotes: notes ?? null,
              posTransactionId: posTransactionId ?? null,
              collectedAmount: collectedAmount ?? null,
              posSyncStatus,
              ...(paymentMethod ? { paymentMethod } : {}),
            }
          : o
      ),
    }));

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      // Offline: kuyruğa al
      await useSyncQueue.getState().enqueue({
        orderId,
        operation: "recordPayment",
        payload: { collected, paymentMethod, notes, posTransactionId, collectedAmount },
      });
      return;
    }

    // Online: direkt Supabase'e yaz
    const updates: Record<string, unknown> = {
      payment_status: status,
      payment_collected_at: collected ? new Date().toISOString() : null,
    };
    if (paymentMethod) updates.payment_method = paymentMethod;
    if (notes !== undefined) updates.payment_notes = notes;
    if (posTransactionId) {
      updates.pos_transaction_id = posTransactionId;
      updates.collected_amount = collectedAmount;
      updates.pos_sync_status = "synced";
      updates.pos_synced_at = new Date().toISOString();
    }

    const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
    if (error) {
      console.error("[recordPayment] DB error:", error.message);
      // Fallback: kuyruğa al
      await useSyncQueue.getState().enqueue({
        orderId,
        operation: "recordPayment",
        payload: { collected, paymentMethod, notes, posTransactionId, collectedAmount },
      });
    } else if (posTransactionId) {
      // Supabase'e yazıldı, Zustand'ı güncelle
      set((state) => ({
        activeOrders: state.activeOrders.map((o) =>
          o.id === orderId ? { ...o, posSyncStatus: "synced" as PosSyncStatus } : o
        ),
      }));
    }
  },

  updateCourierStatusNote: async (orderId, note) => {
    // Optimistic update
    set((state) => ({
      activeOrders: state.activeOrders.map((o) =>
        o.id === orderId ? { ...o, courierStatusNote: note } : o
      ),
    }));

    const { error } = await supabase
      .from("orders")
      .update({ courier_status_note: note })
      .eq("id", orderId);

    if (error) {
      console.error("[updateCourierStatusNote] DB error:", error.message);
    }
  },

  fetchHistory: async () => {
    set({ isLoadingHistory: true });
    let courierId = get()._courierId;
    if (!courierId) {
      // Use in-memory user ID from authStore to skip the auth.getUser() roundtrip.
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        const { data } = await supabase
          .from("couriers")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        courierId = data?.id ?? null;
        if (courierId) set({ _courierId: courierId });
      }
    }
    if (!courierId) {
      console.warn("[fetchHistory] courierId is null — courier row may not be linked to auth user");
      set({ isLoadingHistory: false });
      return;
    }
    const { data, error } = await supabase
      .from("orders")
      .select(`*, restaurants(${RESTAURANTS_SELECT})`)
      .eq("status", "delivered")
      .eq("courier_id", courierId)
      .order("delivered_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("[fetchHistory] DB error:", error.message);
      set({ isLoadingHistory: false });
      return;
    }
    set({ history: (data ?? []).map(mapRow), isLoadingHistory: false });
  },
}));
