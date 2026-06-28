import { useRef, useState } from "react";
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

function OrbisIcon({ size = 72 }: { size?: number }) {
  const sc = size / 100;
  const c = size / 2;
  const outerR = 42 * sc;
  const innerR = 24 * sc;
  const sw = 5.5 * sc;
  // Diagonal: (17,76)→(70,23) in 100×100 space → exactly -45°, length=53√2
  const lineLen = Math.sqrt(2) * 53 * sc;
  const lineSw = 6 * sc;
  const lineCx = 43.5 * sc;
  const lineCy = 49.5 * sc;
  const pinR = 6.5 * sc;

  return (
    <View style={{ width: size, height: size }}>
      {/* Outer ring */}
      <View style={{
        position: "absolute",
        width: outerR * 2, height: outerR * 2,
        borderRadius: outerR,
        borderWidth: sw, borderColor: "#f97316",
        left: c - outerR, top: c - outerR,
      }} />
      {/* Inner ring */}
      <View style={{
        position: "absolute",
        width: innerR * 2, height: innerR * 2,
        borderRadius: innerR,
        borderWidth: sw * 0.9, borderColor: "#f97316",
        left: c - innerR, top: c - innerR,
      }} />
      {/* Diagonal line (rotated rectangle, exactly -45°) */}
      <View style={{
        position: "absolute",
        width: lineLen, height: lineSw,
        backgroundColor: "#f97316",
        borderRadius: lineSw / 2,
        left: lineCx - lineLen / 2,
        top: lineCy - lineSw / 2,
        transform: [{ rotate: "-45deg" }],
      }} />
      {/* Location pin circle */}
      <View style={{
        position: "absolute",
        width: pinR * 2, height: pinR * 2,
        borderRadius: pinR,
        backgroundColor: "#f97316",
        left: 73 * sc - pinR,
        top: 20 * sc - pinR,
      }} />
    </View>
  );
}

