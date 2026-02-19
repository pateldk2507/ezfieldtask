import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  useColorScheme,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiGet } from "@/lib/api";
import TaskCard from "@/components/TaskCard";
import Colors from "@/constants/colors";

type TabKey = "new" | "pending" | "completed";

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const [activeTab, setActiveTab] = useState<TabKey>("new");

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: () => apiGet<any[]>("/api/tasks"),
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ["/api/task-statuses"],
    queryFn: () => apiGet<any[]>("/api/task-statuses"),
  });

  const getStatusMap = useCallback(() => {
    const map: Record<string, { name: string; color: string }> = {};
    statuses.forEach((s: any) => {
      map[s.id] = { name: s.name, color: s.color };
    });
    return map;
  }, [statuses]);

  const statusMap = getStatusMap();
  const today = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((t: any) => t.scheduledDate === today);

  const filterTasks = useCallback(
    (tab: TabKey) => {
      const statusName =
        tab === "new" ? "New" : tab === "pending" ? "Pending" : "Completed";
      const matchStatus = statuses.find(
        (s: any) => s.name.toLowerCase() === statusName.toLowerCase()
      );
      if (!matchStatus) return tasks;
      return tasks.filter((t: any) => t.statusId === matchStatus.id);
    },
    [tasks, statuses]
  );

  const filteredTasks = filterTasks(activeTab);

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: "new", label: "New", icon: "flash-outline" },
    { key: "pending", label: "Pending", icon: "time-outline" },
    { key: "completed", label: "Done", icon: "checkmark-circle-outline" },
  ];

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="clipboard-outline"
        size={48}
        color={theme.tabIconDefault}
      />
      <Text
        style={[
          styles.emptyText,
          { color: theme.textSecondary, fontFamily: "Inter_500Medium" },
        ]}
      >
        No {activeTab} tasks
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <View>
          <Text
            style={[
              styles.greeting,
              { color: theme.textSecondary, fontFamily: "Inter_400Regular" },
            ]}
          >
            Good{" "}
            {new Date().getHours() < 12
              ? "morning"
              : new Date().getHours() < 17
              ? "afternoon"
              : "evening"}
          </Text>
          <Text
            style={[
              styles.userName,
              { color: theme.text, fontFamily: "Inter_700Bold" },
            ]}
          >
            {user?.fullName || "Technician"}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.tint + "12" },
            ]}
          >
            <Text
              style={[
                styles.statNumber,
                { color: theme.tint, fontFamily: "Inter_700Bold" },
              ]}
            >
              {todayTasks.length}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: theme.tint, fontFamily: "Inter_500Medium" },
              ]}
            >
              Today
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: Colors.urgency.low + "12" },
            ]}
          >
            <Text
              style={[
                styles.statNumber,
                { color: Colors.urgency.low, fontFamily: "Inter_700Bold" },
              ]}
            >
              {tasks.length}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: Colors.urgency.low, fontFamily: "Inter_500Medium" },
              ]}
            >
              Total
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.tabBar, { backgroundColor: theme.surfaceSecondary }]}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && {
                backgroundColor: theme.surface,
              },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? theme.tint : theme.tabIconDefault}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === tab.key ? theme.tint : theme.tabIconDefault,
                  fontFamily:
                    activeTab === tab.key
                      ? "Inter_600SemiBold"
                      : "Inter_500Medium",
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              statusName={statusMap[item.statusId]?.name}
              statusColor={statusMap[item.statusId]?.color}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={theme.tint}
            />
          }
          contentInsetAdjustmentBehavior="automatic"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 14,
  },
  greeting: { fontSize: 14 },
  userName: { fontSize: 24 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 2,
  },
  statNumber: { fontSize: 24 },
  statLabel: { fontSize: 12 },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  tabText: { fontSize: 13 },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: { fontSize: 15 },
});
