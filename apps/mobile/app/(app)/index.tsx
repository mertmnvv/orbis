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
  const { availableOrders, isLoadingOrders, activeOrders, fetchAvailableOrders, acceptOrder, rejectOrder } =
    useOrderStore();

  useEffect(() => {
    fetchAvailableOrders();
  }, []);

  const handleAccept = (orderId: string) => {
    acceptOrder(orderId);
    router.navigate("/(app)/active");
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-base" edges={["top"]}>
      <OfflineIndicator />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
        <View className="flex-row items-center gap-x-3">
          <View className="w-10 h-10 rounded-full bg-accent items-center justify-center">
            <Ionicons name="bicycle" size={20} color="white" />
          </View>
          <View>
            <Text className="text-mtext-muted text-xs font-medium">Hoş geldin</Text>
            <Text className="text-mtext-primary text-lg font-bold">{user?.phone ?? "Kurye"}</Text>
          </View>
        </View>
        <Pressable
          onPress={signOut}
          className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center active:bg-dark-elevated"
        >
          <Ionicons name="log-out-outline" size={20} color="#52525b" />
        </Pressable>
      </View>

      {/* Active order banner */}
      {activeOrders && activeOrders.length > 0 && (
        <Pressable
          onPress={() => router.navigate("/(app)/active")}
          className="mx-4 mb-3 bg-dark-surface border border-accent/30 rounded-2xl px-4 py-3 flex-row items-center gap-x-3 active:bg-dark-elevated"
          style={{ borderLeftWidth: 3, borderLeftColor: "#f97316" }}
        >
          <View className="w-9 h-9 rounded-full bg-accent/20 items-center justify-center">
            <Ionicons name="bicycle" size={18} color="#f97316" />
          </View>
          <View className="flex-1">
            <Text className="text-accent font-bold text-sm">{activeOrders.length} Aktif Sipariş Devam Ediyor</Text>
            <Text className="text-mtext-secondary text-xs mt-0.5">
              Siparişleri görüntülemek için dokun
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#f97316" />
        </Pressable>
      )}

      {/* Section title */}
      <View className="flex-row items-center justify-between px-4 mb-3">
        <Text className="text-mtext-primary font-bold text-base">Bekleyen Siparişler</Text>
        {availableOrders.length > 0 && (
          <View className="bg-accent/20 px-2.5 py-0.5 rounded-full border border-accent/30">
            <Text className="text-accent font-bold text-xs">{availableOrders.length}</Text>
          </View>
        )}
      </View>

      {/* Order list */}
      {isLoadingOrders ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f97316" />
          <Text className="text-mtext-muted mt-3 text-sm">Siparişler yükleniyor...</Text>
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
              <View className="w-20 h-20 rounded-full bg-dark-surface border border-dark-border items-center justify-center mb-4">
                <Ionicons name="checkmark-circle-outline" size={40} color="#2a2a2a" />
              </View>
              <Text className="text-mtext-secondary font-semibold text-base">Bekleyen sipariş yok</Text>
              <Text className="text-mtext-muted text-sm mt-1">Aşağı çekerek yenile</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
