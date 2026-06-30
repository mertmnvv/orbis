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
import { Ionicons } from "@expo/vector-icons";

function OrbisIcon({ size = 72 }: { size?: number }) {
  const sc = size / 100;
  const c = size / 2;
  const outerR = 42 * sc;
  const innerR = 24 * sc;
  const sw = 5.5 * sc;
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
  const { signIn } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const validateEmail = (text: string) => {
    const reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    return reg.test(text.trim());
  };

  const handleLogin = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setError("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }
    if (!password) {
      setError("Lütfen şifrenizi girin.");
      return;
    }

    setError(null);
    setLoading(true);
    const { error: err } = await signIn(cleanEmail, password);
    setLoading(false);
    
    if (err) {
      setError(err.message || "Giriş başarısız. Bilgilerinizi kontrol edin.");
    }
  };

  const isFormValid = email.trim().length > 0 && password.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#080808" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, paddingHorizontal: 24 }}>

          {/* Logo + Branding */}
          <View style={{ alignItems: "center", marginTop: 60, marginBottom: 40 }}>
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

          {/* Form */}
          <View style={{ gap: 18 }}>
            {/* Email Input */}
            <View>
              <Text style={{
                color: "#52525b",
                fontSize: 10,
                fontWeight: "700",
                marginBottom: 8,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}>
                E-posta Adresi
              </Text>
              <View style={{
                flexDirection: "row",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.07)",
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.03)",
                overflow: "hidden",
                alignItems: "center",
                height: 56,
              }}>
                <View style={{ paddingHorizontal: 16 }}>
                  <Ionicons name="mail-outline" size={18} color="#52525b" />
                </View>
                <TextInput
                  ref={emailInputRef}
                  style={{
                    flex: 1,
                    color: "#ffffff",
                    fontSize: 16,
                    fontWeight: "500",
                    height: "100%",
                  }}
                  placeholder="ornek@orbis.com"
                  placeholderTextColor="#2a2a2a"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(t) => {
                    setError(null);
                    setEmail(t);
                  }}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
              </View>
            </View>

            {/* Password Input */}
            <View>
              <Text style={{
                color: "#52525b",
                fontSize: 10,
                fontWeight: "700",
                marginBottom: 8,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}>
                Şifre
              </Text>
              <View style={{
                flexDirection: "row",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.07)",
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.03)",
                overflow: "hidden",
                alignItems: "center",
                height: 56,
              }}>
                <View style={{ paddingHorizontal: 16 }}>
                  <Ionicons name="key-outline" size={18} color="#52525b" />
                </View>
                <TextInput
                  ref={passwordInputRef}
                  style={{
                    flex: 1,
                    color: "#ffffff",
                    fontSize: 16,
                    fontWeight: "500",
                    height: "100%",
                  }}
                  placeholder="••••••••"
                  placeholderTextColor="#2a2a2a"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={(t) => {
                    setError(null);
                    setPassword(t);
                  }}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ paddingHorizontal: 16, height: "100%", justifyContent: "center" }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#52525b"
                  />
                </Pressable>
              </View>
            </View>

            {error && (
              <View style={{
                backgroundColor: "rgba(239,68,68,0.08)",
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.2)",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}>
                <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                <Text style={{ color: "#ef4444", fontSize: 13, flex: 1 }}>{error}</Text>
              </View>
            )}
          </View>

          {/* Bottom */}
          <View style={{ marginTop: "auto", paddingBottom: 32 }}>
            <Pressable
              onPress={handleLogin}
              disabled={loading || !isFormValid}
              style={{
                borderRadius: 16,
                height: 56,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isFormValid ? "#f97316" : "rgba(255,255,255,0.04)",
                borderWidth: isFormValid ? 0 : 1,
                borderColor: "rgba(255,255,255,0.07)",
                shadowColor: "#f97316",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: isFormValid ? 0.28 : 0,
                shadowRadius: 20,
                elevation: isFormValid ? 5 : 0,
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{
                  color: isFormValid ? "#ffffff" : "#3f3f46",
                  fontWeight: "700",
                  fontSize: 16,
                  letterSpacing: 0.2,
                }}>
                  Giriş Yap
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
