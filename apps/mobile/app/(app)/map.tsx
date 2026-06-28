import Constants from "expo-constants";
import * as Location from "expo-location";
import type { Order } from "../../types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { Pressable, Text, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOrderStore } from "../../store/orderStore";

const isExpoGo = Constants.appOwnership === "expo";
let MapboxGL: typeof import("@rnmapbox/maps").default | null = null;

if (!isExpoGo) {
  try {
    MapboxGL = require("@rnmapbox/maps").default;
    MapboxGL!.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "");
  } catch {}
}

export default function MapScreen() {
  const router = useRouter();
  const activeOrders = useOrderStore((s) => s.activeOrders);
  const cameraRef = useRef<any>(null);

  const handleLocateMe = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    cameraRef.current?.setCamera({
      centerCoordinate: [pos.coords.longitude, pos.coords.latitude],
      zoomLevel: 14,
      animationDuration: 600,
    });
  };

  if (!activeOrders || activeOrders.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-dark-base items-center justify-center" edges={["top"]}>
        <View className="w-20 h-20 rounded-full bg-dark-surface border border-dark-border items-center justify-center mb-4">
          <Ionicons name="map-outline" size={40} color="#2a2a2a" />
        </View>
        <Text className="text-mtext-secondary font-semibold text-base">Aktif sipariş yok</Text>
        <Text className="text-mtext-muted text-sm mt-1">Harita siparişi kabul ettikten sonra görünür</Text>
      </SafeAreaView>
    );
  }

  if (isExpoGo || !MapboxGL) {
    return (
      <SafeAreaView className="flex-1 bg-dark-base" edges={["top"]}>
        <View className="flex-row items-center px-4 pt-2 pb-4">
          <Pressable onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-dark-surface border border-dark-border items-center justify-center mr-3">
            <Ionicons name="arrow-back" size={20} color="#a1a1aa" />
          </Pressable>
          <Text className="text-mtext-primary text-xl font-bold">Harita</Text>
        </View>

        <View className="mx-4 bg-warning/10 rounded-2xl p-4 border border-warning/20 mb-4">
          <View className="flex-row items-center gap-x-2 mb-2">
            <Ionicons name="warning-outline" size={18} color="#f59e0b" />
            <Text className="text-warning font-semibold text-sm">Expo Go Modu</Text>
          </View>
          <Text className="text-mtext-muted text-xs">
            Harita görüntüsü için geliştirme derlemesi gereklidir.
          </Text>
        </View>

        <ScrollView>
          {activeOrders.map((order) => (
             <CoordinateFallbackCard key={order.id} order={order} />
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const centerLat = activeOrders[0].restaurantLat;
  const centerLng = activeOrders[0].restaurantLng;

  return (
    <View className="flex-1">
      <MapboxGL.MapView style={{ flex: 1 }} styleURL="mapbox://styles/mapbox/dark-v11" logoEnabled={false} attributionEnabled={false}>
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={[centerLng, centerLat]}
          zoomLevel={13}
          animationMode="flyTo"
          animationDuration={500}
        />
        <MapboxGL.UserLocation visible />

        {activeOrders.map(order => (
          <View key={`route-${order.id}`}>
            <MapboxGL.ShapeSource 
              id={`route-${order.id}`} 
              shape={{
                type: "Feature",
                geometry: { type: "LineString", coordinates: [[order.restaurantLng, order.restaurantLat], [order.customerLng, order.customerLat]] },
                properties: {}
              }}
            >
              <MapboxGL.LineLayer id={`route-line-${order.id}`} style={{ lineColor: "#f97316", lineWidth: 3, lineOpacity: 0.6, lineDasharray: [2, 1] }} />
            </MapboxGL.ShapeSource>
            
            <MapboxGL.PointAnnotation id={`rest-${order.id}`} coordinate={[order.restaurantLng, order.restaurantLat]}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#f97316", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#1e1e1e" }}>
                <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>R</Text>
              </View>
            </MapboxGL.PointAnnotation>

            <MapboxGL.PointAnnotation id={`cust-${order.id}`} coordinate={[order.customerLng, order.customerLat]}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#3b82f6", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#1e1e1e" }}>
                <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>M</Text>
              </View>
            </MapboxGL.PointAnnotation>
          </View>
        ))}
      </MapboxGL.MapView>

      <Pressable
        onPress={handleLocateMe}
        className="absolute left-4 top-14 bg-dark-surface border border-dark-border rounded-full w-12 h-12 items-center justify-center active:bg-dark-elevated"
        style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 6 }}
      >
        <Ionicons name="locate" size={22} color="#f97316" />
      </Pressable>

      <View className="absolute bottom-0 left-0 right-0">
        <SafeAreaView edges={["bottom"]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }} snapToInterval={320} decelerationRate="fast">
            {activeOrders.map(order => (
              <View key={order.id} className="w-[300px] mr-4 bg-dark-surface rounded-2xl p-4 border border-dark-border" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}>
                <View className="flex-row items-center gap-x-3 mb-2">
                  <View className="w-2.5 h-2.5 rounded-full bg-accent" />
                  <Text className="text-mtext-secondary text-sm flex-1" numberOfLines={1}>{order.restaurantName}</Text>
                </View>
                <View className="flex-row items-center gap-x-3 mb-3">
                  <View className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <Text className="text-mtext-secondary text-sm flex-1" numberOfLines={1}>{order.customerName}</Text>
                </View>
                <View className="flex-row gap-x-2">
                  <Pressable onPress={() => router.navigate("/(app)/active")} className="flex-1 bg-accent rounded-xl py-2 items-center active:opacity-80">
                    <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>Detaylara Git</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
}

function CoordinateFallbackCard({ order }: { order: Order }) {
  return (
    <View className="bg-dark-surface mx-4 rounded-2xl p-4 border border-dark-border mb-4">
      <View className="flex-row items-center gap-x-2 mb-3">
        <View className="w-3 h-3 rounded-full bg-accent" />
        <Text className="text-mtext-primary font-bold text-sm">Restoran</Text>
      </View>
      <Text className="text-mtext-secondary text-sm mb-1">{order.restaurantName}</Text>
      <Text className="text-mtext-muted text-xs font-mono mb-4">
        {order.restaurantLat.toFixed(5)}, {order.restaurantLng.toFixed(5)}
      </Text>

      <View className="flex-row items-center gap-x-2 mb-3">
        <View className="w-3 h-3 rounded-full bg-blue-500" />
        <Text className="text-mtext-primary font-bold text-sm">Müşteri</Text>
      </View>
      <Text className="text-mtext-secondary text-sm mb-1">{order.customerName}</Text>
      <Text className="text-mtext-muted text-xs font-mono">
        {order.customerLat.toFixed(5)}, {order.customerLng.toFixed(5)}
      </Text>
    </View>
  );
}
