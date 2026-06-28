import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OfflineIndicator } from "../../components/OfflineIndicator";
import { useOrderStore } from "../../store/orderStore";
import { Order } from "../../types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffH = Math.floor((now.getTime() - d.getTime()) / 3_600_000);
  if (diffH < 1) return "Az önce";
  if (diffH < 24) return `${diffH} saat önce`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Dün";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function HistoryCard({ order }: { order: Order }) {
  return (
    <View className="bg-dark-surface mx-4 mb-3 rounded-2xl p-4 border border-dark-border">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="text-mtext-primary font-bold text-base">{order.restaurantName}</Text>
          <Text className="text-mtext-muted text-xs mt-0.5">{formatDate(order.createdAt)}</Text>
        </View>
        <View className="bg-success/15 px-2.5 py-1 rounded-full border border-success/20">
          <Text className="text-success text-xs font-bold">Teslim Edildi</Text>
        </View>
      </View>

      <View className="flex-row items-center gap-x-1 mb-2">
        <Ionicons name="location-outline" size={13} color="#52525b" />
        <Text className="text-mtext-muted text-xs flex-1" numberOfLines={1}>
          {order.customerName} · {order.customerAddress}
        </Text>
      </View>

      <View className="flex-row items-center border-t border-dark-border pt-2 gap-x-4">
        <View className="flex-row items-center gap-x-1">
          <Ionicons name="navigate-outline" size={12} color="#52525b" />
          <Text className="text-mtext-muted text-xs">{order.estimatedDistance}</Text>
        </View>
        <View className="flex-row items-center gap-x-1">
          <Ionicons name="receipt-outline" size={12} color="#52525b" />
          <Text className="text-mtext-muted text-xs">{order.items.length} kalem</Text>
        </View>
        <View className="flex-1" />
        <Text className="text-mtext-primary font-bold">₺{order.totalAmount}</Text>
      </View>
    </View>
  );
}

function SummaryBar({ orders }: { orders: Order[] }) {
  const totalEarnings = orders.reduce((sum, o) => sum + o.totalAmount * 0.1, 0);
  const totalDistance = orders.reduce((sum, o) => {
    return sum + parseFloat(o.estimatedDistance.replace(" km", "") || "0");
  }, 0);

  return (
    <View className="mx-4 mb-4 bg-dark-surface rounded-2xl p-4 flex-row border border-dark-border"
      style={{ borderLeftWidth: 3, borderLeftColor: "#f97316" }}>
      <View className="flex-1 items-center">
        <Text className="text-accent font-bold text-xl">{orders.length}</Text>
        <Text className="text-mtext-muted text-xs mt-0.5">Teslimat</Text>
      </View>
      <View className="w-px bg-dark-border mx-2" />
      <View className="flex-1 items-center">
        <Text className="text-mtext-primary font-bold text-xl">{totalDistance.toFixed(1)} km</Text>
        <Text className="text-mtext-muted text-xs mt-0.5">Toplam Mesafe</Text>
      </View>
      <View className="w-px bg-dark-border mx-2" />
      <View className="flex-1 items-center">
        <Text className="text-success font-bold text-xl">₺{totalEarnings.toFixed(0)}</Text>
        <Text className="text-mtext-muted text-xs mt-0.5">Kazanç</Text>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { history, isLoadingHistory, fetchHistory } = useOrderStore();

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-dark-base" edges={["top"]}>
      <OfflineIndicator />

      {/* Header */}
      <View className="px-4 pt-2 pb-4">
        <Text className="text-mtext-primary text-xl font-bold">Geçmiş Teslimatlar</Text>
      </View>

      {isLoadingHistory ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={history.length > 0 ? <SummaryBar orders={history} /> : null}
          renderItem={({ item }) => <HistoryCard order={item} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingHistory}
              onRefresh={fetchHistory}
              tintColor="#f97316"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-24">
              <View className="w-20 h-20 rounded-full bg-dark-surface border border-dark-border items-center justify-center mb-4">
                <Ionicons name="time-outline" size={40} color="#2a2a2a" />
              </View>
              <Text className="text-mtext-secondary font-semibold text-base">Henüz teslimat yok</Text>
              <Text className="text-mtext-muted text-sm mt-1">Tamamlanan siparişler burada görünür</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
