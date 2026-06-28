import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OfflineIndicator } from "../../components/OfflineIndicator";
import { useOrderStore } from "../../store/orderStore";
import { Order, OrderStatus, PaymentMethod } from "../../types";

const STATUS_LABELS: Record<OrderStatus, string> = {
  preparing: "Hazırlanıyor",
  pending: "Bekliyor",
  assigned: "Kabul Edildi",
  picked_up: "Teslim Alındı",
  delivered: "Teslim Edildi",
  cancelled: "İptal Edildi",
};

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  preparing: { bg: "#422006", text: "#fb923c" },
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

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "NAKİT",
  card: "KART",
  online_paid: "ONLINE ÖDENMİŞ",
};

const PAYMENT_METHOD_COLORS: Record<PaymentMethod, { bg: string; text: string }> = {
  cash:        { bg: "#78350f40", text: "#fbbf24" },
  card:        { bg: "#1e3a5f",  text: "#60a5fa" },
  online_paid: { bg: "#14532d",  text: "#22c55e" },
};

function PaymentBadge({ order }: { order: Order }) {
  const colors = PAYMENT_METHOD_COLORS[order.paymentMethod];
  const label = PAYMENT_METHOD_LABELS[order.paymentMethod];
  const amount = order.totalAmount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
  return (
    <View className="flex-row items-center bg-dark-base border border-dark-border rounded-xl p-3 mb-4 gap-x-3">
      <Ionicons
        name={order.paymentMethod === "online_paid" ? "shield-checkmark-outline" : "cash-outline"}
        size={20}
        color={colors.text}
      />
      <View className="flex-1">
        <Text className="text-mtext-muted text-xs font-medium">Ödeme</Text>
        <View className="flex-row items-center gap-x-2 mt-0.5">
          <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.bg }}>
            <Text className="text-xs font-bold" style={{ color: colors.text }}>{label}</Text>
          </View>
          {order.paymentMethod !== "online_paid" && (
            <Text className="text-mtext-primary font-bold text-sm">{amount}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

function PaymentModal({
  order,
  onCollected,
  onFailed,
}: {
  order: Order;
  onCollected: () => void;
  onFailed: (notes: string) => void;
}) {
  const methodLabel = order.paymentMethod === "cash" ? "Nakit" : "Kart";
  const amount = order.totalAmount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [notes, setNotes] = useState("");

  if (showNotesInput) {
    return (
      <Modal transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View style={{ backgroundColor: "#1a1a1a", borderRadius: 20, padding: 24, width: "100%", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(239, 68, 68, 0.1)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Ionicons name="alert-circle-outline" size={28} color="#ef4444" />
              </View>
              <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "800" }}>Tahsilat Notu</Text>
              <Text style={{ color: "#71717a", fontSize: 13, marginTop: 4, textAlign: "center" }}>Lütfen tahsilatın neden yapılamadığını yazın.</Text>
            </View>

            <View style={{ marginBottom: 24 }}>
              <TextInput
                style={{
                  backgroundColor: "#0f0f0f",
                  borderRadius: 12,
                  padding: 14,
                  color: "#ffffff",
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  minHeight: 80,
                  textAlignVertical: "top"
                }}
                multiline
                numberOfLines={3}
                placeholder="Ör. Müşteri evde yoktu, limit yetersiz vb. (Zorunlu)"
                placeholderTextColor="#52525b"
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => setShowNotesInput(false)}
                style={{ flex: 1, backgroundColor: "#1c1c1c", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}
              >
                <Text style={{ color: "#a1a1aa", fontWeight: "700", fontSize: 14 }}>Geri Dön</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!notes.trim()) {
                    Alert.alert("Hata", "Lütfen bir gerekçe girin.");
                    return;
                  }
                  onFailed(notes.trim());
                }}
                disabled={!notes.trim()}
                style={{ flex: 1, backgroundColor: "#781a1a", borderRadius: 14, paddingVertical: 14, alignItems: "center", opacity: notes.trim() ? 1 : 0.5 }}
              >
                <Text style={{ color: "#ef4444", fontWeight: "700", fontSize: 14 }}>Siparişi Kapat</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal transparent animationType="fade" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center", padding: 24 }}>
        <View style={{ backgroundColor: "#1a1a1a", borderRadius: 20, padding: 24, width: "100%", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#78350f40", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <Ionicons name="cash-outline" size={28} color="#fbbf24" />
            </View>
            <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "800" }}>Ödeme Tahsilatı</Text>
            <Text style={{ color: "#71717a", fontSize: 13, marginTop: 4 }}>Müşteriden ödemeyi aldınız mı?</Text>
          </View>

          <View style={{ backgroundColor: "#0f0f0f", borderRadius: 12, padding: 16, alignItems: "center", marginBottom: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}>
            <Text style={{ color: "#fbbf24", fontSize: 24, fontWeight: "800" }}>{amount}</Text>
            <Text style={{ color: "#71717a", fontSize: 12, marginTop: 2 }}>{methodLabel} ödeme</Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() => setShowNotesInput(true)}
              style={{ flex: 1, backgroundColor: "#1c1c1c", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}
            >
              <Text style={{ color: "#ef4444", fontWeight: "700", fontSize: 14 }}>Hayır, Alamadım</Text>
            </Pressable>
            <Pressable
              onPress={onCollected}
              style={{ flex: 1, backgroundColor: "#14532d", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
            >
              <Text style={{ color: "#22c55e", fontWeight: "700", fontSize: 14 }}>Evet, Aldım ✓</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NextActionButton({ order }: { order: Order }) {
  const { updateOrderStatus, recordPayment } = useOrderStore();
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleDelivered = async (collected?: boolean, notes?: string) => {
    setShowPaymentModal(false);
    setLoading(true);
    try {
      // Her ikisi paralel başlar: updateOrderStatus'un senkron optimistic update'i
      // anında UI'yi günceller; DB yazmaları arka planda aynı anda gider.
      await Promise.all([
        collected !== undefined ? recordPayment(order.id, collected, notes) : Promise.resolve(),
        updateOrderStatus(order.id, "delivered"),
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (order.status === "assigned") {
    return (
      <Pressable
        onPress={async () => {
          setLoading(true);
          try {
            await updateOrderStatus(order.id, "picked_up");
          } finally {
            setLoading(false);
          }
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
      <>
        {showPaymentModal && (
          <PaymentModal
            order={order}
            onCollected={() => handleDelivered(true)}
            onFailed={(notes) => handleDelivered(false, notes)}
          />
        )}
        <Pressable
          onPress={() => {
            if (order.paymentStatus === "pending") {
              setShowPaymentModal(true);
            } else {
              handleDelivered();
            }
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
      </>
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

        {/* Payment */}
        <PaymentBadge order={order} />

        {/* Customer contact */}
        <View className="flex-row items-center justify-between bg-dark-base rounded-xl p-3 border border-dark-border mb-4">
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

        <NextActionButton key={order.id + order.status} order={order} />
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
      <View style={{
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.06)",
        marginBottom: 4,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <View>
          <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "800", letterSpacing: -0.4 }}>
            Aktif Siparişler
          </Text>
          <Text style={{ color: "#3f3f46", fontSize: 12, marginTop: 2 }}>
            Teslimat durumlarını aşağıdan güncelleyin
          </Text>
        </View>
        <View style={{
          backgroundColor: "rgba(249,115,22,0.12)",
          borderWidth: 1,
          borderColor: "rgba(249,115,22,0.25)",
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 4,
        }}>
          <Text style={{ color: "#f97316", fontWeight: "700", fontSize: 13 }}>{activeOrders.length}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        {activeOrders.map(order => (
          <ActiveOrderCard key={order.id} order={order} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
