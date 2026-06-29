import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePosStore, PosConnectionState } from "../store/posStore";

interface Config {
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const STATE_CONFIG: Record<PosConnectionState, Config> = {
  idle:         { label: "POS Yok",       color: "#52525b", icon: "bluetooth-outline" },
  scanning:     { label: "Taranıyor…",    color: "#f59e0b", icon: "bluetooth-outline" },
  connecting:   { label: "Bağlanıyor…",   color: "#f59e0b", icon: "bluetooth-outline" },
  connected:    { label: "POS Bağlı",     color: "#22c55e", icon: "bluetooth" },
  disconnected: { label: "Bağlı Değil",   color: "#ef4444", icon: "bluetooth-outline" },
  error:        { label: "POS Hatası",    color: "#ef4444", icon: "warning-outline" },
};

interface Props {
  onRetry?: () => void;
}

export function PosStatusBadge({ onRetry }: Props) {
  const { connectionState, deviceStatus, connectRetryCount } = usePosStore();
  const cfg = STATE_CONFIG[connectionState];
  const isConnecting = connectionState === "connecting" || connectionState === "scanning";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: `${cfg.color}18`,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: `${cfg.color}35`,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginBottom: 12,
      }}
    >
      {isConnecting ? (
        <ActivityIndicator size="small" color={cfg.color} />
      ) : (
        <Ionicons name={cfg.icon} size={14} color={cfg.color} />
      )}
      <Text style={{ color: cfg.color, fontSize: 12, fontWeight: "600", flex: 1 }}>
        {cfg.label}
        {connectRetryCount > 0 ? ` (Deneme ${connectRetryCount}/3)` : ""}
        {deviceStatus?.batteryLevel !== undefined && connectionState === "connected"
          ? ` — Pil %${deviceStatus.batteryLevel}`
          : ""}
      </Text>
      {(connectionState === "disconnected" || connectionState === "error") && onRetry && (
        <Pressable onPress={onRetry}>
          <Text
            style={{
              color: cfg.color,
              fontSize: 11,
              fontWeight: "700",
              textDecorationLine: "underline",
            }}
          >
            Yeniden Bağlan
          </Text>
        </Pressable>
      )}
    </View>
  );
}
