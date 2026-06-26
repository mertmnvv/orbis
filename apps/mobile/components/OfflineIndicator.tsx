import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { Animated, Text, View } from "react-native";

export function OfflineIndicator() {
  const [isConnected, setIsConnected] = useState(true);
  const opacity = useState(new Animated.Value(0))[0];

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

  if (isConnected) return null;

  return (
    <Animated.View style={{ opacity }}>
      <View className="bg-red-500 px-4 py-2 flex-row items-center justify-center gap-x-2">
        <View className="w-2 h-2 rounded-full bg-red-200" />
        <Text className="text-white text-xs font-semibold tracking-wide">
          İnternet bağlantısı yok
        </Text>
      </View>
    </Animated.View>
  );
}
