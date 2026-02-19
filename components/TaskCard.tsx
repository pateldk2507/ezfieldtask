import React from "react";
import { View, Text, Pressable, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    address: string;
    scheduledTime: string;
    scheduledDate: string;
    urgency: string;
    contactPersonName: string;
  };
  statusName?: string;
  statusColor?: string;
}

const URGENCY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: Colors.urgency.low, label: "Low" },
  medium: { color: Colors.urgency.medium, label: "Medium" },
  high: { color: Colors.urgency.high, label: "High" },
  critical: { color: Colors.urgency.critical, label: "Critical" },
};

export default function TaskCard({ task, statusName, statusColor }: TaskCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const urgencyInfo = URGENCY_CONFIG[task.urgency] || URGENCY_CONFIG.medium;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderLeftColor: urgencyInfo.color,
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={() => router.push({ pathname: "/task/[id]", params: { id: task.id } })}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.urgencyBadge, { backgroundColor: urgencyInfo.color + "18" }]}>
          <View style={[styles.urgencyDot, { backgroundColor: urgencyInfo.color }]} />
          <Text style={[styles.urgencyText, { color: urgencyInfo.color, fontFamily: "Inter_600SemiBold" }]}>
            {urgencyInfo.label}
          </Text>
        </View>
        {statusName ? (
          <View style={[styles.statusBadge, { backgroundColor: (statusColor || "#6B7280") + "18" }]}>
            <Text style={[styles.statusText, { color: statusColor || "#6B7280", fontFamily: "Inter_500Medium" }]}>
              {statusName}
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        style={[styles.title, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
        numberOfLines={1}
      >
        {task.title}
      </Text>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
          <Text
            style={[styles.detailText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
            numberOfLines={1}
          >
            {task.address}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={14} color={theme.tint} />
          <Text style={[styles.timeText, { color: theme.tint, fontFamily: "Inter_500Medium" }]}>
            {task.scheduledTime}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="person-outline" size={14} color={theme.textSecondary} />
          <Text
            style={[styles.detailText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
            numberOfLines={1}
          >
            {task.contactPersonName}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  urgencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  urgencyText: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
  },
  title: {
    fontSize: 16,
  },
  detailsRow: {
    gap: 6,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  timeText: {
    fontSize: 13,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
