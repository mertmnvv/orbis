import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OfflineIndicator } from "../../components/OfflineIndicator";
import { OrderCard } from "../../components/OrderCard";
import { useAuthStore } from "../../store/authStore";
import { useOrderStore } from "../../store/orderStore";

export default function HomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { availableOrders, isLoadingOrders, activeOrder, fetchAvailableOrders, acceptOrder, rejectOrder } =
    useOrderStore();

  useEffect(() => {
    fetchAvailableOrders();
  }, []);

  const handleAccept = (orderId: string) => {
    acceptOrder(orderId);
    router.navigate("/(app)/active");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <OfflineIndicator />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
        <View>
          <Text className="text-gray-400 text-xs font-medium">Hoş geldin</Text>
          <Text className="text-gray-900 text-xl font-bold">{user?.phone ?? "Kurye"}</Text>
        </View>
        <Pressable
          onPress={signOut}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
        >
          <Ionicons name="log-out-outline" size={20} color="#6b7280" />
        </Pressable>
      </View>

      {/* Active order banner */}
      {activeOrder && (
        <Pressable
          onPress={() => router.navigate("/(app)/active")}
          className="mx-4 mb-3 bg-orange-500 rounded-2xl px-4 py-3 flex-row items-center gap-x-3 active:bg-orange-600"
        >
          <View className="w-8 h-8 rounded-full bg-orange-400 items-center justify-center">
            <Ionicons name="bicycle" size={16} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-sm">Aktif Sipariş Var</Text>
            <Text className="text-orange-100 text-xs">{activeOrder.restaurantName} → {activeOrder.customerName}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
        </Pressable>
      )}

      {/* Section title */}
      <View className="flex-row items-center justify-between px-4 mb-2">
        <Text className="text-gray-700 font-bold text-base">
          Bekleyen Siparişler
        </Text>
        {availableOrders.length > 0 && (
          <View className="bg-orange-100 px-2.5 py-0.5 rounded-full">
            <Text className="text-orange-600 font-bold text-xs">{availableOrders.length}</Text>
          </View>
        )}
      </View>

      {/* Order list */}
      {isLoadingOrders ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f97316" />
          <Text className="text-gray-400 mt-3 text-sm">Siparişler yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={availableOrders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onAccept={() => handleAccept(item.id)}
              onReject={() => rejectOrder(item.id)}
            />
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingOrders}
              onRefresh={fetchAvailableOrders}
              tintColor="#f97316"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-24">
              <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
                <Ionicons name="checkmark-circle-outline" size={40} color="#d1d5db" />
              </View>
              <Text className="text-gray-500 font-semibold text-base">Bekleyen sipariş yok</Text>
              <Text className="text-gray-400 text-sm mt-1">Aşağı çekerek yenile</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