export default function LoginScreen() {
  const { phone, setPhone, otpSent, sendOtp, verifyOtp } = useAuthStore();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpInputRef = useRef<TextInput>(null);

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

  const handleOtpChange = (val: string) => {
    setError(null);
    const cleaned = val.replace(/\D/g, "").slice(0, 6);
    setOtp(cleaned);
    if (cleaned.length === 6) handleVerifyAuto(cleaned);
  };

  const handleVerifyAuto = async (code: string) => {
    setError(null);
    setLoading(true);
    const { error: err } = await verifyOtp(phone, code);
    setLoading(false);
    if (err) setError(err.message);
  };

  if (otpSent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#080808" }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, paddingHorizontal: 24 }}>
            {/* Back button */}
            <Pressable
              onPress={() => {
                setOtp("");
                setError(null);
                useAuthStore.setState({ otpSent: false });
              }}
              style={{
                marginTop: 16,
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.05)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#a1a1aa", fontSize: 18 }}>←</Text>
            </Pressable>

            {/* Title */}
            <View style={{ marginTop: 40, marginBottom: 40 }}>
              <Text style={{ color: "#ffffff", fontSize: 28, fontWeight: "800", marginBottom: 12, letterSpacing: -0.5 }}>
                Kodu girin
              </Text>
              {__DEV__ ? (
                <View style={{
                  backgroundColor: "rgba(249,115,22,0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(249,115,22,0.2)",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}>
                  <Text style={{ fontSize: 13 }}>🛠</Text>
                  <Text style={{ color: "#f97316", fontSize: 13, fontWeight: "600" }}>
                    Dev modu — <Text style={{ fontWeight: "800" }}>000000</Text> kodunu gir
                  </Text>
                </View>
              ) : (
                <Text style={{ color: "#52525b", fontSize: 15, lineHeight: 22 }}>
                  <Text style={{ color: "#a1a1aa", fontWeight: "600" }}>+90 {phone}</Text>
                  {" "}numarasına gönderilen{"\n"}6 haneli kodu girin.
                </Text>
              )}
            </View>

            {/* OTP boxes */}
            <Pressable onPress={() => otpInputRef.current?.focus()}>
              <View style={{ flexDirection: "row", gap: 10, justifyContent: "center", marginBottom: 16 }}>
                {Array.from({ length: 6 }).map((_, i) => {
                  const char = otp[i];
                  const isFocused = otp.length === i;
                  return (
                    <View
                      key={i}
                      style={{
                        width: 48,
                        height: 58,
                        borderRadius: 14,
                        borderWidth: char || isFocused ? 1.5 : 1,
                        borderColor: char
                          ? "#f97316"
                          : isFocused
                          ? "rgba(249,115,22,0.5)"
                          : "rgba(255,255,255,0.07)",
                        backgroundColor: char
                          ? "rgba(249,115,22,0.07)"
                          : "rgba(255,255,255,0.03)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {char ? (
                        <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "700" }}>{char}</Text>
                      ) : isFocused ? (
                        <View style={{ width: 2, height: 22, backgroundColor: "#f97316", borderRadius: 1 }} />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </Pressable>

            {/* Hidden real input */}
            <TextInput
              ref={otpInputRef}
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
            />

            {/* Error */}
            {error && (
              <View style={{
                backgroundColor: "rgba(239,68,68,0.08)",
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.2)",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 10,
                marginBottom: 12,
              }}>
                <Text style={{ color: "#ef4444", fontSize: 13, textAlign: "center" }}>{error}</Text>
              </View>
            )}

            {/* Bottom actions */}
            <View style={{ marginTop: "auto", paddingBottom: 32 }}>
              <Pressable
                onPress={handleVerify}
                disabled={loading || otp.length !== 6}
                style={{
                  borderRadius: 16,
                  height: 56,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: otp.length === 6 ? "#f97316" : "rgba(255,255,255,0.04)",
                  borderWidth: otp.length === 6 ? 0 : 1,
                  borderColor: "rgba(255,255,255,0.07)",
                  shadowColor: "#f97316",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: otp.length === 6 ? 0.25 : 0,
                  shadowRadius: 16,
                  elevation: otp.length === 6 ? 4 : 0,
                }}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{
                    color: otp.length === 6 ? "#ffffff" : "#3f3f46",
                    fontWeight: "700",
                    fontSize: 16,
                    letterSpacing: 0.2,
                  }}>
                    Doğrula
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  setOtp("");
                  setError(null);
                  useAuthStore.setState({ otpSent: false });
                }}
                style={{ marginTop: 16, alignItems: "center" }}
              >
                <Text style={{ color: "#f97316", fontSize: 14, fontWeight: "600" }}>
                  Farklı numara kullan
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#080808" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, paddingHorizontal: 24 }}>

          {/* Logo + Branding */}
          <View style={{ alignItems: "center", marginTop: 72, marginBottom: 52 }}>
            {/* Glow ring */}
            <View style={{
              position: "absolute",
              top: -16,
              width: 144,
              height: 144,
              borderRadius: 72,
              backgroundColor: "#f97316",
              opacity: 0.10,
            }} />
            <View style={{
              position: "absolute",
              top: 4,
              width: 108,
              height: 108,
              borderRadius: 54,
              backgroundColor: "#f97316",
              opacity: 0.06,
            }} />

            <OrbisIcon size={76} />

            <Text style={{
              color: "#ffffff",
              fontSize: 30,
              fontWeight: "800",
              letterSpacing: -0.5,
              marginTop: 20,
            }}>
              Orbis Kurye
            </Text>
            <Text style={{
              color: "#3f3f46",
              fontSize: 12,
              marginTop: 6,
              letterSpacing: 2,
              textTransform: "uppercase",
              fontWeight: "600",
            }}>
              Kurye Yönetim Platformu
            </Text>
          </View>

          {/* Phone Form */}
          <View>
            <Text style={{
              color: "#52525b",
              fontSize: 10,
              fontWeight: "700",
              marginBottom: 10,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}>
              Telefon Numarası
            </Text>

            <View style={{
              flexDirection: "row",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.07)",
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.03)",
              overflow: "hidden",
              height: 56,
            }}>
              <View style={{
                paddingHorizontal: 16,
                borderRightWidth: 1,
                borderRightColor: "rgba(255,255,255,0.06)",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.02)",
              }}>
                <Text style={{ color: "#52525b", fontWeight: "700", fontSize: 15 }}>+90</Text>
              </View>
              <TextInput
                style={{
                  flex: 1,
                  paddingHorizontal: 16,
                  color: "#ffffff",
                  fontSize: 17,
                  fontWeight: "500",
                }}
                placeholder="5XX XXX XX XX"
                placeholderTextColor="#2a2a2a"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(t) => {
                  setError(null);
                  setPhone(t.replace(/\D/g, "").slice(0, 10));
                }}
                maxLength={10}
              />
              {phone.length > 0 && (
                <Pressable
                  onPress={() => { setPhone(""); setError(null); }}
                  style={{ paddingHorizontal: 16, alignItems: "center", justifyContent: "center" }}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: "rgba(255,255,255,0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Text style={{ color: "#52525b", fontSize: 11, lineHeight: 20 }}>✕</Text>
                  </View>
                </Pressable>
              )}
            </View>

            {error && (
              <View style={{
                marginTop: 10,
                backgroundColor: "rgba(239,68,68,0.08)",
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.2)",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}>
                <Text style={{ color: "#ef4444", fontSize: 13 }}>{error}</Text>
              </View>
            )}
          </View>

          {/* Bottom */}
          <View style={{ marginTop: "auto", paddingBottom: 32 }}>
            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.05)" }} />
              <Text style={{ color: "#2a2a2a", fontSize: 10, fontWeight: "600", letterSpacing: 1 }}>
                DEVAM
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.05)" }} />
            </View>

            <Pressable
              onPress={handleSendOtp}
              disabled={loading || phone.length < 10}
              style={{
                borderRadius: 16,
                height: 56,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: phone.length >= 10 ? "#f97316" : "rgba(255,255,255,0.04)",
                borderWidth: phone.length >= 10 ? 0 : 1,
                borderColor: "rgba(255,255,255,0.07)",
                shadowColor: "#f97316",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: phone.length >= 10 ? 0.28 : 0,
                shadowRadius: 20,
                elevation: phone.length >= 10 ? 5 : 0,
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{
                  color: phone.length >= 10 ? "#ffffff" : "#3f3f46",
                  fontWeight: "700",
                  fontSize: 16,
                  letterSpacing: 0.2,
                }}>
                  Devam Et
                </Text>
              )}
            </Pressable>

            <Text style={{
              color: "#2a2a2a",
              fontSize: 11,
              textAlign: "center",
              marginTop: 20,
              lineHeight: 18,
              letterSpacing: 0.2,
            }}>
              Devam ederek Kullanım Koşulları ve{"\n"}Gizlilik Politikası'nı kabul etmiş olursunuz.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
