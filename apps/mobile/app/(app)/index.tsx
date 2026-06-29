import { Ionicons } from "@expo/vector-icons";
import distance from "@turf/distance";
import { point } from "@turf/helpers";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OfflineIndicator } from "../../components/OfflineIndicator";
import { OrderCard } from "../../components/OrderCard";
import { useAuthStore } from "../../store/authStore";
import { useOrderStore } from "../../store/orderStore";
import { useTheme } from "../../hooks/useTheme";
import { supabase } from "../../lib/supabase";
import { Order, OrderStatus, PaymentMethod } from "../../types";

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diff < 1) return "Şimdi";
  return `${diff} dk önce`;
}

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
  food_card: "YEMEK KARTI",
  split: "PARÇALI",
};

const PAYMENT_METHOD_COLORS: Record<PaymentMethod, { bg: string; text: string }> = {
  cash:        { bg: "#78350f40", text: "#fbbf24" },
  card:        { bg: "#1e3a5f",  text: "#60a5fa" },
  online_paid: { bg: "#14532d",  text: "#22c55e" },
  food_card:   { bg: "#312e81",  text: "#a5b4fc" },
  split:       { bg: "#581c87",  text: "#d8b4fe" },
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
  onCollected: (actualMethod: PaymentMethod, notes?: string) => void;
  onFailed: (notes: string) => void;
}) {
  const amount = order.totalAmount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [notes, setNotes] = useState("");

  const initialMethod = order.paymentMethod === "online_paid" ? "cash" : order.paymentMethod;
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(initialMethod);

  const [cashAmount, setCashAmount] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [foodCardAmount, setFoodCardAmount] = useState("");
  const [courierNote, setCourierNote] = useState("");

  const cashNum = parseFloat(cashAmount) || 0;
  const cardNum = parseFloat(cardAmount) || 0;
  const foodCardNum = parseFloat(foodCardAmount) || 0;
  const splitTotal = cashNum + cardNum + foodCardNum;
  const isSplitValid = Math.abs(splitTotal - order.totalAmount) < 0.01;

  const handleSuccessPress = () => {
    if (selectedMethod === "split") {
      if (!isSplitValid) {
        Alert.alert("Hata", "Girdiğiniz tutarların toplamı sipariş tutarına eşit olmalıdır.");
        return;
      }
      const splitNotes = JSON.stringify({
        split: { cash: cashNum, card: cardNum, food_card: foodCardNum },
        note: courierNote.trim() || undefined,
      });
      onCollected("split", splitNotes);
    } else {
      onCollected(selectedMethod, courierNote.trim() || undefined);
    }
  };

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

  const methodOptions: { value: PaymentMethod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: "cash", label: "Nakit", icon: "cash-outline" },
    { value: "card", label: "Kart", icon: "card-outline" },
    { value: "food_card", label: "Yemek Kartı", icon: "wallet-outline" },
    { value: "split", label: "Parçalı", icon: "git-branch-outline" },
  ];

  return (
    <Modal transparent animationType="fade" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center", padding: 24 }}>
        <View style={{ backgroundColor: "#1a1a1a", borderRadius: 20, padding: 24, width: "100%", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: "#78350f25", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <Ionicons name="cash-outline" size={24} color="#fbbf24" />
            </View>
            <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "800" }}>Ödeme Tahsilatı</Text>
            <Text style={{ color: "#71717a", fontSize: 12, marginTop: 2 }}>Müşteriden tahsil edilecek tutar:</Text>
          </View>

          <View style={{ backgroundColor: "#0f0f0f", borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}>
            <Text style={{ color: "#fbbf24", fontSize: 24, fontWeight: "800" }}>{amount}</Text>
          </View>

          <Text style={{ color: "#a1a1aa", fontSize: 11, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Ödeme Türü Seçin</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {methodOptions.map((opt) => {
              const isSelected = selectedMethod === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setSelectedMethod(opt.value)}
                  style={{
                    width: "48%",
                    backgroundColor: isSelected ? "rgba(249,115,22,0.12)" : "#0f0f0f",
                    borderColor: isSelected ? "#f97316" : "rgba(255,255,255,0.06)",
                    borderWidth: 1.5,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4
                  }}
                >
                  <Ionicons name={opt.icon} size={18} color={isSelected ? "#f97316" : "#71717a"} />
                  <Text style={{ color: isSelected ? "#ffffff" : "#a1a1aa", fontSize: 12, fontWeight: "600" }}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {selectedMethod === "split" && (
            <View style={{ backgroundColor: "#0f0f0f", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 16 }}>
              <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "700", marginBottom: 10 }}>Parçalı Tutarlar</Text>
              
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, backgroundColor: "#141414", borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", paddingHorizontal: 10 }}>
                <Text style={{ color: "#a1a1aa", fontSize: 12, width: 90 }}>Nakit (₺):</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#3f3f46"
                  style={{ flex: 1, color: "#ffffff", fontSize: 14, paddingVertical: 8, textAlign: "right" }}
                  value={cashAmount}
                  onChangeText={setCashAmount}
                />
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, backgroundColor: "#141414", borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", paddingHorizontal: 10 }}>
                <Text style={{ color: "#a1a1aa", fontSize: 12, width: 90 }}>Kart (₺):</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#3f3f46"
                  style={{ flex: 1, color: "#ffffff", fontSize: 14, paddingVertical: 8, textAlign: "right" }}
                  value={cardAmount}
                  onChangeText={setCardAmount}
                />
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, backgroundColor: "#141414", borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", paddingHorizontal: 10 }}>
                <Text style={{ color: "#a1a1aa", fontSize: 12, width: 90 }}>Yemek Kartı (₺):</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#3f3f46"
                  style={{ flex: 1, color: "#ffffff", fontSize: 14, paddingVertical: 8, textAlign: "right" }}
                  value={foodCardAmount}
                  onChangeText={setFoodCardAmount}
                />
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", paddingTop: 8, marginTop: 4 }}>
                <Text style={{ color: "#71717a", fontSize: 12 }}>Girilen Toplam:</Text>
                <Text style={{ color: isSplitValid ? "#22c55e" : "#ef4444", fontSize: 12, fontWeight: "700" }}>
                  {splitTotal.toFixed(2)} ₺ / {order.totalAmount.toFixed(2)} ₺
                </Text>
              </View>
            </View>
          )}

          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: "#a1a1aa", fontSize: 11, fontWeight: "700", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Tahsilat Notu (İsteğe Bağlı)</Text>
            <TextInput
              style={{
                backgroundColor: "#0f0f0f",
                borderRadius: 10,
                padding: 10,
                color: "#ffffff",
                fontSize: 13,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.06)",
              }}
              placeholder="Eklemek istediğiniz not..."
              placeholderTextColor="#3f3f46"
              value={courierNote}
              onChangeText={setCourierNote}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() => setShowNotesInput(true)}
              style={{ flex: 1, backgroundColor: "#1c1c1c", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}
            >
              <Text style={{ color: "#ef4444", fontWeight: "700", fontSize: 14 }}>Hayır, Alamadım</Text>
            </Pressable>
            <Pressable
              onPress={handleSuccessPress}
              disabled={selectedMethod === "split" && !isSplitValid}
              style={{
                flex: 1,
                backgroundColor: selectedMethod === "split" && !isSplitValid ? "rgba(20,83,45,0.4)" : "#14532d",
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center"
              }}
            >
              <Text style={{
                color: selectedMethod === "split" && !isSplitValid ? "rgba(34,197,94,0.4)" : "#22c55e",
                fontWeight: "700",
                fontSize: 14
              }}>Evet, Aldım ✓</Text>
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

  const handleDelivered = async (collected?: boolean, actualMethod?: PaymentMethod, notes?: string) => {
    setShowPaymentModal(false);
    setLoading(true);
    try {
      await Promise.all([
        collected !== undefined ? recordPayment(order.id, collected, actualMethod, notes) : Promise.resolve(),
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
            onCollected={(actualMethod, notes) => handleDelivered(true, actualMethod, notes)}
            onFailed={(notes) => handleDelivered(false, undefined, notes)}
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

const handleGetDirections = (order: Order) => {
  const isPickedUp = order.status === "picked_up";
  const lat = isPickedUp ? order.customerLat : order.restaurantLat;
  const lng = isPickedUp ? order.customerLng : order.restaurantLng;
  const label = isPickedUp ? order.customerName : order.restaurantName;

  const scheme = Platform.select({
    ios: `maps://0,0?q=${label}@${lat},${lng}`,
    android: `geo:0,0?q=${lat},${lng}(${label})`,
  });

  const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  if (scheme) {
    Linking.canOpenURL(scheme).then((supported) => {
      if (supported) {
        Linking.openURL(scheme);
      } else {
        Linking.openURL(fallbackUrl);
      }
    });
  } else {
    Linking.openURL(fallbackUrl);
  }
};

function StatusNoteModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (note: string) => void;
}) {
  const options = [
    { label: "Adresi bulamadım", icon: "help-circle-outline", color: "#f59e0b" },
    { label: "Müşteriye ulaşılamıyor", icon: "call-outline", color: "#ef4444" },
    { label: "Yolda kaldım (Arıza)", icon: "alert-circle-outline", color: "#ef4444" },
    { label: "Dönüş yolundayım", icon: "bicycle-outline", color: "#60a5fa" },
  ];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center", padding: 24 }}>
        <View style={{ backgroundColor: "#1a1a1a", borderRadius: 20, padding: 24, width: "100%", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(249,115,22,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <Ionicons name="chatbox-ellipses-outline" size={28} color="#f97316" />
            </View>
            <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "800" }}>Durum Bildir</Text>
            <Text style={{ color: "#71717a", fontSize: 13, marginTop: 4, textAlign: "center" }}>Restoran paneline iletilecek durumu seçin:</Text>
          </View>

          <View style={{ gap: 10, marginBottom: 20 }}>
            {options.map((opt) => (
              <Pressable
                key={opt.label}
                onPress={() => onSelect(opt.label)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "#222222" : "#141414",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                })}
              >
                <Ionicons name={opt.icon as any} size={20} color={opt.color} />
                <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "600" }}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={onClose}
            style={{ backgroundColor: "#1c1c1c", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}
          >
            <Text style={{ color: "#a1a1aa", fontWeight: "700", fontSize: 14 }}>Kapat</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ActiveOrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const statusStyle = STATUS_COLORS[order.status];
  const { updateCourierStatusNote } = useOrderStore();
  const [showStatusModal, setShowStatusModal] = useState(false);

  return (
    <View className="bg-dark-surface border border-dark-border rounded-2xl mb-6 overflow-hidden">
      {/* Modal */}
      <StatusNoteModal
        visible={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onSelect={async (note) => {
          setShowStatusModal(false);
          await updateCourierStatusNote(order.id, note);
        }}
      />

      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-dark-base border-b border-dark-border gap-x-3">
        <View className="flex-1">
          <Text className="text-mtext-primary font-bold">#{order.id.slice(0, 8)}</Text>
          <Text className="text-mtext-muted text-xs mt-0.5">{timeAgo(order.createdAt)}</Text>
        </View>
        <Pressable
          onPress={() => setShowStatusModal(true)}
          style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
          className="active:opacity-80 mr-1"
        >
          <Text className="text-mtext-secondary font-bold text-[10px]">Durum Bildir</Text>
        </Pressable>
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

        {/* Courier Status Note Banner */}
        {order.courierStatusNote && (
          <View className="bg-dark-base border border-warning/20 rounded-xl p-3 mb-4 flex-row items-center gap-x-2">
            <Ionicons name="warning-outline" size={16} color="#f59e0b" />
            <Text className="text-mtext-primary text-xs font-medium flex-1">
              Durum: <Text className="font-bold text-[#f59e0b]">{order.courierStatusNote}</Text>
            </Text>
            <Pressable
              onPress={async () => {
                await updateCourierStatusNote(order.id, null);
              }}
            >
              <Text className="text-mtext-muted text-[10px] underline">Kaldır</Text>
            </Pressable>
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

        {/* Map & Navigation buttons */}
        <View className="flex-row gap-x-3">
          <Pressable
            onPress={() => router.navigate("/(app)/map")}
            className="flex-1 bg-dark-base border border-dark-border rounded-xl py-3 flex-row items-center justify-center gap-x-2 active:bg-dark-elevated"
          >
            <Ionicons name="map-outline" size={16} color="#f97316" />
            <Text className="text-accent font-bold text-sm">Haritada Göster</Text>
          </Pressable>

          <Pressable
            onPress={() => handleGetDirections(order)}
            className="flex-1 rounded-xl py-3 flex-row items-center justify-center gap-x-2 active:opacity-80"
            style={{
              backgroundColor: "rgba(249,115,22,0.12)",
              borderWidth: 1,
              borderColor: "rgba(249,115,22,0.25)",
            }}
          >
            <Ionicons name="navigate-circle-outline" size={16} color="#f97316" />
            <Text className="text-accent font-bold text-sm">Yol Tarifi Al</Text>
          </Pressable>
        </View>

        <NextActionButton key={order.id + order.status} order={order} />
      </View>
    </View>
  );
}

function getNearbyCount(order: Order, allOrders: Order[]): number {
  try {
    const maxKm = order.restaurantMaxMultiOrderKm ?? 3.0;
    const maxCount = order.restaurantMaxMultiOrderCount ?? 3;
    if (!order.restaurantLng || !order.restaurantLat) return 0;
    const restPt = point([order.restaurantLng, order.restaurantLat]);
    const custPt = point([order.customerLng, order.customerLat]);

    const nearby = allOrders.filter((o) => {
      if (o.id === order.id || !o.restaurantLng || !o.restaurantLat) return false;
      const oRestPt = point([o.restaurantLng, o.restaurantLat]);
      const oCustPt = point([o.customerLng, o.customerLat]);
      return (
        distance(restPt, oRestPt) <= maxKm &&
        (distance(custPt, oCustPt) <= maxKm || distance(restPt, oCustPt) <= maxKm)
      );
    });

    return Math.min(nearby.length, maxCount - 1);
  } catch {
    return 0;
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, signOut, isAvailable, toggleAvailability, restaurantId } = useAuthStore();
  const { availableOrders, isLoadingOrders, activeOrders, fetchAvailableOrders, acceptOrder, rejectOrder } =
    useOrderStore();

  const [activeTab, setActiveTab] = useState<"pending" | "active">("pending");

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const init = async () => {
      await useOrderStore.getState().initializeCourier();
      fetchAvailableOrders();
    };
    init();

    const channel = supabase
      .channel("mobile-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchAvailableOrders();
            useOrderStore.getState().initializeCourier();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    fetchAvailableOrders();
  }, [isAvailable]);

  const [isAcceptingId, setIsAcceptingId] = useState<string | null>(null);

  const handleAccept = async (orderId: string) => {
    if (isAcceptingId) return;
    setIsAcceptingId(orderId);
    try {
      await useOrderStore.getState().acceptOrder(orderId);
      setActiveTab("active");
    } catch (e) {
      console.error(e);
    } finally {
      setIsAcceptingId(null);
    }
  };

  const phoneDisplay = (() => {
    if (!user?.phone) return 'Kurye';
    const digits = user.phone.replace(/\D/g, '');
    const local = digits.startsWith('90') ? digits.slice(2) : digits;
    if (local.length !== 10) return user.phone;
    return `+90 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={["top"]}>
      <OfflineIndicator />

      {/* Header */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {/* Avatar */}
          <View style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            backgroundColor: "rgba(249,115,22,0.12)",
            borderWidth: 1,
            borderColor: "rgba(249,115,22,0.25)",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Ionicons name="person" size={18} color="#f97316" />
          </View>
          <View>
            <Text style={{ color: colors.text.faint, fontSize: 11, fontWeight: "600", letterSpacing: 0.5 }}>
              HOŞ GELDİN
            </Text>
            <Text style={{ color: colors.text.primary, fontSize: 16, fontWeight: "700", marginTop: 1 }}>
              {phoneDisplay}
            </Text>
          </View>
        </View>

        {/* Action Buttons: Toggle + SignOut */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {/* Müsait Toggle */}
          <Pressable
            onPress={toggleAvailability}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: isAvailable
                ? 'rgba(16,185,129,0.12)'
                : 'rgba(255,255,255,0.04)',
              borderWidth: 1,
              borderColor: isAvailable
                ? 'rgba(16,185,129,0.3)'
                : 'rgba(255,255,255,0.07)',
            }}
          >
            <View style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: isAvailable ? '#10b981' : '#3f3f46',
            }} />
            <Text style={{
              color: isAvailable ? '#10b981' : '#52525b',
              fontSize: 12,
              fontWeight: '700',
            }}>
              {isAvailable ? 'Müsaitim' : 'Müsait Değil'}
            </Text>
          </Pressable>

          <Pressable
            onPress={signOut}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.04)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.07)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="log-out-outline" size={19} color="#3f3f46" />
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <View style={{
        flexDirection: "row",
        paddingHorizontal: 16,
        marginBottom: 16,
        gap: 12,
      }}>
        <Pressable
          onPress={() => setActiveTab("pending")}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: activeTab === "pending" ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.03)",
            borderWidth: 1,
            borderColor: activeTab === "pending" ? "rgba(249,115,22,0.25)" : "rgba(255,255,255,0.06)",
            alignItems: "center",
          }}
        >
          <Text style={{ color: activeTab === "pending" ? "#f97316" : "#52525b", fontWeight: "700", fontSize: 13 }}>
            Bekleyenler ({availableOrders.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("active")}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: activeTab === "active" ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.03)",
            borderWidth: 1,
            borderColor: activeTab === "active" ? "rgba(249,115,22,0.25)" : "rgba(255,255,255,0.06)",
            alignItems: "center",
          }}
        >
          <Text style={{ color: activeTab === "active" ? "#f97316" : "#52525b", fontWeight: "700", fontSize: 13 }}>
            Aktif Siparişlerim ({activeOrders.length})
          </Text>
        </Pressable>
      </View>

      {/* Pending orders list / Offline warning / No restaurant */}
      {!restaurantId ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="storefront-outline" size={48} color="#3f3f46" />
          <Text style={{ color: '#52525b', fontWeight: '600', fontSize: 15, marginTop: 16, textAlign: 'center' }}>
            Henüz bir restorana bağlı değilsiniz
          </Text>
          <Text style={{ color: '#888888', fontSize: 13, marginTop: 4, textAlign: 'center' }}>
            Restoran yöneticisinden sizi sisteme eklemesini isteyin
          </Text>
        </View>
      ) : !isAvailable ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="pause-circle-outline" size={48} color="#3f3f46" />
          <Text style={{ color: '#52525b', fontWeight: '600', fontSize: 15, marginTop: 16 }}>
            Şu an müsait değilsiniz
          </Text>
          <Text style={{ color: '#888888', fontSize: 13, marginTop: 4, textAlign: 'center' }}>
            Sipariş almak için "Müsait Değil" butonuna basın
          </Text>
        </View>
      ) : activeTab === "pending" ? (
        <>
          {isLoadingOrders ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color="#f97316" />
              <Text style={{ color: "#3f3f46", marginTop: 12, fontSize: 13 }}>Siparişler yükleniyor...</Text>
            </View>
          ) : (
            <FlatList
              data={availableOrders}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <OrderCard
                  order={item}
                  nearbyCount={getNearbyCount(item, availableOrders)}
                  onAccept={() => handleAccept(item.id)}
                  onReject={() => rejectOrder(item.id)}
                  isAccepting={isAcceptingId === item.id}
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
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
                  <View style={{
                    width: 80,
                    height: 80,
                    borderRadius: 24,
                    backgroundColor: "rgba(255,255,255,0.03)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.06)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}>
                    <Ionicons name="checkmark-circle-outline" size={38} color="#1e1e1e" />
                  </View>
                  <Text style={{ color: "#52525b", fontWeight: "600", fontSize: 15 }}>
                    Bekleyen sipariş yok
                  </Text>
                  <Text style={{ color: "#2a2a2a", fontSize: 13, marginTop: 4 }}>
                    Aşağı çekerek yenile
                  </Text>
                </View>
              }
            />
          )}
        </>
      ) : (
        /* Active Tab */
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          {(!activeOrders || activeOrders.length === 0) ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                backgroundColor: "rgba(255,255,255,0.03)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.06)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}>
                <Ionicons name="bicycle-outline" size={38} color="#1e1e1e" />
              </View>
              <Text style={{ color: "#52525b", fontWeight: "600", fontSize: 15 }}>
                Aktif sipariş yok
              </Text>
              <Text style={{ color: "#2a2a2a", fontSize: 13, marginTop: 4 }}>
                Yeni sipariş kabul edin
              </Text>
            </View>
          ) : (
            activeOrders.map(order => (
              <ActiveOrderCard key={order.id} order={order} />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
