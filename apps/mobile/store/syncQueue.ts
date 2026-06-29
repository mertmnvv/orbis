import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { supabase } from "../lib/supabase";
import type { SyncQueueItem } from "../types";

const QUEUE_STORAGE_KEY = "@orbis/sync_queue";
const MAX_RETRIES = 3;
const BACKOFF_MS = [2_000, 4_000, 8_000];

interface SyncQueueState {
  queue: SyncQueueItem[];
  isSyncing: boolean;

  hydrate: () => Promise<void>;
  enqueue: (item: Omit<SyncQueueItem, "id" | "createdAt" | "attempts">) => Promise<void>;
  flush: () => Promise<void>;
  startNetworkListener: () => void;
}

export const useSyncQueue = create<SyncQueueState>((set, get) => ({
  queue: [],
  isSyncing: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (raw) {
        const items: SyncQueueItem[] = JSON.parse(raw);
        set({ queue: items });
      }
    } catch (e) {
      console.error("[syncQueue] hydrate failed:", e);
    }
  },

  enqueue: async (item) => {
    const newItem: SyncQueueItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    const updated = [...get().queue, newItem];
    set({ queue: updated });
    await persistQueue(updated);
    // Hemen dene; online ise anında sync edilir
    await get().flush();
  },

  flush: async () => {
    if (get().isSyncing) return;
    const { queue } = get();
    const pending = queue.filter((i) => i.attempts < MAX_RETRIES);
    if (pending.length === 0) return;

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    set({ isSyncing: true });
    const updatedQueue = [...queue];

    for (const item of pending) {
      const idx = updatedQueue.findIndex((i) => i.id === item.id);
      if (idx === -1) continue;

      try {
        await processItem(item);
        updatedQueue.splice(idx, 1);
      } catch (e) {
        const attempts = item.attempts + 1;
        updatedQueue[idx] = {
          ...item,
          attempts,
          lastAttemptAt: new Date().toISOString(),
        };
        if (attempts >= MAX_RETRIES) {
          markSyncFailed(item.orderId).catch(() => {});
        } else {
          await delay(BACKOFF_MS[Math.min(attempts - 1, 2)]);
        }
      }
    }

    set({ queue: updatedQueue, isSyncing: false });
    await persistQueue(updatedQueue);
  },

  startNetworkListener: () => {
    NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        get().flush();
      }
    });
  },
}));

async function processItem(item: SyncQueueItem): Promise<void> {
  if (item.operation === "recordPayment") {
    const p = item.payload;
    const updates: Record<string, unknown> = {
      payment_status: p.collected ? "collected" : "failed",
      payment_collected_at: p.collected ? new Date().toISOString() : null,
    };
    if (p.paymentMethod) updates.payment_method = p.paymentMethod;
    if (p.notes !== undefined) updates.payment_notes = p.notes;
    if (p.posTransactionId) {
      updates.pos_transaction_id = p.posTransactionId;
      updates.collected_amount = p.collectedAmount;
      updates.pos_sync_status = "synced";
      updates.pos_synced_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", item.orderId);

    if (error) throw error;
  }
}

async function markSyncFailed(orderId: string) {
  await supabase
    .from("orders")
    .update({ pos_sync_status: "failed" })
    .eq("id", orderId);
}

async function persistQueue(queue: SyncQueueItem[]) {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("[syncQueue] persist failed:", e);
  }
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
