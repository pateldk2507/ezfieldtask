import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import TaskCard from "@/components/TaskCard";
import Colors from "@/constants/colors";
import { useResponsive } from "@/hooks/useResponsive";

type BoardTab = "pending" | "ongoing" | "problem" | "completed";

export default function SchedulerTaskBoard() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { showSidebar, isWeb } = useResponsive();
  const [activeTab, setActiveTab] = useState<BoardTab>("pending");

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: () => apiGet<any[]>("/api/tasks"),
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ["/api/task-statuses"],
    queryFn: () => apiGet<any[]>("/api/task-statuses"),
  });

  const statusMap = useCallback(() => {
    const map: Record<string, { name: string; color: string }> = {};
    statuses.forEach((s: any) => {
      map[s.id] = { name: s.name, color: s.color };
    });
    return map;
  }, [statuses])();

  const tabStatusMap: Record<BoardTab, string[]> = {
    pending: ["New", "Pending"],
    ongoing: ["In Progress"],
    problem: ["Pending"],
    completed: ["Completed"],
  };

  const filterTasks = useCallback(
    (tab: BoardTab) => {
      const targetNames = tabStatusMap[tab];
      const matchStatuses = statuses.filter((s: any) =>
        targetNames.some((n) => s.name.toLowerCase() === n.toLowerCase())
      );
      const matchIds = matchStatuses.map((s: any) => s.id);

      let filtered = tasks.filter((t: any) => matchIds.includes(t.statusId));

      if (tab === "problem") {
        filtered = tasks.filter(
          (t: any) =>
            matchIds.includes(t.statusId) && t.pendingReason
        );
      } else if (tab === "pending") {
        filtered = tasks.filter(
          (t: any) =>
            matchIds.includes(t.statusId) && !t.pendingReason
        );
      }

      return filtered;
    },
    [tasks, statuses]
  );

  const filteredTasks = filterTasks(activeTab);

  const tabs: { key: BoardTab; label: string; icon: string; color: string }[] = [
    { key: "pending", label: "Schedule", icon: "hourglass-outline", color: Colors.urgency.medium },
    { key: "ongoing", label: "Ongoing", icon: "play-circle-outline", color: theme.tint },
    { key: "problem", label: "Problem", icon: "warning-outline", color: Colors.urgency.critical },
    { key: "completed", label: "Done", icon: "checkmark-circle-outline", color: Colors.urgency.low },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (isWeb ? (showSidebar ? 24 : 67) : 12),
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              Task Board
            </Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {tasks.length} total tasks
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.tabBar, { backgroundColor: theme.surfaceSecondary }]}>
        {tabs.map((tab) => {
          const count = filterTasks(tab.key).length;
          return (
            <Pressable
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && { backgroundColor: theme.surface },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <View
                style={[
                  styles.tabDot,
                  { backgroundColor: activeTab === tab.key ? tab.color : theme.tabIconDefault },
                ]}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === tab.key ? theme.text : theme.tabIconDefault,
                    fontFamily: activeTab === tab.key ? "Inter_600SemiBold" : "Inter_500Medium",
                  },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.countBadge, { backgroundColor: tab.color + "20" }]}>
                  <Text style={[styles.countText, { color: tab.color, fontFamily: "Inter_600SemiBold" }]}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={48} color={theme.tabIconDefault} />
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                No tasks in this category
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor={theme.tint} />
          }
          contentInsetAdjustmentBehavior="automatic"
        />
      )}

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.tint, opacity: pressed ? 0.9 : 1 },
        ]}
        onPress={() => router.push("/task/create")}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 28 },
  headerSub: { fontSize: 14, marginTop: 2 },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    padding: 4,
    gap: 2,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tabText: { fontSize: 11 },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 20,
    alignItems: "center",
  },
  countText: { fontSize: 10 },
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
    paddingTop: 60,
    gap: 12,
  },
  emptyText: { fontSize: 15 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});
