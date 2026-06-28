import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OfflineIndicator } from "../../components/OfflineIndicator";
import { useOrderStore } from "../../store/orderStore";
import { Order, OrderStatus } from "../../types";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Bekliyor",
  assigned: "Kabul Edildi",
  picked_up: "Teslim Alındı",
  delivered: "Teslim Edildi",
  cancelled: "İptal Edildi",
};

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending:   { bg: "#78350f20", text: "#f59e0b" },
  assigned:  { bg: "#1e3a5f", text: "#60a5fa" },
  picked_up: { bg: "#431407", text: "#f97316" },
  delivered: { bg: "#14532d", text: "#22c55e" },
  cancelled: { bg: "#1c1c1c", text: "#71717a" },
};

function RouteStep({
  icon,
  iconColor,
  iconBg,
  title,
  address,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  address: string;
  isLast?: boolean;
}) {
  return (
    <View className="flex-row gap-x-3">
      <View className="items-center">
        <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: iconBg }}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        {!isLast && <View className="w-0.5 flex-1 bg-dark-border my-1" />}
      </View>
      <View className="flex-1 pb-4">
        <Text className="text-mtext-muted text-xs font-medium mb-0.5">{title}</Text>
        <Text className="text-mtext-primary font-semibold text-sm">{address}</Text>
      </View>
    </View>
  );
}

function NextActionButton({ order }: { order: Order }) {
  const { updateOrderStatus } = useOrderStore();
  const [loading, setLoading] = useState(false);

  if (order.status === "assigned") {
    return (
      <Pressable
        onPress={async () => {
          setLoading(true);
          await updateOrderStatus(order.id, "picked_up");
          setLoading(false);
        }}
        disabled={loading}
        className="bg-accent rounded-2xl py-4 items-center active:opacity-80 flex-row justify-center gap-x-2 mt-4"
        style={{ shadowColor: "#f97316", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 }}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="bag-check-outline" size={20} color="white" />
            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Yemeği Teslim Aldım</Text>
          </>
        )}
      </Pressable>
    );
  }

  if (order.status === "picked_up") {
    return (
      <Pressable
        onPress={async () => {
          setLoading(true);
          await updateOrderStatus(order.id, "delivered");
          setLoading(false);
        }}
        disabled={loading}
        className="bg-success rounded-2xl py-4 items-center active:opacity-80 flex-row justify-center gap-x-2 mt-4"
        style={{ shadowColor: "#22c55e", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={20} color="white" />
            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Müşteriye Teslim Ettim</Text>
          </>
        )}
      </Pressable>
    );
  }

  return null;
}

function ActiveOrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const statusStyle = STATUS_COLORS[order.status];

  return (
    <View className="bg-dark-surface border border-dark-border rounded-2xl mb-6 overflow-hidden">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-dark-base border-b border-dark-border gap-x-3">
        <View className="flex-1">
          <Text className="text-mtext-primary font-bold">#{order.id.slice(0, 8)}</Text>
        </View>
        <View className="px-3 py-1 rounded-full" style={{ backgroundColor: statusStyle.bg }}>
          <Text className="text-xs font-bold" style={{ color: statusStyle.text }}>
            {STATUS_LABELS[order.status]}
          </Text>
        </View>
      </View>

      <View className="p-4">
        {/* Route */}
        <Text className="text-mtext-primary font-bold mb-3">Güzergah</Text>
        <RouteStep
          icon="restaurant-outline"
          iconColor="#f97316"
          iconBg="#431407"
          title="Restoran"
          address={`${order.restaurantName}\n${order.restaurantAddress}`}
        />
        <RouteStep
          icon="location"
          iconColor="#3b82f6"
          iconBg="#1e3a5f"
          title="Müşteri"
          address={`${order.customerName}\n${order.customerAddress}`}
          isLast
        />

        {/* Distance & time */}
        {(order.estimatedDistance || order.estimatedTime) && (
          <View className="flex-row gap-x-3 mb-4 mt-2">
            {order.estimatedDistance ? (
              <View className="flex-1 bg-dark-base border border-dark-border rounded-xl py-3 items-center">
                <Text className="text-accent font-bold text-base">{order.estimatedDistance}</Text>
                <Text className="text-mtext-muted text-xs mt-0.5">Mesafe</Text>
              </View>
            ) : null}
            {order.estimatedTime ? (
              <View className="flex-1 bg-dark-base border border-dark-border rounded-xl py-3 items-center">
                <Text className="text-blue-400 font-bold text-base">{order.estimatedTime}</Text>
                <Text className="text-mtext-muted text-xs mt-0.5">Süre</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Customer contact */}
        <View className="flex-row items-center justify-between bg-dark-base rounded-xl p-3 border border-dark-border mb-4 mt-2">
          <View>
            <Text className="text-mtext-muted text-xs font-medium">Müşteri</Text>
            <Text className="text-mtext-primary font-bold text-sm mt-0.5">{order.customerName}</Text>
            <Text className="text-mtext-secondary text-xs mt-0.5">{order.customerPhone}</Text>
          </View>
          <Pressable
            onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}
            className="w-10 h-10 rounded-full bg-success items-center justify-center active:opacity-80"
          >
            <Ionicons name="call" size={18} color="white" />
          </Pressable>
        </View>

        {/* Items */}
        <View className="bg-dark-base border border-dark-border rounded-xl p-3 mb-4">
          <Text className="text-mtext-primary font-bold text-xs mb-2">Sipariş İçeriği</Text>
          {order.items.map((item, idx) => (
            <View key={idx} className="flex-row items-center justify-between py-1">
              <View className="flex-row items-center gap-x-2 flex-1">
                <View className="w-4 h-4 rounded bg-accent/20 items-center justify-center">
                  <Text className="text-accent text-[10px] font-bold">{item.quantity}</Text>
                </View>
                <Text className="text-mtext-secondary text-xs flex-1">{item.name}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Map button */}
        <Pressable
          onPress={() => router.navigate("/(app)/map")}
          className="bg-dark-base border border-dark-border rounded-xl py-3 flex-row items-center justify-center gap-x-2 active:bg-dark-elevated"
        >
          <Ionicons name="map-outline" size={16} color="#f97316" />
          <Text className="text-accent font-bold text-sm">Haritada Göster</Text>
        </Pressable>

        <NextActionButton order={order} />
      </View>
    </View>
  );
}

export default function ActiveOrderScreen() {
  const router = useRouter();
  const activeOrders = useOrderStore((s) => s.activeOrders);

  if (!activeOrders || activeOrders.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-dark-base items-center justify-center" edges={["top"]}>
        <View className="w-20 h-20 rounded-full bg-dark-surface border border-dark-border items-center justify-center mb-4">
          <Ionicons name="bicycle-outline" size={40} color="#2a2a2a" />
        </View>
        <Text className="text-mtext-secondary font-semibold text-base">Aktif sipariş yok</Text>
        <Text className="text-mtext-muted text-sm mt-1 mb-6">
          Siparişler sekmesinden sipariş kabul edin
        </Text>
        <Pressable
          onPress={() => router.navigate("/(app)")}
          className="bg-accent px-6 py-3 rounded-xl active:opacity-80"
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Siparişlere Git</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-base" edges={["top"]}>
      <OfflineIndicator />

      {/* Header */}
      <View className="px-4 pt-2 pb-4 border-b border-dark-border mb-4">
        <Text className="text-mtext-primary text-xl font-bold">Aktif Siparişler ({activeOrders.length})</Text>
        <Text className="text-mtext-muted text-xs mt-1">Teslimat durumlarını aşağıdan güncelleyin</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        {activeOrders.map(order => (
          <ActiveOrderCard key={order.id} order={order} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
