import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
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
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-12">
          {/* Logo area */}
          <View className="items-center mb-10">
            <View className="w-20 h-20 rounded-3xl bg-orange-500 items-center justify-center mb-4">
              <Ionicons name="bicycle" size={40} color="white" />
            </View>
            <Text className="text-3xl font-bold text-gray-900">Orbis Kurye</Text>
            <Text className="text-gray-500 mt-1 text-base">
              {otpSent ? "Doğrulama kodunu girin" : "Giriş yapmak için numaranızı girin"}
            </Text>
          </View>

          {/* Phone input */}
          {!otpSent ? (
            <View>
              <Text className="text-gray-700 font-semibold mb-2 text-sm">Telefon Numarası</Text>
              <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                <View className="px-3 py-4 bg-gray-100 border-r border-gray-200">
                  <Text className="text-gray-700 font-semibold">+90</Text>
                </View>
                <TextInput
                  className="flex-1 px-3 py-4 text-gray-900 text-base"
                  placeholder="5XX XXX XX XX"
                  placeholderTextColor="#9ca3af"
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
                <Text className="text-red-500 text-sm mt-2">{error}</Text>
              )}

              <Pressable
                onPress={handleSendOtp}
                disabled={loading}
                className="mt-5 bg-orange-500 rounded-xl py-4 items-center active:bg-orange-600"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">Kod Gönder</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View>
              <Text className="text-gray-700 font-semibold mb-2 text-sm">Doğrulama Kodu</Text>
              <Text className="text-gray-500 text-sm mb-3">
                +90 {phone} numarasına SMS gönderildi.
              </Text>
              <TextInput
                className="border border-gray-200 rounded-xl bg-gray-50 px-4 py-4 text-gray-900 text-2xl tracking-widest text-center"
                placeholder="• • • • • •"
                placeholderTextColor="#9ca3af"
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
                <Text className="text-red-500 text-sm mt-2 text-center">{error}</Text>
              )}

              <Pressable
                onPress={handleVerify}
                disabled={loading}
                className="mt-5 bg-orange-500 rounded-xl py-4 items-center active:bg-orange-600"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">Doğrula</Text>
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
                <Text className="text-orange-500 font-semibold text-sm">
                  Farklı numara kullan
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Footer note */}
        <View className="px-6 pb-8">
          <Text className="text-gray-400 text-xs text-center">
            Giriş yaparak Kullanım Koşulları'nı kabul etmiş olursunuz.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
