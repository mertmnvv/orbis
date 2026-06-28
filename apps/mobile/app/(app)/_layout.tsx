import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { useOrderStore } from "../../store/orderStore";

export default function AppLayout() {
  useLocationTracking();
  const activeOrder = useOrderStore((s) => s.activeOrder);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#f97316",
        tabBarInactiveTintColor: "#52525b",
        tabBarStyle: {
          borderTopColor: "#2a2a2a",
          borderTopWidth: 1,
          paddingTop: 4,
          height: 60,
          backgroundColor: "#141414",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Siparişler",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="active"
        options={{
          title: "Aktif",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bicycle-outline" size={size} color={color} />
          ),
          tabBarBadge: activeOrder ? "●" : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#f97316",
            color: "#f97316",
            fontSize: 6,
            minWidth: 10,
            height: 10,
            borderRadius: 5,
          },
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Harita",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Geçmiş",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
