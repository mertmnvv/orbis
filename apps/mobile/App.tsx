import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold">Orbis Courier</Text>
      <Text className="text-gray-500">Scaffolding ready.</Text>
      <StatusBar style="auto" />
    </View>
  );
}
