import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Switch,
  ScrollView,
  useColorScheme,
  Platform,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import Colors from "@/constants/colors";
import { Toast, useToast } from "@/components/Toast";
import { useResponsive } from "@/hooks/useResponsive";

export default function SalesSettings() {
  const { user, organization, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const { showSidebar, isWeb } = useResponsive();

  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notificationsEnabled ?? true);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const { data: emergencyContacts = [] } = useQuery({
    queryKey: ["/api/emergency-contacts"],
    queryFn: () => apiGet<any[]>("/api/emergency-contacts"),
  });

  const addContactMutation = useMutation({
    mutationFn: (data: { name: string; phone: string }) => apiPost("/api/emergency-contacts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emergency-contacts"] });
      setShowAddContact(false);
      setContactName("");
      setContactPhone("");
      showToast("Emergency contact added", "success");
    },
    onError: (err: any) => showToast(err.message || "Failed to add contact", "error"),
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/emergency-contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emergency-contacts"] });
      showToast("Emergency contact removed", "success");
    },
    onError: (err: any) => showToast(err.message || "Failed to remove contact", "error"),
  });

  const handleLogout = () => {
    if (Platform.OS === "web") {
      logout().then(() => router.replace("/"));
    } else {
      Alert.alert("Sign Out", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: () => logout().then(() => router.replace("/")) },
      ]);
    }
  };

  return (
    <View style={{ flex: 1 }}>
    <Toast {...toast} onDismiss={hideToast} />
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + (isWeb ? (showSidebar ? 24 : 67) : 12),
        paddingBottom: insets.bottom + (isWeb ? (showSidebar ? 24 : 34) : 20) + (showSidebar ? 0 : 80),
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Settings</Text>

      <View style={[styles.profileCard, { backgroundColor: theme.surface }]}>
        <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
          <Text style={[styles.avatarText, { fontFamily: "Inter_700Bold" }]}>
            {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{user?.fullName}</Text>
          <Text style={[styles.profileRole, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1)} at {organization?.name}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>PREFERENCES</Text>
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={22} color={theme.tint} />
            <Text style={[styles.settingLabel, { color: theme.text, fontFamily: "Inter_500Medium" }]}>Notifications</Text>
          </View>
          <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: theme.border, true: theme.tint + "60" }} thumbColor={notificationsEnabled ? theme.tint : theme.tabIconDefault} />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>EMERGENCY CONTACTS</Text>
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        {emergencyContacts.map((c: any) => (
          <View key={c.id} style={styles.contactRow}>
            <View style={styles.contactInfo}>
              <Ionicons name="person-circle-outline" size={22} color={theme.tint} />
              <View>
                <Text style={[styles.contactName, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{c.name}</Text>
                <Text style={[styles.contactPhone, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>{c.phone}</Text>
              </View>
            </View>
            <Pressable onPress={() => deleteContactMutation.mutate(c.id)}>
              <Ionicons name="trash-outline" size={20} color={Colors.urgency.critical} />
            </Pressable>
          </View>
        ))}
        {showAddContact ? (
          <View style={styles.addContactForm}>
            <TextInput style={[styles.contactInput, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular" }]} placeholder="Contact Name" placeholderTextColor={theme.tabIconDefault} value={contactName} onChangeText={setContactName} />
            <TextInput style={[styles.contactInput, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular" }]} placeholder="Phone Number" placeholderTextColor={theme.tabIconDefault} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
            <View style={styles.contactActions}>
              <Pressable style={[styles.contactActionBtn, { backgroundColor: theme.surfaceSecondary }]} onPress={() => setShowAddContact(false)}>
                <Ionicons name="close" size={20} color={theme.text} />
              </Pressable>
              <Pressable style={[styles.contactActionBtn, { backgroundColor: theme.tint }]} onPress={() => {
                if (!contactName || !contactPhone) {
                  showToast("Please fill in both name and phone", "error");
                  return;
                }
                addContactMutation.mutate({ name: contactName, phone: contactPhone });
              }}>
                {addContactMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="checkmark" size={20} color="#FFF" />
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.addContactRow} onPress={() => setShowAddContact(true)}>
            <Ionicons name="add-circle-outline" size={22} color={theme.tint} />
            <Text style={[styles.addContactText, { color: theme.tint, fontFamily: "Inter_500Medium" }]}>Add Emergency Contact</Text>
          </Pressable>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>ACCOUNT</Text>
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Pressable style={styles.logoutRow} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.urgency.critical} />
          <Text style={[styles.logoutText, { fontFamily: "Inter_500Medium" }]}>Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: { fontSize: 28, paddingHorizontal: 20, marginBottom: 20 },
  profileCard: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, padding: 16, borderRadius: 16, gap: 14, marginBottom: 24 },
  avatar: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#FFF", fontSize: 22 },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 17 },
  profileRole: { fontSize: 13 },
  sectionTitle: { fontSize: 12, textTransform: "uppercase" as const, letterSpacing: 1, paddingHorizontal: 20, marginBottom: 8, marginTop: 4 },
  section: { marginHorizontal: 16, borderRadius: 14, marginBottom: 20, overflow: "hidden" },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingLabel: { fontSize: 15 },
  contactRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  contactInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  contactName: { fontSize: 15 },
  contactPhone: { fontSize: 13 },
  addContactRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  addContactText: { fontSize: 15 },
  addContactForm: { padding: 16, gap: 10 },
  contactInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  contactActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  contactActionBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  logoutRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  logoutText: { fontSize: 15, color: "#EF4444" },
});
