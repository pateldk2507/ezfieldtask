import React, { useCallback } from "react";
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
import TaskCard from "@/components/TaskCard";
import Colors from "@/constants/colors";
import { useResponsive } from "@/hooks/useResponsive";

export default function SalesMyTasks() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { showSidebar, isWeb } = useResponsive();

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
    statuses.forEach((s: any) => { map[s.id] = { name: s.name, color: s.color }; });
    return map;
  }, [statuses])();

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
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          My Tasks
        </Text>
        <Text style={[styles.headerSub, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      ) : (
        <FlatList
          data={tasks}
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
              <Ionicons name="briefcase-outline" size={48} color={theme.tabIconDefault} />
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                No tasks yet
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.tabIconDefault, fontFamily: "Inter_400Regular" }]}>
                Tap + to create your first task
              </Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={theme.tint} />}
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
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 28 },
  headerSub: { fontSize: 14, marginTop: 2 },
  listContent: { padding: 16, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16 },
  emptySubtext: { fontSize: 13 },
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
