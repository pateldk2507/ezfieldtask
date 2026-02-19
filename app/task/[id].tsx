import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Platform,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Toast, useToast } from "@/components/Toast";
import Colors from "@/constants/colors";

const URGENCY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: Colors.urgency.low, label: "Low" },
  medium: { color: Colors.urgency.medium, label: "Medium" },
  high: { color: Colors.urgency.high, label: "High" },
  critical: { color: Colors.urgency.critical, label: "Critical" },
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const queryClient = useQueryClient();

  const { toast, showToast, hideToast } = useToast();
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingReason, setPendingReason] = useState("");

  const { data: task, isLoading } = useQuery({
    queryKey: ["/api/tasks", id],
    queryFn: () => apiGet<any>(`/api/tasks/${id}`),
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ["/api/task-statuses"],
    queryFn: () => apiGet<any[]>("/api/task-statuses"),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => apiGet<any[]>("/api/users"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiPut(`/api/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      showToast("Task updated successfully", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to update task", "error");
    },
  });

  const statusMap = useCallback(() => {
    const map: Record<string, { name: string; color: string; id: string }> = {};
    statuses.forEach((s: any) => { map[s.id] = { name: s.name, color: s.color, id: s.id }; });
    return map;
  }, [statuses])();

  const userMap = useCallback(() => {
    const map: Record<string, string> = {};
    allUsers.forEach((u: any) => { map[u.id] = u.fullName; });
    return map;
  }, [allUsers])();

  if (isLoading || !task) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  const urgencyInfo = URGENCY_CONFIG[task.urgency] || URGENCY_CONFIG.medium;
  const currentStatus = statusMap[task.statusId];

  const handleStatusChange = (statusName: string) => {
    const targetStatus = statuses.find((s: any) => s.name.toLowerCase() === statusName.toLowerCase());
    if (!targetStatus) return;

    if (statusName.toLowerCase() === "pending" && user?.role === "technician") {
      setShowPendingModal(true);
      return;
    }

    updateMutation.mutate({ statusId: targetStatus.id });
  };

  const handleSubmitPending = () => {
    if (!pendingReason.trim()) {
      if (Platform.OS === "web") {
        alert("Please enter a reason for pending");
      } else {
        Alert.alert("Required", "Please enter a reason for pending");
      }
      return;
    }
    const targetStatus = statuses.find((s: any) => s.name.toLowerCase() === "pending");
    if (targetStatus) {
      updateMutation.mutate({ statusId: targetStatus.id, pendingReason: pendingReason.trim() });
    }
    setShowPendingModal(false);
    setPendingReason("");
  };

  const canChangeStatus = user?.role === "admin" || user?.role === "scheduler" || user?.role === "technician";

  const renderInfoRow = (icon: string, label: string, value: string) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLabel}>
        <Ionicons name={icon as any} size={18} color={theme.textSecondary} />
        <Text style={[styles.infoLabelText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
          {label}
        </Text>
      </View>
      <Text style={[styles.infoValue, { color: theme.text, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
        {value || "N/A"}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Toast {...toast} onDismiss={hideToast} />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8),
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          Task Details
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) + 20 },
        ]}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.titleSection}>
          <View style={styles.badgeRow}>
            <View style={[styles.urgencyBadge, { backgroundColor: urgencyInfo.color + "18" }]}>
              <View style={[styles.urgencyDot, { backgroundColor: urgencyInfo.color }]} />
              <Text style={[styles.urgencyText, { color: urgencyInfo.color, fontFamily: "Inter_600SemiBold" }]}>
                {urgencyInfo.label}
              </Text>
            </View>
            {currentStatus && (
              <View style={[styles.statusBadge, { backgroundColor: currentStatus.color + "18" }]}>
                <Text style={[styles.statusText, { color: currentStatus.color, fontFamily: "Inter_600SemiBold" }]}>
                  {currentStatus.name}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.taskTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {task.title}
          </Text>
          <Text style={[styles.taskDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {task.description}
          </Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Schedule
          </Text>
          {renderInfoRow("calendar-outline", "Date", task.scheduledDate)}
          {renderInfoRow("time-outline", "Time", task.scheduledTime)}
          {renderInfoRow("location-outline", "Address", task.address)}
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Contact
          </Text>
          {renderInfoRow("person-outline", "Name", task.contactPersonName)}
          {renderInfoRow("mail-outline", "Email", task.contactEmail)}
          {renderInfoRow("call-outline", "Phone", task.contactPhone)}
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Assignment
          </Text>
          {renderInfoRow("briefcase-outline", "Sales Person", userMap[task.salesPersonId] || "Unassigned")}
          {renderInfoRow("construct-outline", "Technician", userMap[task.assignedTechnicianId] || "Unassigned")}
          {renderInfoRow("person-add-outline", "Created By", userMap[task.createdById] || "Unknown")}
        </View>

        {task.additionalDetails ? (
          <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Additional Details
            </Text>
            <Text style={[styles.detailsText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
              {task.additionalDetails}
            </Text>
          </View>
        ) : null}

        {task.pendingReason ? (
          <View style={[styles.infoCard, { backgroundColor: Colors.urgency.critical + "08" }]}>
            <Text style={[styles.cardTitle, { color: Colors.urgency.critical, fontFamily: "Inter_600SemiBold" }]}>
              Pending Reason
            </Text>
            <Text style={[styles.detailsText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
              {task.pendingReason}
            </Text>
          </View>
        ) : null}

        {canChangeStatus && (
          <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Update Status
            </Text>
            <View style={styles.statusGrid}>
              {statuses.map((status: any) => (
                <Pressable
                  key={status.id}
                  style={[
                    styles.statusOption,
                    {
                      backgroundColor: task.statusId === status.id ? status.color + "20" : theme.surfaceSecondary,
                      borderColor: task.statusId === status.id ? status.color : "transparent",
                    },
                  ]}
                  onPress={() => handleStatusChange(status.name)}
                >
                  <View style={[styles.statusOptionDot, { backgroundColor: status.color }]} />
                  <Text
                    style={[
                      styles.statusOptionText,
                      {
                        color: task.statusId === status.id ? status.color : theme.text,
                        fontFamily: task.statusId === status.id ? "Inter_600SemiBold" : "Inter_500Medium",
                      },
                    ]}
                  >
                    {status.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {showPendingModal && (
          <View style={[styles.pendingModal, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Reason for Pending
            </Text>
            <TextInput
              style={[styles.pendingInput, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
              placeholder="Enter reason..."
              placeholderTextColor={theme.tabIconDefault}
              value={pendingReason}
              onChangeText={setPendingReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.pendingActions}>
              <Pressable
                style={[styles.pendingBtn, { backgroundColor: theme.surfaceSecondary }]}
                onPress={() => { setShowPendingModal(false); setPendingReason(""); }}
              >
                <Text style={[styles.pendingBtnText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.pendingBtn, { backgroundColor: theme.tint }]}
                onPress={handleSubmitPending}
              >
                <Text style={[styles.pendingBtnText, { color: "#FFF", fontFamily: "Inter_600SemiBold" }]}>Submit</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 17, flex: 1, textAlign: "center" as const },
  scrollContent: { padding: 16, gap: 14 },
  titleSection: { gap: 8 },
  badgeRow: { flexDirection: "row", gap: 8 },
  urgencyBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  urgencyDot: { width: 6, height: 6, borderRadius: 3 },
  urgencyText: { fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 11 },
  taskTitle: { fontSize: 24 },
  taskDesc: { fontSize: 15, lineHeight: 22 },
  infoCard: { borderRadius: 14, padding: 16, gap: 12 },
  cardTitle: { fontSize: 15, marginBottom: 2 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  infoLabel: { flexDirection: "row", alignItems: "center", gap: 6, width: 110 },
  infoLabelText: { fontSize: 13 },
  infoValue: { fontSize: 14, flex: 1, textAlign: "right" as const },
  detailsText: { fontSize: 14, lineHeight: 20 },
  statusGrid: { flexDirection: "row", flexWrap: "wrap" as const, gap: 8 },
  statusOption: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, gap: 8, borderWidth: 1.5 },
  statusOptionDot: { width: 8, height: 8, borderRadius: 4 },
  statusOptionText: { fontSize: 13 },
  pendingModal: { borderRadius: 14, padding: 16, gap: 12 },
  pendingInput: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15, minHeight: 80 },
  pendingActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  pendingBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  pendingBtnText: { fontSize: 14 },
});
