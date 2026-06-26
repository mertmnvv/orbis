import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OfflineIndicator } from "../../components/OfflineIndicator";
import { useOrderStore } from "../../store/orderStore";
import { Order, OrderStatus } from "../../types";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Bekliyor",
  accepted: "Kabul Edildi",
  picked_up: "Teslim Alındı",
  delivered: "Teslim Edildi",
  rejected: "Reddedildi",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-blue-100 text-blue-700",
  picked_up: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

function RouteStep({
  icon,
  iconBg,
  title,
  address,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  title: string;
  address: string;
  isLast?: boolean;
}) {
  return (
    <View className="flex-row gap-x-3">
      <View className="items-center">
        <View className={`w-10 h-10 rounded-xl items-center justify-center ${iconBg}`}>
          <Ionicons name={icon} size={18} color={iconBg.includes("orange") ? "#f97316" : "#3b82f6"} />
        </View>
        {!isLast && <View className="w-0.5 flex-1 bg-gray-200 my-1" />}
      </View>
      <View className="flex-1 pb-4">
        <Text className="text-gray-500 text-xs font-medium mb-0.5">{title}</Text>
        <Text className="text-gray-900 font-semibold text-sm">{address}</Text>
      </View>
    </View>
  );
}

function NextActionButton({ order }: { order: Order }) {
  const { updateOrderStatus } = useOrderStore();

  if (order.status === "accepted") {
    return (
      <Pressable
        onPress={() => updateOrderStatus(order.id, "picked_up")}
        className="bg-orange-500 rounded-2xl py-4 items-center active:bg-orange-600 flex-row justify-center gap-x-2"
      >
        <Ionicons name="bag-check-outline" size={20} color="white" />
        <Text className="text-white font-bold text-base">Yemeği Teslim Aldım</Text>
      </Pressable>
    );
  }

  if (order.status === "picked_up") {
    return (
      <Pressable
        onPress={() => updateOrderStatus(order.id, "delivered")}
        className="bg-green-500 rounded-2xl py-4 items-center active:bg-green-600 flex-row justify-center gap-x-2"
      >
        <Ionicons name="checkmark-circle-outline" size={20} color="white" />
        <Text className="text-white font-bold text-base">Müşteriye Teslim Ettim</Text>
      </Pressable>
    );
  }

  return null;
}

export default function ActiveOrderScreen() {
  const router = useRouter();
  const activeOrder = useOrderStore((s) => s.activeOrder);

  if (!activeOrder) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center" edges={["top"]}>
        <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
          <Ionicons name="bicycle-outline" size={40} color="#d1d5db" />
        </View>
        <Text className="text-gray-500 font-semibold text-base">Aktif sipariş yok</Text>
        <Text className="text-gray-400 text-sm mt-1 mb-6">
          Siparişler sekmesinden sipariş kabul edin
        </Text>
        <Pressable
          onPress={() => router.navigate("/(app)")}
          className="bg-orange-500 px-6 py-3 rounded-xl active:bg-orange-600"
        >
          <Text className="text-white font-bold">Siparişlere Git</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const statusClass = STATUS_COLORS[activeOrder.status];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <OfflineIndicator />

      {/* Header */}
      <View className="flex-row items-center px-4 pt-2 pb-4 gap-x-3">
        <View className="flex-1">
          <Text className="text-gray-900 text-xl font-bold">Aktif Sipariş</Text>
          <Text className="text-gray-400 text-xs">#{activeOrder.id}</Text>
        </View>
        <View className={`px-3 py-1 rounded-full ${statusClass.split(" ")[0]}`}>
          <Text className={`text-xs font-bold ${statusClass.split(" ")[1]}`}>
            {STATUS_LABELS[activeOrder.status]}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Route card */}
        <View className="bg-white mx-4 rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <Text className="text-gray-900 font-bold mb-3">Güzergah</Text>
          <RouteStep
            icon="restaurant-outline"
            iconBg="bg-orange-100"
            title="Restoran"
            address={`${activeOrder.restaurantName}\n${activeOrder.restaurantAddress}`}
          />
          <RouteStep
            icon="location"
            iconBg="bg-blue-50"
            title="Müşteri"
            address={`${activeOrder.customerName}\n${activeOrder.customerAddress}`}
            isLast
          />
        </View>

        {/* Customer contact */}
        <View className="bg-white mx-4 rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-gray-500 text-xs font-medium">Müşteri</Text>
              <Text className="text-gray-900 font-bold text-base mt-0.5">{activeOrder.customerName}</Text>
              <Text className="text-gray-500 text-sm">{activeOrder.customerPhone}</Text>
            </View>
            <Pressable
              onPress={() => Linking.openURL(`tel:${activeOrder.customerPhone}`)}
              className="w-12 h-12 rounded-full bg-green-500 items-center justify-center active:bg-green-600"
            >
              <Ionicons name="call" size={22} color="white" />
            </Pressable>
          </View>
        </View>

        {/* Items */}
        <View className="bg-white mx-4 rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <Text className="text-gray-900 font-bold mb-3">Sipariş İçeriği</Text>
          {activeOrder.items.map((item, idx) => (
            <View
              key={idx}
              className="flex-row items-center justify-between py-1.5"
            >
              <View className="flex-row items-center gap-x-2 flex-1">
                <View className="w-5 h-5 rounded bg-orange-100 items-center justify-center">
                  <Text className="text-orange-600 text-xs font-bold">{item.quantity}</Text>
                </View>
                <Text className="text-gray-700 text-sm flex-1">{item.name}</Text>
              </View>
              <Text className="text-gray-900 font-semibold text-sm">
                ₺{(item.price * item.quantity).toFixed(0)}
              </Text>
            </View>
          ))}
          <View className="border-t border-gray-100 mt-2 pt-2 flex-row justify-between">
            <Text className="text-gray-900 font-bold">Toplam</Text>
            <Text className="text-orange-500 font-bold text-base">₺{activeOrder.totalAmount}</Text>
          </View>
        </View>

        {/* Map button */}
        <Pressable
          onPress={() => router.navigate("/(app)/map")}
          className="mx-4 bg-white border border-gray-200 rounded-2xl py-3.5 flex-row items-center justify-center gap-x-2 mb-4 active:bg-gray-50"
        >
          <Ionicons name="map-outline" size={18} color="#f97316" />
          <Text className="text-orange-500 font-bold">Haritada Göster</Text>
        </Pressable>

        {/* CTA */}
        <View className="mx-4">
          <NextActionButton order={activeOrder} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
