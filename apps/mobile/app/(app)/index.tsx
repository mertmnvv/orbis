import { Ionicons } from "@expo/vector-icons";
import distance from "@turf/distance";
import { point } from "@turf/helpers";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OfflineIndicator } from "../../components/OfflineIndicator";
import { OrderCard } from "../../components/OrderCard";
import { useAuthStore } from "../../store/authStore";
import { useOrderStore } from "../../store/orderStore";
import { supabase } from "../../lib/supabase";
import { Order } from "../../types";

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
  const { user, signOut, isAvailable, toggleAvailability, restaurantId } = useAuthStore();
  const { availableOrders, isLoadingOrders, activeOrders, fetchAvailableOrders, acceptOrder, rejectOrder } =
    useOrderStore();

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

  const handleAccept = (orderId: string) => {
    router.navigate(`/(app)/accept/${orderId}`);
  };

  const phoneDisplay = (() => {
    if (!user?.phone) return 'Kurye';
    const digits = user.phone.replace(/\D/g, '');
    const local = digits.startsWith('90') ? digits.slice(2) : digits;
    if (local.length !== 10) return user.phone;
    return `+90 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#080808" }} edges={["top"]}>
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
            <Text style={{ color: "#3f3f46", fontSize: 11, fontWeight: "600", letterSpacing: 0.5 }}>
              HOŞ GELDİN
            </Text>
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700", marginTop: 1 }}>
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

      {/* Active order banner */}
      {activeOrders && activeOrders.length > 0 && (
        <Pressable
          onPress={() => router.navigate("/(app)/active")}
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            backgroundColor: "rgba(249,115,22,0.07)",
            borderWidth: 1,
            borderColor: "rgba(249,115,22,0.2)",
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderLeftWidth: 3,
            borderLeftColor: "#f97316",
          }}
        >
          <View style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: "rgba(249,115,22,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Ionicons name="flash" size={17} color="#f97316" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#f97316", fontWeight: "700", fontSize: 13 }}>
              {activeOrders.length} Aktif Sipariş Devam Ediyor
            </Text>
            <Text style={{ color: "#52525b", fontSize: 11, marginTop: 2 }}>
              Siparişleri görüntülemek için dokun
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color="rgba(249,115,22,0.6)" />
        </Pressable>
      )}

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
      ) : (
        <>
          {/* Section title */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            marginBottom: 10,
          }}>
            <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15, letterSpacing: -0.2 }}>
              Bekleyen Siparişler
            </Text>
            {availableOrders.length > 0 && (
              <View style={{
                backgroundColor: "rgba(249,115,22,0.12)",
                borderWidth: 1,
                borderColor: "rgba(249,115,22,0.25)",
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 3,
              }}>
                <Text style={{ color: "#f97316", fontWeight: "700", fontSize: 11 }}>
                  {availableOrders.length}
                </Text>
              </View>
            )}
          </View>

          {/* Order list */}
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
      )}
    </SafeAreaView>
  );
}
