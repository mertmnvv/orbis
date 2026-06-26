import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOrderStore } from "../../store/orderStore";

// Expo Go'da react-native-maps mevcut değil — koşullu yükleme
const isExpoGo = Constants.appOwnership === "expo";
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = null;

if (!isExpoGo) {
  try {
    const maps = require("react-native-maps");
    MapView = maps.default;
    Marker = maps.Marker;
    Polyline = maps.Polyline;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  } catch {
    // Dev build oluşturulmamış — fallback gösterilecek
  }
}

export default function MapScreen() {
  const router = useRouter();
  const activeOrder = useOrderStore((s) => s.activeOrder);

  if (!activeOrder) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center" edges={["top"]}>
        <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
          <Ionicons name="map-outline" size={40} color="#d1d5db" />
        </View>
        <Text className="text-gray-500 font-semibold text-base">Aktif sipariş yok</Text>
        <Text className="text-gray-400 text-sm mt-1">Harita siparişi kabul ettikten sonra görünür</Text>
      </SafeAreaView>
    );
  }

  // Expo Go'da harita gösterilemiyor — koordinat kartı fallback
  if (isExpoGo || !MapView) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <View className="flex-row items-center px-4 pt-2 pb-4">
          <Pressable onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center mr-3">
            <Ionicons name="arrow-back" size={20} color="#374151" />
          </Pressable>
          <Text className="text-gray-900 text-xl font-bold">Harita</Text>
        </View>

        <View className="mx-4 bg-amber-50 rounded-2xl p-4 border border-amber-200 mb-4">
          <View className="flex-row items-center gap-x-2 mb-2">
            <Ionicons name="warning-outline" size={18} color="#d97706" />
            <Text className="text-amber-700 font-semibold text-sm">Expo Go Modu</Text>
          </View>
          <Text className="text-amber-600 text-xs">
            Harita görüntüsü için geliştirme derlemesi (dev build) gereklidir.{"\n"}
            Koordinatlar aşağıda gösterilmektedir.
          </Text>
        </View>

        <View className="bg-white mx-4 rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <View className="flex-row items-center gap-x-2 mb-3">
            <View className="w-3 h-3 rounded-full bg-orange-500" />
            <Text className="text-gray-900 font-bold text-sm">Restoran</Text>
          </View>
          <Text className="text-gray-600 text-sm mb-1">{activeOrder.restaurantName}</Text>
          <Text className="text-gray-400 text-xs font-mono">
            {activeOrder.restaurantLat.toFixed(5)}, {activeOrder.restaurantLng.toFixed(5)}
          </Text>
        </View>

        <View className="bg-white mx-4 rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <View className="flex-row items-center gap-x-2 mb-3">
            <View className="w-3 h-3 rounded-full bg-blue-500" />
            <Text className="text-gray-900 font-bold text-sm">Müşteri</Text>
          </View>
          <Text className="text-gray-600 text-sm mb-1">{activeOrder.customerName}</Text>
          <Text className="text-gray-400 text-xs font-mono">
            {activeOrder.customerLat.toFixed(5)}, {activeOrder.customerLng.toFixed(5)}
          </Text>
        </View>

        <View className="flex-row gap-x-3 mx-4">
          <View className="flex-1 bg-orange-50 rounded-xl py-3 items-center">
            <Text className="text-orange-500 font-bold">{activeOrder.estimatedDistance}</Text>
            <Text className="text-gray-400 text-xs">Mesafe</Text>
          </View>
          <View className="flex-1 bg-blue-50 rounded-xl py-3 items-center">
            <Text className="text-blue-500 font-bold">{activeOrder.estimatedTime}</Text>
            <Text className="text-gray-400 text-xs">Süre</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Native dev build — gerçek harita
  const midLat = (activeOrder.restaurantLat + activeOrder.customerLat) / 2;
  const midLng = (activeOrder.restaurantLng + activeOrder.customerLng) / 2;
  const latDelta = Math.abs(activeOrder.restaurantLat - activeOrder.customerLat) * 2 + 0.01;
  const lngDelta = Math.abs(activeOrder.restaurantLng - activeOrder.customerLng) * 2 + 0.01;

  const routeCoords = [
    { latitude: activeOrder.restaurantLat, longitude: activeOrder.restaurantLng },
    { latitude: activeOrder.customerLat, longitude: activeOrder.customerLng },
  ];

  return (
    <View className="flex-1">
      <MapView
        style={{ flex: 1 }}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={{ latitude: midLat, longitude: midLng, latitudeDelta: latDelta, longitudeDelta: lngDelta }}
        showsUserLocation
        showsMyLocationButton
      >
        <Marker
          coordinate={{ latitude: activeOrder.restaurantLat, longitude: activeOrder.restaurantLng }}
          title={activeOrder.restaurantName}
          description="Teslim alınacak nokta"
          pinColor="#f97316"
        />
        <Marker
          coordinate={{ latitude: activeOrder.customerLat, longitude: activeOrder.customerLng }}
          title={activeOrder.customerName}
          description="Teslim edilecek adres"
          pinColor="#3b82f6"
        />
        <Polyline coordinates={routeCoords} strokeColor="#f97316" strokeWidth={3} lineDashPattern={[6, 4]} />
      </MapView>

      <View className="absolute bottom-0 left-0 right-0">
        <SafeAreaView edges={["bottom"]}>
          <View className="mx-4 mb-4 bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <View className="flex-row items-center gap-x-3 mb-3">
              <View className="w-3 h-3 rounded-full bg-orange-500" />
              <Text className="text-gray-700 text-sm flex-1" numberOfLines={1}>{activeOrder.restaurantName}</Text>
            </View>
            <View className="flex-row items-center gap-x-3 mb-3">
              <View className="w-3 h-3 rounded-full bg-blue-500" />
              <Text className="text-gray-700 text-sm flex-1" numberOfLines={1}>
                {activeOrder.customerName} — {activeOrder.customerAddress}
              </Text>
            </View>
            <View className="flex-row gap-x-3">
              <View className="flex-1 bg-orange-50 rounded-xl py-2.5 items-center">
                <Text className="text-orange-500 font-bold">{activeOrder.estimatedDistance}</Text>
                <Text className="text-gray-400 text-xs">Mesafe</Text>
              </View>
              <View className="flex-1 bg-blue-50 rounded-xl py-2.5 items-center">
                <Text className="text-blue-500 font-bold">{activeOrder.estimatedTime}</Text>
                <Text className="text-gray-400 text-xs">Süre</Text>
              </View>
              <Pressable
                onPress={() => router.navigate("/(app)/active")}
                className="flex-1 bg-gray-900 rounded-xl py-2.5 items-center active:bg-gray-700"
              >
                <Text className="text-white font-bold text-sm">Detay</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}
