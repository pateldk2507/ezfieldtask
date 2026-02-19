import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  useColorScheme,
  Platform,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { Toast, useToast } from "@/components/Toast";
import Colors from "@/constants/colors";

const TEMPLATE_VARIABLES = [
  { variable: "{{task_title}}", description: "Title of the task" },
  { variable: "{{task_description}}", description: "Task description" },
  { variable: "{{scheduled_date}}", description: "Scheduled date" },
  { variable: "{{scheduled_time}}", description: "Scheduled time" },
  { variable: "{{address}}", description: "Task address/location" },
  { variable: "{{contact_name}}", description: "Contact person name" },
  { variable: "{{contact_email}}", description: "Contact email" },
  { variable: "{{contact_phone}}", description: "Contact phone" },
  { variable: "{{technician_name}}", description: "Assigned technician" },
  { variable: "{{sales_person}}", description: "Sales person name" },
  { variable: "{{urgency}}", description: "Urgency level" },
  { variable: "{{status}}", description: "Current task status" },
  { variable: "{{org_name}}", description: "Organization name" },
  { variable: "{{pending_reason}}", description: "Reason for pending" },
];

export default function EmailTemplatesScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [showVarsRef, setShowVarsRef] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["/api/email-templates"],
    queryFn: () => apiGet<any[]>("/api/email-templates"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/email-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      resetForm();
      setShowModal(false);
      showToast("Email template created successfully", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to create template", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiPut(`/api/email-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      resetForm();
      setEditingTemplate(null);
      setShowModal(false);
      showToast("Email template updated successfully", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to update template", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/email-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      showToast("Email template deleted", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to delete template", "error");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiPut(`/api/email-templates/${id}`, { isActive }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      showToast(vars.isActive ? "Template activated" : "Template deactivated", vars.isActive ? "success" : "warning");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to update template", "error");
    },
  });

  const resetForm = () => {
    setName("");
    setSubject("");
    setBody("");
  };

  const openEdit = (t: any) => {
    setEditingTemplate(t);
    setName(t.name);
    setSubject(t.subject);
    setBody(t.body);
    setShowModal(true);
  };

  const openCreate = () => {
    resetForm();
    setEditingTemplate(null);
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!name || !subject || !body) {
      showToast("Please fill in all fields", "error");
      return;
    }
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: { name, subject, body } });
    } else {
      createMutation.mutate({ name, subject, body });
    }
  };

  const handleDelete = (t: any) => {
    if (Platform.OS === "web") {
      deleteMutation.mutate(t.id);
    } else {
      Alert.alert("Delete Template", `Delete "${t.name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(t.id) },
      ]);
    }
  };

  const insertVariable = (variable: string) => {
    setBody((prev) => prev + variable);
    setShowVarsRef(false);
  };

  const renderTemplate = ({ item }: { item: any }) => (
    <View style={[styles.templateCard, { backgroundColor: theme.surface }]}>
      <View style={styles.templateHeader}>
        <View style={styles.templateTitleRow}>
          <Ionicons name="document-text" size={20} color={theme.tint} />
          <Text style={[styles.templateName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <View style={[styles.activeBadge, { backgroundColor: item.isActive ? Colors.urgency.low + "15" : Colors.urgency.critical + "15" }]}>
          <View style={[styles.activeDot, { backgroundColor: item.isActive ? Colors.urgency.low : Colors.urgency.critical }]} />
          <Text style={[styles.activeText, { color: item.isActive ? Colors.urgency.low : Colors.urgency.critical, fontFamily: "Inter_500Medium" }]}>
            {item.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>
      <Text style={[styles.templateSubject, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
        Subject: {item.subject}
      </Text>
      <Text style={[styles.templateBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
        {item.body}
      </Text>
      <View style={styles.templateActions}>
        <Pressable
          style={[styles.tplActionBtn, { backgroundColor: theme.surfaceSecondary }]}
          onPress={() => openEdit(item)}
        >
          <Ionicons name="create-outline" size={16} color={theme.tint} />
        </Pressable>
        <Pressable
          style={[styles.tplActionBtn, { backgroundColor: item.isActive ? Colors.urgency.medium + "12" : Colors.urgency.low + "12" }]}
          onPress={() => toggleActiveMutation.mutate({ id: item.id, isActive: !item.isActive })}
        >
          <Ionicons
            name={item.isActive ? "pause-outline" : "play-outline"}
            size={16}
            color={item.isActive ? Colors.urgency.medium : Colors.urgency.low}
          />
        </Pressable>
        <Pressable
          style={[styles.tplActionBtn, { backgroundColor: Colors.urgency.critical + "12" }]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={16} color={Colors.urgency.critical} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Toast {...toast} onDismiss={hideToast} />
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          Templates
        </Text>
        <Pressable
          onPress={openCreate}
          style={[styles.addBtn, { backgroundColor: theme.tint }]}
        >
          <Ionicons name="add" size={22} color="#FFF" />
        </Pressable>
      </View>

      <Pressable
        style={[styles.varsRefButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => setShowVarsRef(true)}
      >
        <Ionicons name="code-slash" size={18} color={theme.tint} />
        <Text style={[styles.varsRefText, { color: theme.tint, fontFamily: "Inter_500Medium" }]}>
          View Available Variables
        </Text>
        <Ionicons name="chevron-forward" size={16} color={theme.tint} />
      </Pressable>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.tint} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item: any) => item.id}
          renderItem={renderTemplate}
          contentContainerStyle={{
            padding: 16,
            gap: 10,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) + 80,
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={theme.tabIconDefault} />
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                No email templates yet
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.tabIconDefault, fontFamily: "Inter_400Regular" }]}>
                Create templates to send automated emails for task updates
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={showVarsRef} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.varsModal, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Template Variables
              </Text>
              <Pressable onPress={() => setShowVarsRef(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            <Text style={[styles.varsDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Use these variables in your email subject and body. They will be replaced with actual values when the email is sent.
            </Text>
            <FlatList
              data={TEMPLATE_VARIABLES}
              keyExtractor={(item) => item.variable}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.varRow, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    if (showModal) {
                      insertVariable(item.variable);
                    }
                  }}
                >
                  <View style={[styles.varBadge, { backgroundColor: theme.tint + "15" }]}>
                    <Text style={[styles.varCode, { color: theme.tint, fontFamily: "Inter_600SemiBold" }]}>
                      {item.variable}
                    </Text>
                  </View>
                  <Text style={[styles.varDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {item.description}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => { setShowModal(false); resetForm(); setEditingTemplate(null); }}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
              <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {editingTemplate ? "Edit Template" : "New Template"}
              </Text>
              <Pressable onPress={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <ActivityIndicator size="small" color={theme.tint} />
                ) : (
                  <Ionicons name="checkmark" size={24} color={theme.tint} />
                )}
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  Template Name *
                </Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Task Assignment Notification"
                  placeholderTextColor={theme.tabIconDefault}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  Subject *
                </Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="Task {{task_title}} assigned to you"
                  placeholderTextColor={theme.tabIconDefault}
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.bodyLabelRow}>
                  <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                    Body *
                  </Text>
                  <Pressable
                    style={[styles.insertVarBtn, { backgroundColor: theme.tint + "15" }]}
                    onPress={() => setShowVarsRef(true)}
                  >
                    <Ionicons name="code-slash" size={14} color={theme.tint} />
                    <Text style={[styles.insertVarText, { color: theme.tint, fontFamily: "Inter_500Medium" }]}>
                      Insert Variable
                    </Text>
                  </Pressable>
                </View>
                <TextInput
                  style={[styles.input, styles.bodyInput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
                  value={body}
                  onChangeText={setBody}
                  placeholder={"Hi {{contact_name}},\n\nYour task {{task_title}} has been scheduled for {{scheduled_date}} at {{scheduled_time}}.\n\nAddress: {{address}}\n\nBest regards,\n{{org_name}}"}
                  placeholderTextColor={theme.tabIconDefault}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                />
              </View>

              <View style={[styles.previewSection, { backgroundColor: theme.surface }]}>
                <Text style={[styles.previewTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  Available Variables
                </Text>
                <View style={styles.varChips}>
                  {TEMPLATE_VARIABLES.slice(0, 8).map((v) => (
                    <Pressable
                      key={v.variable}
                      style={[styles.varChip, { backgroundColor: theme.surfaceSecondary }]}
                      onPress={() => setBody((prev) => prev + v.variable)}
                    >
                      <Text style={[styles.varChipText, { color: theme.tint, fontFamily: "Inter_500Medium" }]}>
                        {v.variable}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  varsRefButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 8,
  },
  varsRefText: { fontSize: 14, flex: 1 },
  templateCard: { borderRadius: 14, padding: 16, gap: 8 },
  templateHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  templateTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  templateName: { fontSize: 16, flex: 1 },
  activeBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, gap: 4 },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontSize: 11 },
  templateSubject: { fontSize: 13 },
  templateBody: { fontSize: 13, lineHeight: 18 },
  templateActions: { flexDirection: "row", gap: 8, marginTop: 4, justifyContent: "flex-end" },
  tplActionBtn: { width: 34, height: 34, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 15 },
  emptySubtext: { fontSize: 13, textAlign: "center" as const, maxWidth: 260 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%", minHeight: "70%" },
  varsModal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80%", paddingHorizontal: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0 },
  modalTitle: { fontSize: 17 },
  varsDesc: { fontSize: 13, lineHeight: 18, paddingHorizontal: 16, marginBottom: 12 },
  varRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  varBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  varCode: { fontSize: 12 },
  varDesc: { fontSize: 13, flex: 1 },
  formContent: { padding: 16, gap: 14, paddingBottom: 40 },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, marginLeft: 4 },
  bodyLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  insertVarBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  insertVarText: { fontSize: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15 },
  bodyInput: { minHeight: 160 },
  previewSection: { borderRadius: 12, padding: 14, gap: 8 },
  previewTitle: { fontSize: 13 },
  varChips: { flexDirection: "row", flexWrap: "wrap" as const, gap: 6 },
  varChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  varChipText: { fontSize: 11 },
});
