import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { useResponsive } from "@/hooks/useResponsive";

interface Props {
  children: React.ReactNode;
  maxWidth?: number;
  center?: boolean;
  style?: any;
}

export default function ResponsiveLayout({ children, maxWidth, center, style }: Props) {
  const { showSidebar, contentMaxWidth } = useResponsive();
  const effectiveMaxWidth = maxWidth || contentMaxWidth;

  if (Platform.OS !== "web" || !effectiveMaxWidth) {
    return <View style={[styles.container, style]}>{children}</View>;
  }

  return (
    <View style={[styles.container, center && styles.center, style]}>
      <View style={[styles.inner, { maxWidth: effectiveMaxWidth }]}>
        {children}
      </View>
    </View>
  );
}

export function useContentStyle() {
  const { showSidebar, isDesktop, isWeb } = useResponsive();

  return {
    topPadding: isWeb ? (showSidebar ? 24 : 67) : 12,
    bottomPadding: isWeb ? (showSidebar ? 24 : 34) : 20,
    tabBarBottomPadding: isWeb ? (showSidebar ? 0 : 84) : 80,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: "center",
  },
  inner: {
    width: "100%",
    alignSelf: "center",
  },
});
