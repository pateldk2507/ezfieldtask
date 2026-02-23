import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  useColorScheme,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Toast, useToast } from "@/components/Toast";
import Colors from "@/constants/colors";
import { useResponsive } from "@/hooks/useResponsive";

const URGENCY_LEVELS = [
  { key: "low", label: "Low", color: Colors.urgency.low },
  { key: "medium", label: "Medium", color: Colors.urgency.medium },
  { key: "high", label: "High", color: Colors.urgency.high },
  { key: "critical", label: "Critical", color: Colors.urgency.critical },
];

export default function CreateTaskScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const queryClient = useQueryClient();
  const { showSidebar, isWeb } = useResponsive();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split("T")[0]);
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [address, setAddress] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [selectedSalesPerson, setSelectedSalesPerson] = useState(user?.role === "sales" ? user.id : "");
  const [error, setError] = useState("");
  const { toast, showToast, hideToast } = useToast();

  const { data: technicians = [] } = useQuery({
    queryKey: ["/api/users/role/technician"],
    queryFn: () => apiGet<any[]>("/api/users/role/technician"),
  });

  const { data: salesUsers = [] } = useQuery({
    queryKey: ["/api/users/role/sales"],
    queryFn: () => apiGet<any[]>("/api/users/role/sales"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      showToast("Task created successfully", "success");
      setTimeout(() => router.back(), 800);
    },
    onError: (err: any) => {
      setError(err.message || "Failed to create task");
      showToast(err.message || "Failed to create task", "error");
    },
  });

  const handleCreate = () => {
    if (!title || !description || !scheduledDate || !scheduledTime || !address || !contactPersonName || !contactEmail || !contactPhone) {
      setError("Please fill in all required fields");
      showToast("Please fill in all required fields", "error");
      return;
    }
    setError("");
    createMutation.mutate({
      title,
      description,
      scheduledDate,
      scheduledTime,
      address,
      contactPersonName,
      contactEmail,
      contactPhone,
      urgency,
      additionalDetails: additionalDetails || undefined,
      assignedTechnicianId: selectedTechnician || undefined,
      salesPersonId: selectedSalesPerson || undefined,
      vaultAccessCodeRequired: false,
    });
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (v: string) => void,
    opts: { placeholder?: string; multiline?: boolean; keyboard?: any; required?: boolean } = {}
  ) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
        {label}{opts.required !== false ? " *" : ""}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.surface,
            borderColor: theme.border,
            fontFamily: "Inter_400Regular",
          },
          opts.multiline && styles.multilineInput,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={opts.placeholder}
        placeholderTextColor={theme.tabIconDefault}
        multiline={opts.multiline}
        numberOfLines={opts.multiline ? 3 : 1}
        textAlignVertical={opts.multiline ? "top" : "center"}
        keyboardType={opts.keyboard || "default"}
        autoCorrect={false}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Toast {...toast} onDismiss={hideToast} />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (isWeb ? (showSidebar ? 24 : 67) : 8),
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          New Task
        </Text>
        <Pressable
          onPress={handleCreate}
          disabled={createMutation.isPending}
          style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color={theme.tint} />
          ) : (
            <Ionicons name="checkmark" size={24} color={theme.tint} />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (isWeb ? (showSidebar ? 24 : 34) : 20) + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: Colors.urgency.critical + "15" }]}>
            <Ionicons name="alert-circle" size={18} color={Colors.urgency.critical} />
            <Text style={[styles.errorText, { color: Colors.urgency.critical, fontFamily: "Inter_500Medium" }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {renderInput("Title", title, setTitle, { placeholder: "Task title" })}
        {renderInput("Description", description, setDescription, { placeholder: "Describe the task...", multiline: true })}

        <View style={styles.row}>
          <View style={styles.halfInput}>
            {renderInput("Date", scheduledDate, setScheduledDate, { placeholder: "YYYY-MM-DD" })}
          </View>
          <View style={styles.halfInput}>
            {renderInput("Time", scheduledTime, setScheduledTime, { placeholder: "HH:MM" })}
          </View>
        </View>

        {renderInput("Address", address, setAddress, { placeholder: "123 Main St, City" })}

        <Text style={[styles.sectionLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          Contact Information
        </Text>
        {renderInput("Contact Name", contactPersonName, setContactPersonName, { placeholder: "John Doe" })}
        {renderInput("Contact Email", contactEmail, setContactEmail, { placeholder: "john@example.com", keyboard: "email-address" })}
        {renderInput("Contact Phone", contactPhone, setContactPhone, { placeholder: "+1 234 567 8900", keyboard: "phone-pad" })}

        <Text style={[styles.sectionLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          Urgency Level
        </Text>
        <View style={styles.urgencyRow}>
          {URGENCY_LEVELS.map((level) => (
            <Pressable
              key={level.key}
              style={[
                styles.urgencyOption,
                {
                  backgroundColor: urgency === level.key ? level.color + "20" : theme.surface,
                  borderColor: urgency === level.key ? level.color : theme.border,
                },
              ]}
              onPress={() => setUrgency(level.key)}
            >
              <View style={[styles.urgencyDot, { backgroundColor: level.color }]} />
              <Text
                style={[
                  styles.urgencyText,
                  {
                    color: urgency === level.key ? level.color : theme.text,
                    fontFamily: urgency === level.key ? "Inter_600SemiBold" : "Inter_500Medium",
                  },
                ]}
              >
                {level.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          Assignment
        </Text>

        {technicians.length > 0 && (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Assign Technician
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Pressable
                style={[
                  styles.chip,
                  {
                    backgroundColor: !selectedTechnician ? theme.tint + "20" : theme.surface,
                    borderColor: !selectedTechnician ? theme.tint : theme.border,
                  },
                ]}
                onPress={() => setSelectedTechnician("")}
              >
                <Text style={[styles.chipText, { color: !selectedTechnician ? theme.tint : theme.text, fontFamily: "Inter_500Medium" }]}>
                  None
                </Text>
              </Pressable>
              {technicians.map((tech: any) => (
                <Pressable
                  key={tech.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selectedTechnician === tech.id ? theme.tint + "20" : theme.surface,
                      borderColor: selectedTechnician === tech.id ? theme.tint : theme.border,
                    },
                  ]}
                  onPress={() => setSelectedTechnician(tech.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: selectedTechnician === tech.id ? theme.tint : theme.text,
                        fontFamily: selectedTechnician === tech.id ? "Inter_600SemiBold" : "Inter_500Medium",
                      },
                    ]}
                  >
                    {tech.fullName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {renderInput("Additional Details", additionalDetails, setAdditionalDetails, {
          placeholder: "Any additional information...",
          multiline: true,
          required: false,
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 17 },
  saveBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-end" },
  scrollContent: { padding: 16, gap: 12 },
  errorBox: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, gap: 8 },
  errorText: { fontSize: 13, flex: 1 },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, marginLeft: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15 },
  multilineInput: { minHeight: 80 },
  row: { flexDirection: "row", gap: 12 },
  halfInput: { flex: 1 },
  sectionLabel: { fontSize: 16, marginTop: 8 },
  urgencyRow: { flexDirection: "row", flexWrap: "wrap" as const, gap: 8 },
  urgencyOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  urgencyDot: { width: 8, height: 8, borderRadius: 4 },
  urgencyText: { fontSize: 13 },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13 },
});
