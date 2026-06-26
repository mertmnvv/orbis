import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { Order } from "../types";

interface Props {
  order: Order;
  onAccept: () => void;
  onReject: () => void;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diff < 1) return "Şimdi";
  return `${diff} dk önce`;
}

export function OrderCard({ order, onAccept, onReject }: Props) {
  const itemSummary =
    order.items.length === 1
      ? order.items[0].name
      : `${order.items[0].name} +${order.items.length - 1}`;

  return (
    <View className="bg-white mx-4 mb-3 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <View className="flex-row items-center gap-x-2 flex-1">
          <View className="w-9 h-9 rounded-xl bg-orange-100 items-center justify-center">
            <Ionicons name="restaurant" size={18} color="#f97316" />
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 font-bold text-base" numberOfLines={1}>
              {order.restaurantName}
            </Text>
            <Text className="text-gray-500 text-xs" numberOfLines={1}>
              {order.restaurantAddress}
            </Text>
          </View>
        </View>
        <Text className="text-gray-400 text-xs ml-2">{timeAgo(order.createdAt)}</Text>
      </View>

      {/* Divider with arrow */}
      <View className="flex-row items-center px-4 py-1">
        <View className="w-9 items-center">
          <View className="w-0.5 h-4 bg-gray-200" />
        </View>
      </View>

      {/* Customer */}
      <View className="flex-row items-center px-4 pb-3 gap-x-2">
        <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center">
          <Ionicons name="location" size={18} color="#3b82f6" />
        </View>
        <View className="flex-1">
          <Text className="text-gray-900 font-semibold text-sm">{order.customerName}</Text>
          <Text className="text-gray-500 text-xs" numberOfLines={1}>
            {order.customerAddress}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View className="flex-row items-center border-t border-gray-50 px-4 py-2 gap-x-4">
        <View className="flex-row items-center gap-x-1">
          <Ionicons name="receipt-outline" size={13} color="#9ca3af" />
          <Text className="text-gray-500 text-xs">{itemSummary}</Text>
        </View>
        <View className="flex-row items-center gap-x-1">
          <Ionicons name="navigate-outline" size={13} color="#9ca3af" />
          <Text className="text-gray-500 text-xs">{order.estimatedDistance}</Text>
        </View>
        <View className="flex-row items-center gap-x-1">
          <Ionicons name="time-outline" size={13} color="#9ca3af" />
          <Text className="text-gray-500 text-xs">{order.estimatedTime}</Text>
        </View>
        <View className="flex-1" />
        <Text className="text-gray-900 font-bold text-base">₺{order.totalAmount}</Text>
      </View>

      {/* Action buttons */}
      <View className="flex-row border-t border-gray-100">
        <Pressable
          onPress={onReject}
          className="flex-1 py-3.5 items-center active:bg-gray-50"
        >
          <Text className="text-red-500 font-semibold text-sm">Reddet</Text>
        </Pressable>
        <View className="w-px bg-gray-100" />
        <Pressable
          onPress={onAccept}
          className="flex-1 py-3.5 items-center active:bg-orange-50"
        >
          <Text className="text-orange-500 font-bold text-sm">Kabul Et</Text>
        </Pressable>
      </View>
    </View>
  );
}
