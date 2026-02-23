import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useColorScheme,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsive } from "@/hooks/useResponsive";
import { useAuth } from "@/lib/auth-context";
import Colors from "@/constants/colors";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

export default function ResponsiveTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { showSidebar } = useResponsive();
  const { user, organization } = useAuth();

  if (!showSidebar) {
    return (
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const color = isFocused ? theme.tint : theme.tabIconDefault;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                if (!isFocused) {
                  navigation.navigate(route.name);
                }
              }}
              style={styles.bottomTab}
            >
              {options.tabBarIcon?.({ color, size: 22, focused: isFocused })}
              <Text
                style={[
                  styles.bottomLabel,
                  { color, fontFamily: isFocused ? "Inter_600SemiBold" : "Inter_500Medium" },
                ]}
              >
                {options.title || route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor: theme.surface,
          borderRightColor: theme.border,
          paddingTop: Platform.OS === "web" ? 20 : insets.top,
        },
      ]}
    >
      <View style={styles.sidebarHeader}>
        <View style={[styles.sidebarLogo, { backgroundColor: theme.tint }]}>
          <Ionicons name="construct" size={20} color="#FFF" />
        </View>
        <Text style={[styles.sidebarTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
          {organization?.name || "EZ Field Task"}
        </Text>
      </View>

      {user && (
        <View style={[styles.sidebarUser, { borderBottomColor: theme.border }]}>
          <View style={[styles.sidebarAvatar, { backgroundColor: theme.tint + "20" }]}>
            <Text style={[styles.sidebarAvatarText, { color: theme.tint, fontFamily: "Inter_700Bold" }]}>
              {user.fullName?.charAt(0)?.toUpperCase() || "?"}
            </Text>
          </View>
          <View style={styles.sidebarUserInfo}>
            <Text style={[styles.sidebarUserName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
              {user.fullName}
            </Text>
            <Text style={[styles.sidebarUserRole, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
            </Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.sidebarNav} showsVerticalScrollIndicator={false}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const color = isFocused ? theme.tint : theme.textSecondary;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                if (!isFocused) {
                  navigation.navigate(route.name);
                }
              }}
              style={[
                styles.sidebarItem,
                isFocused && { backgroundColor: theme.tint + "12" },
              ]}
            >
              {options.tabBarIcon?.({ color, size: 20, focused: isFocused })}
              <Text
                style={[
                  styles.sidebarLabel,
                  {
                    color,
                    fontFamily: isFocused ? "Inter_600SemiBold" : "Inter_500Medium",
                  },
                ]}
              >
                {options.title || route.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.sidebarFooter, { borderTopColor: theme.border }]}>
        <Text style={[styles.sidebarFooterText, { color: theme.tabIconDefault, fontFamily: "Inter_400Regular" }]}>
          EZ Field Task
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 8,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 4,
  },
  bottomLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  sidebarLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sidebarTitle: {
    fontSize: 16,
    flex: 1,
  },
  sidebarUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingBottom: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  sidebarAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  sidebarAvatarText: {
    fontSize: 15,
  },
  sidebarUserInfo: {
    flex: 1,
  },
  sidebarUserName: {
    fontSize: 13,
  },
  sidebarUserRole: {
    fontSize: 11,
    textTransform: "capitalize",
  },
  sidebarNav: {
    flex: 1,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  sidebarLabel: {
    fontSize: 14,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  sidebarFooterText: {
    fontSize: 11,
    textAlign: "center",
  },
});
