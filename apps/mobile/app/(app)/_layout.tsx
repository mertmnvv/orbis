import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { useOrderStore } from "../../store/orderStore";
import { useAuthStore } from "../../store/authStore";

export default function AppLayout() {
  useLocationTracking();
  const activeOrders = useOrderStore((s) => s.activeOrders);
  const hasActive = activeOrders && activeOrders.length > 0;
  const isActive = useAuthStore((s) => s.isActive);
  const signOut = useAuthStore((s) => s.signOut);

  if (!isActive) {
    return (
      <View style={{ flex: 1, backgroundColor: "#080808", justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          backgroundColor: "rgba(239,68,68,0.08)",
          borderWidth: 1,
          borderColor: "rgba(239,68,68,0.2)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}>
          <Ionicons name="lock-closed-outline" size={34} color="#ef4444" />
        </View>
        <Text style={{ color: "#ffffff", fontSize: 19, fontWeight: "700", textAlign: "center", marginBottom: 8 }}>
          Hesabınız Askıya Alındı
        </Text>
        <Text style={{ color: "#71717a", fontSize: 13, textAlign: "center", lineHeight: 18, marginBottom: 32 }}>
          Yönetici tarafından hesabınız devre dışı bırakılmıştır. Lütfen restoran yönetimi veya destek ekibi ile iletişime geçiniz.
        </Text>
        <Pressable
          onPress={() => {
            Alert.alert(
              'Çıkış Yap',
              'Çıkış yapmak istediğinize emin misiniz?',
              [
                { text: 'İptal', style: 'cancel' },
                { text: 'Çıkış Yap', style: 'destructive', onPress: signOut },
              ],
            );
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: "rgba(255,255,255,0.04)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.07)",
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <Ionicons name="log-out-outline" size={17} color="#a1a1aa" />
          <Text style={{ color: "#a1a1aa", fontSize: 13, fontWeight: "600" }}>
            Çıkış Yap
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#f97316",
        tabBarInactiveTintColor: "#3f3f46",
        tabBarStyle: {
          borderTopColor: "rgba(255,255,255,0.06)",
          borderTopWidth: 1,
          paddingTop: 6,
          height: 64,
          backgroundColor: "#0d0d0d",
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.3,
          marginBottom: 6,
        },
      }}
    >
      <Tabs.Screen
        name="accept/[id]"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: "Siparişler",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "receipt" : "receipt-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="active"
        options={{
          title: "Aktif",
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons
                name={focused ? "flash" : "flash-outline"}
                size={22}
                color={color}
              />
              {hasActive && (
                <View
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -5,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#f97316",
                    borderWidth: 1.5,
                    borderColor: "#0d0d0d",
                  }}
                />
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "Harita",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "navigate" : "navigate-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "Geçmiş",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "time" : "time-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
