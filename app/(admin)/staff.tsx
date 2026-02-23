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
import { useAuth } from "@/lib/auth-context";
import { Toast, useToast } from "@/components/Toast";
import Colors from "@/constants/colors";
import { useResponsive } from "@/hooks/useResponsive";

const ROLES = [
  { key: "admin", label: "Admin", icon: "shield-outline" },
  { key: "scheduler", label: "Scheduler", icon: "calendar-outline" },
  { key: "sales", label: "Sales", icon: "briefcase-outline" },
  { key: "technician", label: "Technician", icon: "construct-outline" },
];

export default function StaffScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const { showSidebar, isWeb } = useResponsive();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("technician");
  const [showTempPasswordModal, setShowTempPasswordModal] = useState(false);
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{ name: string; email: string; password: string } | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => apiGet<any[]>("/api/users"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost<any>("/api/users", data),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      const createdName = fullName;
      const createdEmail = email;
      resetForm();
      setShowCreateModal(false);
      if (result.tempPassword) {
        setTempPasswordInfo({ name: createdName, email: createdEmail, password: result.tempPassword });
        setShowTempPasswordModal(true);
      }
      showToast("Staff member created! Welcome email sent.", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to create staff member", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiPut(`/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      resetForm();
      setEditingUser(null);
      setShowCreateModal(false);
      showToast("Staff member updated successfully", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to update staff member", "error");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiPut(`/api/users/${id}`, { isActive }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      showToast(
        variables.isActive ? "Staff member activated" : "Staff member deactivated",
        variables.isActive ? "success" : "warning"
      );
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to update staff member", "error");
    },
  });

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setUsername("");
    setPassword("");
    setPhone("");
    setRole("technician");
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setFullName(u.fullName);
    setEmail(u.email);
    setUsername(u.username);
    setPhone(u.phone || "");
    setRole(u.role);
    setPassword("");
    setShowCreateModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    setEditingUser(null);
    setShowCreateModal(true);
  };

  const handleSubmit = () => {
    if (!fullName || !email || !username) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    const data: any = { fullName, email, username, role, phone: phone || undefined };
    if (password) data.password = password;

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleToggleActive = (u: any) => {
    if (Platform.OS === "web") {
      toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive });
    } else {
      Alert.alert(
        u.isActive ? "Deactivate" : "Activate",
        `Are you sure you want to ${u.isActive ? "deactivate" : "activate"} ${u.fullName}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: u.isActive ? "Deactivate" : "Activate",
            style: u.isActive ? "destructive" : "default",
            onPress: () => toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive }),
          },
        ]
      );
    }
  };

  const getRoleColor = (r: string) => {
    switch (r) {
      case "admin": return "#EF4444";
      case "scheduler": return "#F59E0B";
      case "sales": return "#3B82F6";
      case "technician": return "#10B981";
      default: return theme.textSecondary;
    }
  };

  const renderStaffItem = ({ item }: { item: any }) => (
    <View style={[styles.staffCard, { backgroundColor: theme.surface }]}>
      <View style={styles.staffHeader}>
        <View style={[styles.staffAvatar, { backgroundColor: getRoleColor(item.role) + "20" }]}>
          <Text style={[styles.staffAvatarText, { color: getRoleColor(item.role), fontFamily: "Inter_700Bold" }]}>
            {item.fullName?.charAt(0)?.toUpperCase() || "?"}
          </Text>
        </View>
        <View style={styles.staffInfo}>
          <View style={styles.staffNameRow}>
            <Text style={[styles.staffName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {item.fullName}
            </Text>
            {!item.isActive && (
              <View style={[styles.inactiveBadge, { backgroundColor: Colors.urgency.critical + "15" }]}>
                <Text style={[styles.inactiveBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
                  Inactive
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.staffEmail, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {item.email}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + "15" }]}>
            <Text style={[styles.roleBadgeText, { color: getRoleColor(item.role), fontFamily: "Inter_600SemiBold" }]}>
              {item.role?.charAt(0).toUpperCase()}{item.role?.slice(1)}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.staffActions}>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: theme.surfaceSecondary }]}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={18} color={theme.tint} />
        </Pressable>
        {item.id !== user?.id && (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: item.isActive ? Colors.urgency.critical + "12" : Colors.urgency.low + "12" }]}
            onPress={() => handleToggleActive(item)}
          >
            <Ionicons
              name={item.isActive ? "person-remove-outline" : "person-add-outline"}
              size={18}
              color={item.isActive ? Colors.urgency.critical : Colors.urgency.low}
            />
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Toast {...toast} onDismiss={hideToast} />
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (isWeb ? (showSidebar ? 24 : 67) : 12) },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          Staff
        </Text>
        <Pressable
          onPress={openCreateModal}
          style={[styles.addBtn, { backgroundColor: theme.tint }]}
        >
          <Ionicons name="person-add" size={20} color="#FFF" />
        </Pressable>
      </View>

      <View style={[styles.statsRow, { paddingHorizontal: 16 }]}>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statNumber, { color: theme.tint, fontFamily: "Inter_700Bold" }]}>
            {users.length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Total Staff
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statNumber, { color: Colors.urgency.low, fontFamily: "Inter_700Bold" }]}>
            {users.filter((u: any) => u.isActive).length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Active
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statNumber, { color: Colors.urgency.critical, fontFamily: "Inter_700Bold" }]}>
            {users.filter((u: any) => !u.isActive).length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Inactive
          </Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.tint} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item: any) => item.id}
          renderItem={renderStaffItem}
          contentContainerStyle={{
            padding: 16,
            gap: 10,
            paddingBottom: insets.bottom + (isWeb ? (showSidebar ? 24 : 34) : 20) + (showSidebar ? 0 : 80),
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={theme.tabIconDefault} />
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                No staff members yet
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={showTempPasswordModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.tempPwdModal, { backgroundColor: theme.background }]}>
            <View style={[styles.tempPwdIcon, { backgroundColor: Colors.urgency.low + "15" }]}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.urgency.low} />
            </View>
            <Text style={[styles.tempPwdTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              Staff Member Created!
            </Text>
            {tempPasswordInfo && (
              <>
                <Text style={[styles.tempPwdSubtext, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  A welcome email has been sent to {tempPasswordInfo.email} with their login details.
                </Text>
                <View style={[styles.tempPwdCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.tempPwdLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                    Temporary Password
                  </Text>
                  <Text style={[styles.tempPwdValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                    {tempPasswordInfo.password}
                  </Text>
                  <Text style={[styles.tempPwdNote, { color: Colors.urgency.medium, fontFamily: "Inter_500Medium" }]}>
                    Staff member should change this after first login
                  </Text>
                </View>
              </>
            )}
            <Pressable
              style={[styles.tempPwdBtn, { backgroundColor: theme.tint }]}
              onPress={() => { setShowTempPasswordModal(false); setTempPasswordInfo(null); }}
            >
              <Text style={[styles.tempPwdBtnText, { fontFamily: "Inter_600SemiBold" }]}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => { setShowCreateModal(false); resetForm(); setEditingUser(null); }}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
              <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {editingUser ? "Edit Staff Member" : "Add Staff Member"}
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
                  Full Name *
                </Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="John Doe"
                  placeholderTextColor={theme.tabIconDefault}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  Email *
                </Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="john@company.com"
                  placeholderTextColor={theme.tabIconDefault}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  Username *
                </Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="johndoe"
                  placeholderTextColor={theme.tabIconDefault}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  Password {editingUser ? "(leave blank to keep current)" : "(auto-generated if empty)"}
                </Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={editingUser ? "Leave blank to keep current" : "Leave blank for auto-generated"}
                  placeholderTextColor={theme.tabIconDefault}
                  secureTextEntry
                />
                {!editingUser && (
                  <Text style={[styles.helperText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    A temporary password will be generated and emailed to the staff member
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  Phone
                </Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+1 234 567 8900"
                  placeholderTextColor={theme.tabIconDefault}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  Role *
                </Text>
                <View style={styles.roleGrid}>
                  {ROLES.map((r) => (
                    <Pressable
                      key={r.key}
                      style={[
                        styles.roleOption,
                        {
                          backgroundColor: role === r.key ? getRoleColor(r.key) + "15" : theme.surface,
                          borderColor: role === r.key ? getRoleColor(r.key) : theme.border,
                        },
                      ]}
                      onPress={() => setRole(r.key)}
                    >
                      <Ionicons
                        name={r.icon as any}
                        size={18}
                        color={role === r.key ? getRoleColor(r.key) : theme.textSecondary}
                      />
                      <Text
                        style={[
                          styles.roleOptionText,
                          {
                            color: role === r.key ? getRoleColor(r.key) : theme.text,
                            fontFamily: role === r.key ? "Inter_600SemiBold" : "Inter_500Medium",
                          },
                        ]}
                      >
                        {r.label}
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

function getRoleColor(r: string) {
  switch (r) {
    case "admin": return "#EF4444";
    case "scheduler": return "#F59E0B";
    case "sales": return "#3B82F6";
    case "technician": return "#10B981";
    default: return "#8E99A8";
  }
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
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  statCard: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center" },
  statNumber: { fontSize: 22 },
  statLabel: { fontSize: 11, marginTop: 2 },
  staffCard: { borderRadius: 14, padding: 16 },
  staffHeader: { flexDirection: "row", gap: 12 },
  staffAvatar: { width: 46, height: 46, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  staffAvatarText: { fontSize: 18 },
  staffInfo: { flex: 1, gap: 2 },
  staffNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  staffName: { fontSize: 16 },
  staffEmail: { fontSize: 13 },
  inactiveBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  inactiveBadgeText: { fontSize: 10, color: "#EF4444" },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, alignSelf: "flex-start", marginTop: 4 },
  roleBadgeText: { fontSize: 11 },
  staffActions: { flexDirection: "row", gap: 8, marginTop: 12, justifyContent: "flex-end" },
  actionBtn: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%", minHeight: "70%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.08)" },
  modalTitle: { fontSize: 17 },
  formContent: { padding: 16, gap: 14, paddingBottom: 40 },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, marginLeft: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15 },
  roleGrid: { flexDirection: "row", flexWrap: "wrap" as const, gap: 8 },
  roleOption: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, gap: 8 },
  roleOptionText: { fontSize: 13 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  helperText: { fontSize: 12, marginLeft: 4, marginTop: 2 },
  tempPwdModal: { borderRadius: 20, padding: 28, marginHorizontal: 24, alignItems: "center", gap: 16 },
  tempPwdIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center" },
  tempPwdTitle: { fontSize: 20, textAlign: "center" },
  tempPwdSubtext: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  tempPwdCard: { width: "100%", borderRadius: 12, padding: 16, borderWidth: 1, alignItems: "center", gap: 8 },
  tempPwdLabel: { fontSize: 12 },
  tempPwdValue: { fontSize: 22, letterSpacing: 1 },
  tempPwdNote: { fontSize: 12 },
  tempPwdBtn: { width: "100%", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  tempPwdBtnText: { color: "#FFF", fontSize: 16 },
});
