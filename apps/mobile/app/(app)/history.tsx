import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OfflineIndicator } from "../../components/OfflineIndicator";
import { useOrderStore } from "../../store/orderStore";
import { Order } from "../../types";

function getDateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const orderDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (orderDay.getTime() === today.getTime()) return "Bugün";
  if (orderDay.getTime() === yesterday.getTime()) return "Dün";
  return d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function HistoryCard({ order }: { order: Order }) {
  return (
    <View
      className="mx-4 mb-3 bg-dark-surface rounded-2xl overflow-hidden border border-dark-border"
      style={{ borderLeftWidth: 3, borderLeftColor: "#f97316" }}
    >
      <View className="p-4">
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 mr-2">
            <Text className="text-mtext-primary font-bold text-base" numberOfLines={1}>
              {order.restaurantName}
            </Text>
            <Text className="text-mtext-muted text-xs mt-0.5">{formatTime(order.createdAt)}</Text>
          </View>
          <View className="bg-success/10 px-2.5 py-1 rounded-full border border-success/20 flex-row items-center gap-x-1">
            <Ionicons name="checkmark-circle" size={11} color="#22c55e" />
            <Text className="text-success text-xs font-semibold">Teslim Edildi</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-x-2 bg-dark-base/50 rounded-xl px-3 py-2.5 mb-3">
          <Ionicons name="person-circle-outline" size={18} color="#a1a1aa" />
          <View className="flex-1">
            <Text className="text-mtext-secondary font-semibold text-xs">{order.customerName}</Text>
            <Text className="text-mtext-muted text-xs mt-0.5" numberOfLines={1}>
              {order.customerAddress}
            </Text>
          </View>
        </View>

        {/* Payment info row */}
        <View className="flex-row items-center justify-between bg-dark-base/40 rounded-xl px-3 py-2 mb-3 border border-dark-border/40">
          <View className="flex-row items-center gap-x-1.5">
            <Ionicons
              name={order.paymentMethod === "online_paid" ? "shield-checkmark-outline" : "cash-outline"}
              size={13}
              color="#a1a1aa"
            />
            <Text className="text-mtext-secondary text-xs font-medium">
              {order.paymentMethod === "cash" ? "Kapıda Nakit" : order.paymentMethod === "card" ? "Kapıda Kart" : "Online Ödeme"}
            </Text>
          </View>
          
          {order.paymentStatus === "collected" && (
            <View className="bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
              <Text className="text-success text-[10px] font-bold">TAHSİL EDİLDİ</Text>
            </View>
          )}
          {order.paymentStatus === "failed" && (
            <View className="bg-danger/10 px-2 py-0.5 rounded-full border border-danger/20">
              <Text className="text-danger text-[10px] font-bold">BAŞARISIZ</Text>
            </View>
          )}
          {order.paymentStatus === "pending" && (
            <View className="bg-warning/10 px-2 py-0.5 rounded-full border border-warning/20">
              <Text className="text-warning text-[10px] font-bold">BEKLİYOR</Text>
            </View>
          )}
          {order.paymentStatus === "not_required" && (
            <View className="bg-dark-elevated px-2 py-0.5 rounded-full border border-dark-border">
              <Text className="text-mtext-secondary text-[10px] font-bold">GEREKMİYOR</Text>
            </View>
          )}
        </View>

        {/* Payment Notes if present */}
        {order.paymentNotes ? (
          <View className="bg-danger/5 border border-danger/10 rounded-xl px-3 py-2 mb-3">
            <Text className="text-danger text-[11px] font-semibold">Tahsilat Notu:</Text>
            <Text className="text-mtext-secondary text-xs mt-0.5 italic">"{order.paymentNotes}"</Text>
          </View>
        ) : null}

        <View className="flex-row items-center gap-x-3">
          <View className="flex-row items-center gap-x-1">
            <Ionicons name="navigate-circle-outline" size={14} color="#f97316" />
            <Text className="text-mtext-muted text-xs">{order.estimatedDistance}</Text>
          </View>
          <View className="flex-row items-center gap-x-1">
            <Ionicons name="fast-food-outline" size={14} color="#71717a" />
            <Text className="text-mtext-muted text-xs">{order.items.length} kalem</Text>
          </View>
          <View className="flex-1" />
          <Text className="text-mtext-primary font-bold text-sm">₺{order.totalAmount}</Text>
        </View>
      </View>
    </View>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View className="flex-row items-center px-4 mb-2 mt-1">
      <Text className="text-accent font-bold text-xs uppercase tracking-wider">{title}</Text>
      <View className="bg-dark-surface border border-dark-border px-1.5 py-0.5 rounded-full ml-2">
        <Text className="text-mtext-muted text-xs font-semibold">{count}</Text>
      </View>
      <View className="flex-1 h-px bg-dark-border ml-2" />
    </View>
  );
}

function StatsRow({ orders }: { orders: Order[] }) {
  const totalDistance = orders.reduce((sum, o) => {
    return sum + parseFloat(o.estimatedDistance.replace(" km", "") || "0");
  }, 0);

  return (
    <View className="mx-4 mb-5 flex-row gap-x-3">
      <View className="flex-1 bg-dark-surface border border-dark-border rounded-2xl p-4 items-center">
        <Text className="text-accent font-bold text-2xl">{orders.length}</Text>
        <Text className="text-mtext-muted text-xs mt-1">Teslimat</Text>
      </View>
      <View className="flex-1 bg-dark-surface border border-dark-border rounded-2xl p-4 items-center">
        <Text className="text-mtext-primary font-bold text-2xl">{totalDistance.toFixed(1)}</Text>
        <Text className="text-mtext-muted text-xs mt-1">km yol</Text>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { history, isLoadingHistory, fetchHistory } = useOrderStore();

  useEffect(() => {
    if (history.length === 0) fetchHistory();
  }, []);

  const sections = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const order of history) {
      const label = getDateLabel(order.createdAt);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(order);
    }
    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
  }, [history]);

  return (
    <SafeAreaView className="flex-1 bg-dark-base" edges={["top"]}>
      <OfflineIndicator />

      {isLoadingHistory ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              <View className="px-4 pt-2 pb-5">
                <Text className="text-mtext-primary text-2xl font-bold">Geçmiş</Text>
                <Text className="text-mtext-muted text-sm mt-0.5">Tamamlanan teslimatlarınız</Text>
              </View>
              {history.length > 0 && <StatsRow orders={history} />}
            </>
          }
          renderSectionHeader={({ section: { title, data } }) => (
            <SectionHeader title={title} count={data.length} />
          )}
          renderItem={({ item }) => <HistoryCard order={item} />}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingHistory}
              onRefresh={fetchHistory}
              tintColor="#f97316"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-32">
              <View className="w-20 h-20 rounded-full bg-dark-surface border border-dark-border items-center justify-center mb-4">
                <Ionicons name="time-outline" size={36} color="#3f3f46" />
              </View>
              <Text className="text-mtext-secondary font-semibold text-base">Henüz teslimat yok</Text>
              <Text className="text-mtext-muted text-sm mt-1 text-center px-8">
                Tamamlanan siparişler burada görünecek
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
