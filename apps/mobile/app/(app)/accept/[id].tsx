import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOrderStore } from "../../../store/orderStore";
import Constants from "expo-constants";
import distance from "@turf/distance";
import { point } from "@turf/helpers";
import { Order } from "../../../types";

const ACCEPT_TIMEOUT_MS = 10_000;

const isExpoGo = Constants.appOwnership === "expo";
let MapboxGL: typeof import("@rnmapbox/maps").default | null = null;
if (!isExpoGo) {
  try {
    MapboxGL = require("@rnmapbox/maps").default;
    MapboxGL!.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "");
  } catch {}
}

const ORDER_COLORS = ["#f97316", "#3b82f6", "#10b981", "#a855f7", "#ef4444"];

function computeBounds(orders: Order[]) {
  const coords = orders.flatMap((o) => [
    [o.restaurantLng, o.restaurantLat],
    [o.customerLng, o.customerLat],
  ]);
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  return {
    ne: [Math.max(...lngs), Math.max(...lats)] as [number, number],
    sw: [Math.min(...lngs), Math.min(...lats)] as [number, number],
  };
}

export default function AcceptOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { availableOrders, acceptOrders } = useOrderStore();

  const primaryOrder = availableOrders.find((o) => o.id === id);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(id ? [id] : [])
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset isSubmitting whenever screen gains focus — handles the case where
  // the user navigates back via the hardware back button after tapping accept.
  useFocusEffect(
    useCallback(() => {
      setIsSubmitting(false);
    }, [])
  );

  if (!primaryOrder) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#080808",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
        edges={["top"]}
      >
        <Ionicons name="alert-circle-outline" size={48} color="#3f3f46" />
        <Text
          style={{
            color: "#71717a",
            fontSize: 15,
            fontWeight: "600",
            marginTop: 12,
            textAlign: "center",
          }}
        >
          Sipariş başkası tarafından alındı
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            marginTop: 20,
            paddingHorizontal: 20,
            paddingVertical: 10,
            backgroundColor: "#1a1a1a",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#27272a",
          }}
        >
          <Text style={{ color: "#a1a1aa", fontWeight: "600" }}>Geri Dön</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const maxKm = primaryOrder.restaurantMaxMultiOrderKm ?? 3.0;
  const maxCount = primaryOrder.restaurantMaxMultiOrderCount ?? 3;

  const pRestPt = point([primaryOrder.restaurantLng, primaryOrder.restaurantLat]);
  const pCustPt = point([primaryOrder.customerLng, primaryOrder.customerLat]);

  const nearbyOrders = availableOrders.filter((o) => {
    if (o.id === id) return false;
    const oRestPt = point([o.restaurantLng, o.restaurantLat]);
    const oCustPt = point([o.customerLng, o.customerLat]);
    return (
      distance(pRestPt, oRestPt) <= maxKm &&
      (distance(pCustPt, oCustPt) <= maxKm ||
        distance(pRestPt, oCustPt) <= maxKm)
    );
  });

  const toggleOrder = (orderId: string) => {
    if (orderId === id) return;
    const next = new Set(selectedIds);
    if (next.has(orderId)) {
      next.delete(orderId);
    } else {
      if (next.size >= maxCount) return;
      next.add(orderId);
    }
    setSelectedIds(next);
  };

  const handleAccept = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Race against a timeout so the button never hangs forever if Supabase
      // is slow or the connection drops mid-request.
      const success = await Promise.race([
        acceptOrders(Array.from(selectedIds)),
        new Promise<false>((resolve) =>
          setTimeout(() => resolve(false), ACCEPT_TIMEOUT_MS)
        ),
      ]);
      if (success) {
        router.navigate("/(app)/active");
        // isSubmitting stays true until screen loses focus; useFocusEffect
        // resets it if the user navigates back.
      } else {
        setIsSubmitting(false);
      }
    } catch {
      setIsSubmitting(false);
    }
  };

  const selectedList = [
    primaryOrder,
    ...nearbyOrders.filter((o) => selectedIds.has(o.id)),
  ];
  const totalAmount = selectedList.reduce((s, o) => s + o.totalAmount, 0);
  const bounds = computeBounds(selectedList);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#080808" }}
      edges={["top"]}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          disabled={isSubmitting}
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
          <Ionicons name="arrow-back" size={19} color="#a1a1aa" />
        </Pressable>

        <Text
          style={{ color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: -0.3 }}
        >
          Siparişi İncele
        </Text>

        <View
          style={{
            backgroundColor: "rgba(249,115,22,0.12)",
            borderWidth: 1,
            borderColor: "rgba(249,115,22,0.25)",
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 5,
          }}
        >
          <Text style={{ color: "#f97316", fontWeight: "700", fontSize: 13 }}>
            {selectedIds.size}/{maxCount}
          </Text>
        </View>
      </View>

      {/* Map */}
      <View
        style={{
          marginHorizontal: 16,
          height: 210,
          borderRadius: 18,
          overflow: "hidden",
          backgroundColor: "#111",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.07)",
        }}
      >
        {!MapboxGL || isExpoGo ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Ionicons name="map-outline" size={32} color="#27272a" />
            <Text style={{ color: "#3f3f46", fontSize: 12 }}>
              Harita üretim sürümünde görünür
            </Text>
          </View>
        ) : (
          <MapboxGL.MapView
            style={{ flex: 1 }}
            styleURL="mapbox://styles/mapbox/dark-v11"
            logoEnabled={false}
            attributionEnabled={false}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
          >
            {/* Camera fits both restaurant and customer pins */}
            <MapboxGL.Camera
              bounds={{
                ne: bounds.ne,
                sw: bounds.sw,
                paddingTop: 40,
                paddingBottom: 40,
                paddingLeft: 40,
                paddingRight: 40,
              }}
              animationDuration={0}
            />

            {/* Route lines */}
            {selectedList.map((o, i) => (
              <MapboxGL.ShapeSource
                key={`route-${o.id}`}
                id={`route-src-${o.id}`}
                shape={{
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: [
                      [o.restaurantLng, o.restaurantLat],
                      [o.customerLng, o.customerLat],
                    ],
                  },
                  properties: {},
                }}
              >
                <MapboxGL.LineLayer
                  id={`route-line-${o.id}`}
                  style={{
                    lineColor: ORDER_COLORS[i % ORDER_COLORS.length],
                    lineWidth: 2.5,
                    lineOpacity: 0.85,
                    lineDasharray: [2, 1.5],
                  }}
                />
              </MapboxGL.ShapeSource>
            ))}

            {/* Restaurant pins */}
            {selectedList.map((o, i) => (
              <MapboxGL.PointAnnotation
                key={`rest-${o.id}`}
                id={`rest-pin-${o.id}`}
                coordinate={[o.restaurantLng, o.restaurantLat]}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: ORDER_COLORS[i % ORDER_COLORS.length],
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: "#080808",
                  }}
                >
                  <Ionicons name="storefront" size={13} color="white" />
                </View>
              </MapboxGL.PointAnnotation>
            ))}

            {/* Customer pins */}
            {selectedList.map((o, i) => (
              <MapboxGL.PointAnnotation
                key={`cust-${o.id}`}
                id={`cust-pin-${o.id}`}
                coordinate={[o.customerLng, o.customerLat]}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: "#080808",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2.5,
                    borderColor: ORDER_COLORS[i % ORDER_COLORS.length],
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: ORDER_COLORS[i % ORDER_COLORS.length],
                    }}
                  />
                </View>
              </MapboxGL.PointAnnotation>
            ))}
          </MapboxGL.MapView>
        )}
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Primary order card */}
        <View
          style={{
            backgroundColor: "#141414",
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: ORDER_COLORS[0] + "50",
            marginBottom: 16,
          }}
        >
          {/* Restaurant name */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: ORDER_COLORS[0],
              }}
            />
            <Text
              style={{ color: "#fff", fontWeight: "700", fontSize: 15, flex: 1 }}
            >
              {primaryOrder.restaurantName}
            </Text>
          </View>

          {/* Route: pickup → delivery */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
            <View style={{ alignItems: "center", paddingTop: 3 }}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: ORDER_COLORS[0],
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="storefront" size={11} color="white" />
              </View>
              <View
                style={{
                  width: 1,
                  height: 24,
                  backgroundColor: "#2a2a2a",
                  marginVertical: 3,
                }}
              />
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "transparent",
                  borderWidth: 2,
                  borderColor: ORDER_COLORS[0],
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: ORDER_COLORS[0],
                  }}
                />
              </View>
            </View>

            <View style={{ flex: 1, gap: 12 }}>
              <View>
                <Text
                  style={{
                    color: "#3f3f46",
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                  }}
                >
                  Al
                </Text>
                <Text
                  style={{ color: "#e4e4e7", fontSize: 13, fontWeight: "600", marginTop: 2 }}
                >
                  {primaryOrder.restaurantAddress}
                </Text>
              </View>
              <View>
                <Text
                  style={{
                    color: "#3f3f46",
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                  }}
                >
                  Bırak
                </Text>
                <Text
                  style={{ color: "#e4e4e7", fontSize: 13, fontWeight: "600", marginTop: 2 }}
                >
                  {primaryOrder.customerName}
                </Text>
                <Text
                  style={{ color: "#71717a", fontSize: 12, marginTop: 1 }}
                  numberOfLines={1}
                >
                  {primaryOrder.customerAddress}
                </Text>
              </View>
            </View>
          </View>

          {/* Items */}
          <View
            style={{
              backgroundColor: "#0d0d0d",
              borderRadius: 10,
              padding: 10,
              marginBottom: 12,
            }}
          >
            {primaryOrder.items.map((item, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 3,
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 6,
                    backgroundColor: "rgba(249,115,22,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ color: "#f97316", fontSize: 10, fontWeight: "700" }}
                  >
                    {item.quantity}
                  </Text>
                </View>
                <Text style={{ color: "#a1a1aa", fontSize: 12, flex: 1 }}>
                  {item.name}
                </Text>
              </View>
            ))}
          </View>

          {/* Footer: badges + amount */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", gap: 6 }}>
              <View
                style={{
                  backgroundColor: "rgba(249,115,22,0.08)",
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{ color: "#f97316", fontSize: 12, fontWeight: "600" }}
                >
                  {primaryOrder.items.length} ürün
                </Text>
              </View>
              {primaryOrder.preparationTimeMinutes ? (
                <View
                  style={{
                    backgroundColor: "rgba(59,130,246,0.08)",
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{ color: "#60a5fa", fontSize: 12, fontWeight: "600" }}
                  >
                    ~{primaryOrder.preparationTimeMinutes} dk
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={{
                color: ORDER_COLORS[0],
                fontWeight: "800",
                fontSize: 18,
              }}
            >
              ₺{primaryOrder.totalAmount}
            </Text>
          </View>
        </View>

        {/* Nearby / combinable orders */}
        {nearbyOrders.length > 0 && (
          <>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                Birlikte Alınabilir
              </Text>
              <View
                style={{
                  backgroundColor: "rgba(249,115,22,0.08)",
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{
                    color: "#f97316",
                    fontWeight: "700",
                    fontSize: 11,
                  }}
                >
                  {nearbyOrders.length} fırsat
                </Text>
              </View>
            </View>

            <Text
              style={{ color: "#3f3f46", fontSize: 12, marginBottom: 10 }}
            >
              En fazla {maxCount} sipariş seçilebilir · {selectedIds.size}/
              {maxCount} seçili
            </Text>

            {nearbyOrders.map((o, i) => {
              const isSelected = selectedIds.has(o.id);
              const isDisabled = !isSelected && selectedIds.size >= maxCount;
              const color = ORDER_COLORS[(i + 1) % ORDER_COLORS.length];

              return (
                <Pressable
                  key={o.id}
                  onPress={() => toggleOrder(o.id)}
                  disabled={isDisabled}
                  style={{
                    backgroundColor: "#141414",
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 10,
                    borderWidth: 1.5,
                    borderColor: isSelected ? color + "80" : "#1e1e1e",
                    opacity: isDisabled ? 0.4 : 1,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: isSelected ? color : "transparent",
                      borderWidth: 2,
                      borderColor: isSelected ? color : "#2a2a2a",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={13} color="white" />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: 14,
                        marginBottom: 2,
                      }}
                    >
                      {o.restaurantName}
                    </Text>
                    <Text
                      style={{ color: "#52525b", fontSize: 12 }}
                      numberOfLines={1}
                    >
                      {o.customerName} · {o.customerAddress}
                    </Text>
                  </View>

                  <Text
                    style={{
                      color: isSelected ? color : "#3f3f46",
                      fontWeight: "700",
                      fontSize: 14,
                      marginLeft: 12,
                    }}
                  >
                    +₺{o.totalAmount}
                  </Text>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Accept button */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 20,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.05)",
          backgroundColor: "#080808",
        }}
      >
        {selectedIds.size > 1 && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "#52525b", fontSize: 13 }}>
              Toplam ({selectedIds.size} sipariş)
            </Text>
            <Text
              style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}
            >
              ₺{totalAmount.toFixed(0)}
            </Text>
          </View>
        )}

        <Pressable
          onPress={handleAccept}
          disabled={isSubmitting}
          style={{
            height: 54,
            borderRadius: 16,
            backgroundColor: isSubmitting
              ? "rgba(249,115,22,0.5)"
              : "#f97316",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Ionicons name="checkmark-circle" size={20} color="white" />
          )}
          <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
            {isSubmitting
              ? "Kabul ediliyor..."
              : selectedIds.size > 1
              ? `${selectedIds.size} Siparişi Kabul Et`
              : "Siparişi Kabul Et"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
