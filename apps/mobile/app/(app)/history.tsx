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
    <View className="bg-white mx-4 mb-3 rounded-2xl p-4 shadow-sm border border-gray-100">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="text-gray-900 font-bold text-base">{order.restaurantName}</Text>
          <Text className="text-gray-500 text-xs mt-0.5">{formatDate(order.createdAt)}</Text>
        </View>
        <View className="bg-green-100 px-2.5 py-1 rounded-full">
          <Text className="text-green-700 text-xs font-bold">Teslim Edildi</Text>
        </View>
      </View>

      <View className="flex-row items-center gap-x-1 mb-2">
        <Ionicons name="location-outline" size={13} color="#9ca3af" />
        <Text className="text-gray-500 text-xs flex-1" numberOfLines={1}>
          {order.customerName} · {order.customerAddress}
        </Text>
      </View>

      <View className="flex-row items-center border-t border-gray-50 pt-2 gap-x-4">
        <View className="flex-row items-center gap-x-1">
          <Ionicons name="navigate-outline" size={12} color="#9ca3af" />
          <Text className="text-gray-400 text-xs">{order.estimatedDistance}</Text>
        </View>
        <View className="flex-row items-center gap-x-1">
          <Ionicons name="receipt-outline" size={12} color="#9ca3af" />
          <Text className="text-gray-400 text-xs">{order.items.length} kalem</Text>
        </View>
        <View className="flex-1" />
        <Text className="text-gray-900 font-bold">₺{order.totalAmount}</Text>
      </View>
    </View>
  );
}

function SummaryBar({ orders }: { orders: Order[] }) {
  const totalEarnings = orders.reduce((sum, o) => sum + o.totalAmount * 0.1, 0);
  const totalDistance = orders.reduce((sum, o) => {
    return sum + parseFloat(o.estimatedDistance.replace(" km", ""));
  }, 0);

  return (
    <View className="mx-4 mb-4 bg-orange-500 rounded-2xl p-4 flex-row">
      <View className="flex-1 items-center">
        <Text className="text-white font-bold text-xl">{orders.length}</Text>
        <Text className="text-orange-100 text-xs mt-0.5">Teslimat</Text>
      </View>
      <View className="w-px bg-orange-400 mx-2" />
      <View className="flex-1 items-center">
        <Text className="text-white font-bold text-xl">{totalDistance.toFixed(1)} km</Text>
        <Text className="text-orange-100 text-xs mt-0.5">Toplam Mesafe</Text>
      </View>
      <View className="w-px bg-orange-400 mx-2" />
      <View className="flex-1 items-center">
        <Text className="text-white font-bold text-xl">₺{totalEarnings.toFixed(0)}</Text>
        <Text className="text-orange-100 text-xs mt-0.5">Kazanç</Text>
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
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <OfflineIndicator />

      {/* Header */}
      <View className="px-4 pt-2 pb-4">
        <Text className="text-gray-900 text-xl font-bold">Geçmiş Teslimatlar</Text>
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
              <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
                <Ionicons name="time-outline" size={40} color="#d1d5db" />
              </View>
              <Text className="text-gray-500 font-semibold text-base">Henüz teslimat yok</Text>
              <Text className="text-gray-400 text-sm mt-1">Tamamlanan siparişler burada görünür</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
