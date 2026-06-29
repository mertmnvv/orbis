import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { Animated, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSyncQueue } from "../store/syncQueue";

const MAX_RETRIES = 3;

export function OfflineIndicator() {
  const [isConnected, setIsConnected] = useState(true);
  const opacity = useState(new Animated.Value(0))[0];
  const queue = useSyncQueue((s) => s.queue);

  const pendingCount = queue.filter((i) => i.attempts < MAX_RETRIES).length;
  const failedCount = queue.filter((i) => i.attempts >= MAX_RETRIES).length;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? true;
      setIsConnected(connected);
      Animated.timing(opacity, {
        toValue: connected ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
    return unsubscribe;
  }, []);

  if (isConnected && pendingCount === 0 && failedCount === 0) return null;

  return (
    <Animated.View style={{ opacity: isConnected ? 1 : opacity }}>
      {!isConnected && (
        <View className="bg-red-500 px-4 py-2 flex-row items-center justify-center gap-x-2">
          <View className="w-2 h-2 rounded-full bg-red-200" />
          <Text className="text-white text-xs font-semibold tracking-wide">
            İnternet bağlantısı yok
            {pendingCount > 0 ? ` — ${pendingCount} işlem sıraya alındı` : ""}
          </Text>
        </View>
      )}
      {isConnected && failedCount > 0 && (
        <View className="bg-orange-700 px-4 py-2 flex-row items-center justify-center gap-x-2">
          <Ionicons name="warning-outline" size={12} color="white" />
          <Text className="text-white text-xs font-semibold tracking-wide">
            {failedCount} ödeme kaydedilemedi — Yöneticinize bildirin
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
