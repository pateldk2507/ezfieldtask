import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  useColorScheme,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import TaskCard from "@/components/TaskCard";
import Colors from "@/constants/colors";

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

export default function SchedulerCalendar() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekDates = getWeekDates(selectedDate);
  const selectedDateStr = selectedDate.toISOString().split("T")[0];

  const { data: tasks = [], isLoading } = useQuery({
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

  const dayTasks = tasks.filter((t: any) => t.scheduledDate === selectedDateStr);

  const navigateWeek = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir * 7);
    setSelectedDate(d);
  };

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
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          Calendar
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
            const isToday = dateStr === new Date().toISOString().split("T")[0];
            const taskCount = tasks.filter((t: any) => t.scheduledDate === dateStr).length;
            return (
              <Pressable
                key={idx}
                style={[
                  styles.dayCell,
                  isSelected && { backgroundColor: theme.tint },
                  !isSelected && isToday && { borderWidth: 2, borderColor: theme.tint },
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dayLabel, { color: isSelected ? "#FFF" : theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  {DAYS[date.getDay()]}
                </Text>
                <Text style={[styles.dayNumber, { color: isSelected ? "#FFF" : theme.text, fontFamily: "Inter_700Bold" }]}>
                  {date.getDate()}
                </Text>
                {taskCount > 0 && (
                  <View style={[styles.taskDot, { backgroundColor: isSelected ? "#FFF" : theme.tint }]} />
                )}
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
          data={dayTasks}
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
              <Ionicons name="calendar-outline" size={48} color={theme.tabIconDefault} />
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                No tasks for this day
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
  dayCell: { alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, minWidth: 46, gap: 4 },
  dayLabel: { fontSize: 11 },
  dayNumber: { fontSize: 18 },
  taskDot: { width: 5, height: 5, borderRadius: 3 },
  listContent: { padding: 16, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
