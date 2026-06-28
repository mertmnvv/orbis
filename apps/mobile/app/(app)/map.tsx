import Constants from "expo-constants";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOrderStore } from "../../store/orderStore";

const isExpoGo = Constants.appOwnership === "expo";
let MapboxGL: typeof import("@rnmapbox/maps").default | null = null;

if (!isExpoGo) {
  try {
    MapboxGL = require("@rnmapbox/maps").default;
    const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
    if (token) MapboxGL!.setAccessToken(token);
  } catch {}
}

const ORDER_COLORS = ["#f97316", "#3b82f6", "#10b981", "#a855f7", "#ef4444"];

// Height reserved for the bottom card so the camera doesn't hide pins under it.
const BOTTOM_CARD_H = 300;

function EmptyState() {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#080808",
        alignItems: "center",
        justifyContent: "center",
      }}
      edges={["top"]}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 28,
          backgroundColor: "rgba(255,255,255,0.03)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.06)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Ionicons name="map-outline" size={38} color="#1e1e1e" />
      </View>
      <Text
        style={{ color: "#52525b", fontWeight: "600", fontSize: 15 }}
      >
        Aktif sipariş yok
      </Text>
      <Text
        style={{
          color: "#2a2a2a",
          fontSize: 13,
          marginTop: 4,
          textAlign: "center",
          paddingHorizontal: 40,
        }}
      >
        Harita siparişi kabul ettikten sonra görünür
      </Text>
    </SafeAreaView>
  );
}

