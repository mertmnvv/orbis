import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/authStore";

export default function LoginScreen() {
  const { phone, setPhone, otpSent, sendOtp, verifyOtp } = useAuthStore();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    if (phone.length < 10) {
      setError("Geçerli bir telefon numarası girin.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await sendOtp(phone);
    setLoading(false);
    if (err) setError(err.message);
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("6 haneli kodu girin.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await verifyOtp(phone, otp);
    setLoading(false);
    if (err) setError(err.message);
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-base">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-12">
          {/* Logo */}
          <View className="items-center mb-12">
            <View className="w-20 h-20 rounded-3xl overflow-hidden items-center justify-center mb-5"
              style={{ shadowColor: "#f97316", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 }}>
              <Image source={require("../../assets/images/logo-icon.png")} className="w-20 h-20" resizeMode="cover" />
            </View>
            <Text className="text-3xl font-bold text-mtext-primary">Orbis Kurye</Text>
            <Text className="text-mtext-secondary mt-2 text-base text-center">
              {otpSent ? "Doğrulama kodunu girin" : "Giriş yapmak için numaranızı girin"}
            </Text>
          </View>

          {/* Card */}
          <View className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
            {!otpSent ? (
              <View>
                <Text className="text-mtext-secondary font-semibold mb-2 text-sm">Telefon Numarası</Text>
                <View className="flex-row items-center border border-dark-border rounded-xl bg-dark-elevated overflow-hidden">
                  <View className="px-4 py-4 border-r border-dark-border">
                    <Text className="text-mtext-secondary font-semibold">+90</Text>
                  </View>
                  <TextInput
                    style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 16, color: "#ffffff", fontSize: 16 }}
                    placeholder="5XX XXX XX XX"
                    placeholderTextColor="#52525b"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={(t) => {
                      setError(null);
                      setPhone(t.replace(/\D/g, "").slice(0, 10));
                    }}
                    maxLength={10}
                  />
                </View>

                {error && (
                  <View className="mt-3 bg-danger/10 border border-danger/20 rounded-xl px-4 py-2.5">
                    <Text className="text-danger text-sm">{error}</Text>
                  </View>
                )}

                <Pressable
                  onPress={handleSendOtp}
                  disabled={loading}
                  className="mt-5 bg-accent rounded-xl py-4 items-center active:opacity-80"
                  style={{ shadowColor: "#f97316", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 }}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Kod Gönder</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <View>
                <Text className="text-mtext-secondary font-semibold mb-1 text-sm">Doğrulama Kodu</Text>
                <Text className="text-mtext-muted text-sm mb-4">
                  +90 {phone} numarasına SMS gönderildi.
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: "#2a2a2a",
                    borderRadius: 12,
                    backgroundColor: "#1e1e1e",
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                    color: "#ffffff",
                    fontSize: 24,
                    letterSpacing: 8,
                    textAlign: "center",
                  }}
                  placeholder="• • • • • •"
                  placeholderTextColor="#52525b"
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={(t) => {
                    setError(null);
                    setOtp(t.replace(/\D/g, "").slice(0, 6));
                  }}
                  maxLength={6}
                  autoFocus
                />

                {error && (
                  <View className="mt-3 bg-danger/10 border border-danger/20 rounded-xl px-4 py-2.5">
                    <Text className="text-danger text-sm text-center">{error}</Text>
                  </View>
                )}

                <Pressable
                  onPress={handleVerify}
                  disabled={loading}
                  className="mt-5 bg-accent rounded-xl py-4 items-center active:opacity-80"
                  style={{ shadowColor: "#f97316", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 }}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Doğrula</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => {
                    setOtp("");
                    setError(null);
                    useAuthStore.setState({ otpSent: false });
                  }}
                  className="mt-4 py-2 items-center"
                >
                  <Text className="text-accent font-semibold text-sm">Farklı numara kullan</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        <View className="px-6 pb-8">
          <Text className="text-mtext-muted text-xs text-center">
            Giriş yaparak Kullanım Koşulları'nı kabul etmiş olursunuz.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
