import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiGet } from "@/lib/api";
import Colors from "@/constants/colors";

export default function SalesDashboard() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: () => apiGet<any>("/api/dashboard/stats"),
  });

  const statusCounts = stats?.statusCounts || {};
  const statuses = stats?.statuses || [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) + 80,
      }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={theme.tint} />}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.headerSection}>
        <Text style={[styles.greeting, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Welcome back,
        </Text>
        <Text style={[styles.userName, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          {user?.fullName || "Sales"}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.tint} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.statCards}>
            <View style={[styles.statCard, { backgroundColor: theme.tint }]}>
              <Ionicons name="briefcase" size={24} color="#FFF" />
              <Text style={[styles.statNumber, { color: "#FFF", fontFamily: "Inter_700Bold" }]}>
                {stats?.totalTasks || 0}
              </Text>
              <Text style={[styles.statLabel, { color: "rgba(255,255,255,0.8)", fontFamily: "Inter_500Medium" }]}>
                Total Tasks
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: Colors.urgency.low }]}>
              <Ionicons name="today" size={24} color="#FFF" />
              <Text style={[styles.statNumber, { color: "#FFF", fontFamily: "Inter_700Bold" }]}>
                {stats?.todayTasks || 0}
              </Text>
              <Text style={[styles.statLabel, { color: "rgba(255,255,255,0.8)", fontFamily: "Inter_500Medium" }]}>
                Today
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            STATUS BREAKDOWN
          </Text>

          <View style={[styles.breakdownCard, { backgroundColor: theme.surface }]}>
            {statuses.map((status: any) => {
              const count = statusCounts[status.name] || 0;
              const total = stats?.totalTasks || 1;
              const pct = Math.round((count / total) * 100) || 0;
              return (
                <View key={status.id} style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                    <Text style={[styles.breakdownLabel, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                      {status.name}
                    </Text>
                  </View>
                  <View style={styles.breakdownRight}>
                    <View style={[styles.barContainer, { backgroundColor: theme.surfaceSecondary }]}>
                      <View
                        style={[
                          styles.barFill,
                          { backgroundColor: status.color, width: `${pct}%` },
                        ]}
                      />
                    </View>
                    <Text style={[styles.breakdownCount, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                      {count}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSection: { paddingHorizontal: 20, marginBottom: 24 },
  greeting: { fontSize: 14 },
  userName: { fontSize: 28 },
  statCards: { flexDirection: "row", paddingHorizontal: 16, gap: 12, marginBottom: 28 },
  statCard: { flex: 1, borderRadius: 16, padding: 20, gap: 8, alignItems: "flex-start" },
  statNumber: { fontSize: 32 },
  statLabel: { fontSize: 13 },
  sectionTitle: { fontSize: 12, textTransform: "uppercase" as const, letterSpacing: 1, paddingHorizontal: 20, marginBottom: 10 },
  breakdownCard: { marginHorizontal: 16, borderRadius: 16, padding: 16, gap: 14 },
  breakdownRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  breakdownLeft: { flexDirection: "row", alignItems: "center", gap: 10, width: 100 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: { fontSize: 14 },
  breakdownRight: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, marginLeft: 10 },
  barContainer: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  breakdownCount: { fontSize: 14, width: 30, textAlign: "right" as const },
});
