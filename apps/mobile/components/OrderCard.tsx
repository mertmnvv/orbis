import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useTheme } from "../hooks/useTheme";
import { Order } from "../types";

interface Props {
  order: Order;
  nearbyCount?: number;
  onAccept: () => void;
  onReject: () => void;
  isAccepting?: boolean;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diff < 1) return "Şimdi";
  return `${diff} dk önce`;
}

export function OrderCard({ order, nearbyCount = 0, onAccept, onReject, isAccepting }: Props) {
  const { colors } = useTheme();
  const itemSummary =
    order.items.length === 1
      ? order.items[0].name
      : `${order.items[0].name} +${order.items.length - 1}`;

  return (
    <View style={{
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: colors.bg.card,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    }}>
      {/* Header row */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 10,
        gap: 10,
      }}>
        <View style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: "rgba(249,115,22,0.1)",
          borderWidth: 1,
          borderColor: "rgba(249,115,22,0.2)",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Ionicons name="restaurant" size={17} color="#f97316" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: colors.text.primary, fontWeight: "700", fontSize: 15, letterSpacing: -0.2 }}
            numberOfLines={1}
          >
            {order.restaurantName}
          </Text>
          <Text
            style={{ color: colors.text.faint, fontSize: 12, marginTop: 1 }}
            numberOfLines={1}
          >
            {order.restaurantAddress}
          </Text>
        </View>
        <Text style={{ color: colors.border.muted, fontSize: 11, fontWeight: "600" }}>
          {timeAgo(order.createdAt)}
        </Text>
      </View>

      {/* Route connector */}
      <View style={{ paddingLeft: 28, paddingBottom: 2 }}>
        <View style={{ width: 1.5, height: 14, backgroundColor: "rgba(255,255,255,0.07)", marginLeft: 5 }} />
      </View>

      {/* Customer row */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingBottom: 12,
        gap: 10,
      }}>
        <View style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: "rgba(59,130,246,0.08)",
          borderWidth: 1,
          borderColor: "rgba(59,130,246,0.15)",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Ionicons name="location" size={17} color="#60a5fa" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: colors.text.secondary, fontWeight: "600", fontSize: 14 }}
            numberOfLines={1}
          >
            {order.customerName}
          </Text>
          <Text
            style={{ color: colors.text.faint, fontSize: 12, marginTop: 1 }}
            numberOfLines={1}
          >
            {order.customerAddress}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 12,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="receipt-outline" size={12} color={colors.text.faint} />
          <Text style={{ color: colors.text.muted, fontSize: 12 }}>{itemSummary}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="navigate-outline" size={12} color={colors.text.faint} />
          <Text style={{ color: colors.text.muted, fontSize: 12 }}>{order.estimatedDistance || "—"}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="time-outline" size={12} color={colors.text.faint} />
          <Text style={{ color: colors.text.muted, fontSize: 12 }}>{order.estimatedTime || "—"}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={{ color: colors.text.primary, fontWeight: "800", fontSize: 16, letterSpacing: -0.3 }}>
          ₺{order.totalAmount}
        </Text>
      </View>

      {/* Average prep time badge */}
      {order.restaurantAvgPrepTime != null && (
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          borderTopWidth: 1,
          borderTopColor: colors.border.subtle,
          paddingHorizontal: 14,
          paddingVertical: 8,
          gap: 5,
        }}>
          <Ionicons name="timer-outline" size={12} color={colors.text.muted} />
          <Text style={{ color: colors.text.muted, fontSize: 12 }}>
            Ort. hazırlama: ~{order.restaurantAvgPrepTime} dk
          </Text>
        </View>
      )}

      {/* Multi-order opportunity badge */}
      {nearbyCount > 0 && (
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          borderTopWidth: 1,
          borderTopColor: "rgba(249,115,22,0.12)",
          backgroundColor: "rgba(249,115,22,0.05)",
          paddingHorizontal: 14,
          paddingVertical: 9,
          gap: 7,
        }}>
          <Ionicons name="flash" size={12} color="#f97316" />
          <Text style={{ color: "#f97316", fontSize: 12, fontWeight: "600", flex: 1 }}>
            Bu siparişle birlikte {nearbyCount} sipariş daha alabilirsin!
          </Text>
          <Ionicons name="chevron-forward" size={12} color="rgba(249,115,22,0.5)" />
        </View>
      )}

      {/* Action buttons */}
      <View style={{
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
      }}>
        <Pressable
          onPress={onReject}
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: 14,
            alignItems: "center",
            backgroundColor: pressed ? "rgba(239,68,68,0.07)" : "transparent",
          })}
        >
          <Text style={{ color: "#ef4444", fontWeight: "600", fontSize: 14 }}>Reddet</Text>
        </Pressable>

        <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.05)" }} />

        <Pressable
          onPress={onAccept}
          disabled={isAccepting}
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: 14,
            alignItems: "center",
            backgroundColor: pressed ? "rgba(249,115,22,0.08)" : "transparent",
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
          })}
        >
          {isAccepting ? (
            <ActivityIndicator size="small" color="#f97316" />
          ) : (
            <Text style={{ color: "#f97316", fontWeight: "700", fontSize: 14 }}>Kabul Et</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
