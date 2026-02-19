import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  useColorScheme,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { TaskCard } from "@/components/TaskCard";
import Colors from "@/constants/colors";

export default function AdminTasksScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const [filter, setFilter] = useState("all");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: () => apiGet<any[]>("/api/tasks"),
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ["/api/task-statuses"],
    queryFn: () => apiGet<any[]>("/api/task-statuses"),
  });

  const statusMap = useMemo(() => {
    const map: Record<string, any> = {};
    statuses.forEach((s: any) => { map[s.id] = s; });
    return map;
  }, [statuses]);

  const filteredTasks = useMemo(() => {
    if (filter === "all") return tasks;
    if (filter === "today") {
      const today = new Date().toISOString().split("T")[0];
      return tasks.filter((t: any) => t.scheduledDate === today);
    }
    return tasks.filter((t: any) => {
      const status = statusMap[t.statusId];
      return status?.name?.toLowerCase() === filter;
    });
  }, [tasks, filter, statusMap]);

  const filters = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    ...statuses.map((s: any) => ({ key: s.name.toLowerCase(), label: s.name })),
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          All Tasks
        </Text>
        <Pressable
          onPress={() => router.push("/task/create")}
          style={[styles.addBtn, { backgroundColor: theme.tint }]}
        >
          <Ionicons name="add" size={22} color="#FFF" />
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={filters}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterList}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === item.key ? theme.tint : theme.surface,
                borderColor: filter === item.key ? theme.tint : theme.border,
              },
            ]}
            onPress={() => setFilter(item.key)}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: filter === item.key ? "#FFF" : theme.text,
                  fontFamily: filter === item.key ? "Inter_600SemiBold" : "Inter_500Medium",
                },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        )}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{
            padding: 16,
            gap: 10,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) + 80,
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={48} color={theme.tabIconDefault} />
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                No tasks found
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TaskCard task={item} statusMap={statusMap} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 28 },
  addBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  filterList: { flexGrow: 0 },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