export default function MapScreen() {
  const router = useRouter();
  const activeOrders = useOrderStore((s) => s.activeOrders);
  const cameraRef = useRef<any>(null);

  if (!activeOrders || activeOrders.length === 0) {
    return <EmptyState />;
  }

  const coloredOrders = activeOrders.map((o, i) => ({
    ...o,
    color: ORDER_COLORS[i % ORDER_COLORS.length],
  }));

  // Compute map bounds to fit all restaurant + customer pins.
  const allCoords = coloredOrders.flatMap((o) => [
    [o.restaurantLng, o.restaurantLat],
    [o.customerLng, o.customerLat],
  ]);
  const lngs = allCoords.map((c) => c[0]);
  const lats = allCoords.map((c) => c[1]);
  const bounds = {
    ne: [Math.max(...lngs), Math.max(...lats)] as [number, number],
    sw: [Math.min(...lngs), Math.min(...lats)] as [number, number],
  };

  const handleLocateMe = async () => {
    if (!cameraRef.current) return;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    cameraRef.current.setCamera({
      centerCoordinate: [pos.coords.longitude, pos.coords.latitude],
      zoomLevel: 15,
      animationDuration: 600,
      animationMode: "flyTo",
    });
  };

  // Bottom card shared by both map and Expo Go fallback
  const BottomCard = () => (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(8,8,8,0.96)",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTopWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        maxHeight: BOTTOM_CARD_H,
      }}
    >
      {/* Drag handle */}
      <View
        style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}
      >
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: "rgba(255,255,255,0.12)",
          }}
        />
      </View>

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <Text
          style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}
        >
          Aktif Siparişler
        </Text>
        <View
          style={{
            backgroundColor: "rgba(249,115,22,0.12)",
            borderWidth: 1,
            borderColor: "rgba(249,115,22,0.25)",
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}
        >
          <Text
            style={{ color: "#f97316", fontWeight: "700", fontSize: 12 }}
          >
            {activeOrders.length} rota
          </Text>
        </View>
      </View>

      {/* Order rows */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: 150 }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {coloredOrders.map((order, i) => (
          <View
            key={order.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 10,
              borderTopWidth: i > 0 ? 1 : 0,
              borderTopColor: "rgba(255,255,255,0.05)",
              gap: 12,
            }}
          >
            {/* Color badge */}
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: order.color,
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Text
                style={{ color: "white", fontWeight: "700", fontSize: 11 }}
              >
                {i + 1}
              </Text>
            </View>

            {/* Route summary */}
            <View style={{ flex: 1 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons name="storefront" size={11} color={order.color} />
                <Text
                  style={{
                    color: "#e4e4e7",
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                  numberOfLines={1}
                >
                  {order.restaurantName}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 3,
                }}
              >
                <Ionicons name="location" size={11} color="#52525b" />
                <Text
                  style={{ color: "#71717a", fontSize: 12 }}
                  numberOfLines={1}
                >
                  {order.customerName} · {order.customerAddress}
                </Text>
              </View>
            </View>

            {/* Status badge */}
            <View
              style={{
                backgroundColor:
                  order.status === "picked_up"
                    ? "rgba(249,115,22,0.12)"
                    : "rgba(59,130,246,0.12)",
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 3,
                flexShrink: 0,
              }}
            >
              <Text
                style={{
                  color:
                    order.status === "picked_up" ? "#f97316" : "#60a5fa",
                  fontSize: 10,
                  fontWeight: "700",
                }}
              >
                {order.status === "picked_up" ? "Alındı" : "Bekliyor"}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Navigate button */}
      <View style={{ padding: 12 }}>
        <Pressable
          onPress={() => router.navigate("/(app)/active")}
          style={{
            backgroundColor: "#f97316",
            borderRadius: 14,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
          }}
        >
          <Ionicons name="flash" size={16} color="white" />
          <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>
            Aktif Siparişlere Git
          </Text>
        </Pressable>
      </View>
    </View>
  );

  // Expo Go fallback — no map, just a clean list
  if (isExpoGo || !MapboxGL) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#080808" }}
        edges={["top"]}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}>
          <Text
            style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}
          >
            Harita
          </Text>
          <Text style={{ color: "#3f3f46", fontSize: 12, marginTop: 2 }}>
            {activeOrders.length} aktif sipariş
          </Text>
        </View>

        {/* Order list */}
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        >
          {coloredOrders.map((order, i) => (
            <View
              key={order.id}
              style={{
                backgroundColor: "#141414",
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: order.color + "40",
                borderLeftWidth: 3,
                borderLeftColor: order.color,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: order.color,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 10,
                      fontWeight: "700",
                    }}
                  >
                    {i + 1}
                  </Text>
                </View>
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "700",
                    fontSize: 14,
                  }}
                >
                  {order.restaurantName}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ alignItems: "center", paddingTop: 2 }}>
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: order.color,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="storefront" size={8} color="white" />
                  </View>
                  <View
                    style={{
                      width: 1,
                      height: 18,
                      backgroundColor: "#2a2a2a",
                      marginVertical: 3,
                    }}
                  />
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      borderWidth: 2,
                      borderColor: order.color,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: order.color,
                      }}
                    />
                  </View>
                </View>

                <View style={{ flex: 1, gap: 8 }}>
                  <View>
                    <Text
                      style={{
                        color: "#3f3f46",
                        fontSize: 10,
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Al
                    </Text>
                    <Text
                      style={{
                        color: "#e4e4e7",
                        fontSize: 13,
                        fontWeight: "600",
                        marginTop: 1,
                      }}
                    >
                      {order.restaurantAddress}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={{
                        color: "#3f3f46",
                        fontSize: 10,
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Bırak
                    </Text>
                    <Text
                      style={{
                        color: "#e4e4e7",
                        fontSize: 13,
                        fontWeight: "600",
                        marginTop: 1,
                      }}
                    >
                      {order.customerName}
                    </Text>
                    <Text
                      style={{
                        color: "#71717a",
                        fontSize: 12,
                        marginTop: 1,
                      }}
                      numberOfLines={1}
                    >
                      {order.customerAddress}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}

          <Pressable
            onPress={() => router.navigate("/(app)/active")}
            style={{
              backgroundColor: "#f97316",
              borderRadius: 14,
              height: 52,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              marginTop: 4,
            }}
          >
            <Ionicons name="flash" size={17} color="white" />
            <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
              Aktif Siparişlere Git
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Production map view
  return (
    <View style={{ flex: 1 }}>
      <MapboxGL.MapView
        style={{ flex: 1 }}
        styleURL="mapbox://styles/mapbox/dark-v11"
        logoEnabled={false}
        attributionEnabled={false}
      >
        {/* Fit all pins + leave room for bottom card */}
        <MapboxGL.Camera
          ref={cameraRef}
          bounds={{
            ne: bounds.ne,
            sw: bounds.sw,
            paddingTop: 80,
            paddingBottom: BOTTOM_CARD_H + 20,
            paddingLeft: 40,
            paddingRight: 40,
          }}
          animationDuration={600}
          animationMode="flyTo"
        />

        <MapboxGL.UserLocation visible />

        {/* Route lines */}
        {coloredOrders.map((order) => (
          <MapboxGL.ShapeSource
            key={`route-${order.id}`}
            id={`route-${order.id}`}
            shape={{
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [
                  [order.restaurantLng, order.restaurantLat],
                  [order.customerLng, order.customerLat],
                ],
              },
              properties: {},
            }}
          >
            <MapboxGL.LineLayer
              id={`route-line-${order.id}`}
              style={{
                lineColor: order.color,
                lineWidth: 3,
                lineOpacity: 0.9,
                lineDasharray: [2, 1.2],
              }}
            />
          </MapboxGL.ShapeSource>
        ))}

        {/* Restaurant pins */}
        {coloredOrders.map((order) => (
          <MapboxGL.PointAnnotation
            key={`rest-${order.id}`}
            id={`rest-${order.id}`}
            coordinate={[order.restaurantLng, order.restaurantLat]}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: order.color,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2.5,
                borderColor: "#080808",
              }}
            >
              <Ionicons name="storefront" size={15} color="white" />
            </View>
          </MapboxGL.PointAnnotation>
        ))}

        {/* Customer pins */}
        {coloredOrders.map((order) => (
          <MapboxGL.PointAnnotation
            key={`cust-${order.id}`}
            id={`cust-${order.id}`}
            coordinate={[order.customerLng, order.customerLat]}
          >
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: "#080808",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2.5,
                borderColor: order.color,
              }}
            >
              <View
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 4.5,
                  backgroundColor: order.color,
                }}
              />
            </View>
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>

      {/* Locate me */}
      <Pressable
        onPress={handleLocateMe}
        style={{
          position: "absolute",
          top: 56,
          left: 16,
          width: 46,
          height: 46,
          backgroundColor: "rgba(8,8,8,0.9)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.1)",
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          elevation: 6,
        }}
      >
        <Ionicons name="locate" size={20} color="#f97316" />
      </Pressable>

      <BottomCard />
    </View>
  );
}
