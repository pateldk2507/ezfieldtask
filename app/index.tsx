import React, { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import Colors from "@/constants/colors";

export default function IndexScreen() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/(auth)/login");
      return;
    }

    switch (user.role) {
      case "technician":
        router.replace("/(technician)");
        break;
      case "scheduler":
        router.replace("/(scheduler)");
        break;
      case "sales":
        router.replace("/(sales)");
        break;
      case "admin":
        router.replace("/(admin)");
        break;
      default:
        router.replace("/(auth)/login");
    }
  }, [user, isLoading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.light.tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.background,
  },
});
