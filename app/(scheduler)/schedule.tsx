import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import Colors from "@/constants/colors";
import { useResponsive } from "@/hooks/useResponsive";

function getWeekDates(baseDate: Date): Date[] {
  const dates: Date[] = [];
  const start = new Date(baseDate);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TechnicianSchedule() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { showSidebar, isWeb } = useResponsive();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekDates = getWeekDates(selectedDate);
  const selectedDateStr = selectedDate.toISOString().split("T")[0];

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: () => apiGet<any[]>("/api/tasks"),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ["/api/users/role/technician"],
    queryFn: () => apiGet<any[]>("/api/users/role/technician"),
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

  const navigateWeek = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir * 7);
    setSelectedDate(d);
  };

  const techTasksForDay = useCallback(
    (techId: string) =>
      tasks.filter(
        (t: any) =>
          t.assignedTechnicianId === techId && t.scheduledDate === selectedDateStr
      ),
    [tasks, selectedDateStr]
  );

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
          Technician Schedule
        </Text>

        <View style={styles.monthRow}>
          <Pressable onPress={() => navigateWeek(-1)}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.monthText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </Text>
          <Pressable onPress={() => navigateWeek(1)}>
            <Ionicons name="chevron-forward" size={24} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekRow}>
          {weekDates.map((date, idx) => {
            const dateStr = date.toISOString().split("T")[0];
            const isSelected = dateStr === selectedDateStr;
            return (
              <Pressable
                key={idx}
                style={[styles.dayCell, isSelected && { backgroundColor: theme.tint }]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dayLabel, { color: isSelected ? "#FFF" : theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  {DAYS[date.getDay()]}
                </Text>
                <Text style={[styles.dayNumber, { color: isSelected ? "#FFF" : theme.text, fontFamily: "Inter_700Bold" }]}>
                  {date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      ) : (
        <FlatList
          data={technicians}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item: tech }) => {
            const techTasks = techTasksForDay(tech.id);
            return (
              <View style={[styles.techCard, { backgroundColor: theme.surface }]}>
                <View style={styles.techHeader}>
                  <View style={[styles.techAvatar, { backgroundColor: theme.tint }]}>
                    <Text style={[styles.techAvatarText, { fontFamily: "Inter_700Bold" }]}>
                      {tech.fullName?.charAt(0)?.toUpperCase() || "T"}
                    </Text>
                  </View>
                  <View style={styles.techInfo}>
                    <Text style={[styles.techName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                      {tech.fullName}
                    </Text>
                    <Text style={[styles.techTaskCount, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                      {techTasks.length} task{techTasks.length !== 1 ? "s" : ""} today
                    </Text>
                  </View>
                </View>

                {techTasks.length > 0 ? (
                  <View style={styles.taskList}>
                    {techTasks.map((task: any) => (
                      <View
                        key={task.id}
                        style={[
                          styles.miniTaskCard,
                          {
                            backgroundColor: theme.surfaceSecondary,
                            borderLeftColor: statusMap[task.statusId]?.color || "#6B7280",
                          },
                        ]}
                      >
                        <Text
                          style={[styles.miniTaskTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]}
                          numberOfLines={1}
                        >
                          {task.title}
                        </Text>
                        <Text style={[styles.miniTaskTime, { color: theme.tint, fontFamily: "Inter_500Medium" }]}>
                          {task.scheduledTime}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.noTasks, { color: theme.tabIconDefault, fontFamily: "Inter_400Regular" }]}>
                    No tasks scheduled
                  </Text>
                )}
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={theme.tabIconDefault} />
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                No technicians found
              </Text>
            </View>
          }
          contentInsetAdjustmentBehavior="automatic"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, gap: 12 },
  headerTitle: { fontSize: 28, paddingHorizontal: 4 },
  monthRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  monthText: { fontSize: 16 },
  weekRow: { flexDirection: "row", gap: 8, paddingHorizontal: 4 },
  dayCell: { alignItems: "center", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14, minWidth: 44, gap: 4 },
  dayLabel: { fontSize: 11 },
  dayNumber: { fontSize: 18 },
  techCard: { borderRadius: 14, padding: 16, marginBottom: 10, gap: 12 },
  techHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  techAvatar: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  techAvatarText: { color: "#FFF", fontSize: 16 },
  techInfo: { flex: 1 },
  techName: { fontSize: 15 },
  techTaskCount: { fontSize: 13 },
  taskList: { gap: 6 },
  miniTaskCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 10, borderLeftWidth: 3 },
  miniTaskTitle: { fontSize: 14, flex: 1, marginRight: 10 },
  miniTaskTime: { fontSize: 13 },
  noTasks: { fontSize: 13, paddingLeft: 52 },
  listContent: { padding: 16, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
