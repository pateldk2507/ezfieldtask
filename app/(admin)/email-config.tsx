import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut, apiPost } from "@/lib/api";
import { Toast, useToast } from "@/components/Toast";
import Colors from "@/constants/colors";

export default function EmailConfigScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["/api/email-config"],
    queryFn: () => apiGet<any>("/api/email-config"),
  });

  useEffect(() => {
    if (config) {
      setSmtpHost(config.smtpHost || "");
      setSmtpPort(String(config.smtpPort || 587));
      setSmtpUser(config.smtpUser || "");
      setSmtpPass(config.smtpPass || "");
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiPut("/api/email-config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-config"] });
      showToast("Email configuration saved successfully", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to save email configuration", "error");
    },
  });

  const testMutation = useMutation({
    mutationFn: () => apiPost("/api/email-config/test", {}),
    onSuccess: (data: any) => {
      showToast(data.message || "Test completed", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Test failed", "error");
    },
  });

  const handleSave = () => {
    if (!smtpHost || !smtpUser) {
      showToast("SMTP Host and Email are required", "error");
      return;
    }
    saveMutation.mutate({
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass: smtpPass !== "********" ? smtpPass : undefined,
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Toast {...toast} onDismiss={hideToast} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) + 80,
          padding: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          Email Setup
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Configure your outgoing email settings to send notifications and task updates to your team.
        </Text>

        <View style={[styles.infoCard, { backgroundColor: theme.tint + "10", borderColor: theme.tint + "30" }]}>
          <Ionicons name="information-circle" size={20} color={theme.tint} />
          <Text style={[styles.infoText, { color: theme.tint, fontFamily: "Inter_500Medium" }]}>
            Use your business email credentials. For Gmail, use App Passwords. For Outlook, use your regular password or app password.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            SMTP Server
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              SMTP Host *
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
              value={smtpHost}
              onChangeText={setSmtpHost}
              placeholder="smtp.gmail.com"
              placeholderTextColor={theme.tabIconDefault}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              SMTP Port
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
              value={smtpPort}
              onChangeText={setSmtpPort}
              placeholder="587"
              placeholderTextColor={theme.tabIconDefault}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Credentials
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Email Address *
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
              value={smtpUser}
              onChangeText={setSmtpUser}
              placeholder="notifications@company.com"
              placeholderTextColor={theme.tabIconDefault}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Password *
            </Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
                value={smtpPass}
                onChangeText={setSmtpPass}
                placeholder="App password or email password"
                placeholderTextColor={theme.tabIconDefault}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable
                style={[styles.eyeBtn, { borderColor: theme.border }]}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.testBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
            onPress={() => testMutation.mutate()}
            disabled={testMutation.isPending}
          >
            {testMutation.isPending ? (
              <ActivityIndicator size="small" color={theme.tint} />
            ) : (
              <>
                <Ionicons name="flask-outline" size={18} color={theme.tint} />
                <Text style={[styles.testBtnText, { color: theme.tint, fontFamily: "Inter_600SemiBold" }]}>
                  Test Connection
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.saveBtn, { backgroundColor: theme.tint }]}
            onPress={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#FFF" />
                <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  Save Settings
                </Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={[styles.helpSection, { backgroundColor: theme.surface }]}>
          <Text style={[styles.helpTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Common SMTP Settings
          </Text>
          {[
            { provider: "Gmail", host: "smtp.gmail.com", port: "587" },
            { provider: "Outlook", host: "smtp.office365.com", port: "587" },
            { provider: "Yahoo", host: "smtp.mail.yahoo.com", port: "465" },
          ].map((item) => (
            <Pressable
              key={item.provider}
              style={[styles.helpRow, { borderBottomColor: theme.border }]}
              onPress={() => {
                setSmtpHost(item.host);
                setSmtpPort(item.port);
                showToast(`${item.provider} settings applied`, "info");
              }}
            >
              <View>
                <Text style={[styles.helpProvider, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {item.provider}
                </Text>
                <Text style={[styles.helpDetail, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {item.host} : {item.port}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={theme.tabIconDefault} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: { fontSize: 28, paddingHorizontal: 4, marginBottom: 6 },
  headerSubtitle: { fontSize: 14, lineHeight: 20, paddingHorizontal: 4, marginBottom: 16 },
  infoCard: { flexDirection: "row", padding: 14, borderRadius: 12, gap: 10, borderWidth: 1, marginBottom: 16 },
  infoText: { fontSize: 13, flex: 1, lineHeight: 18 },
  section: { borderRadius: 14, padding: 16, gap: 14, marginBottom: 16 },
  sectionTitle: { fontSize: 12, textTransform: "uppercase" as const, letterSpacing: 1 },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, marginLeft: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15 },
  passwordRow: { flexDirection: "row", gap: 8 },
  passwordInput: { flex: 1 },
  eyeBtn: { width: 48, justifyContent: "center", alignItems: "center", borderWidth: 1, borderRadius: 12 },
  buttonRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  testBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 12, gap: 8, borderWidth: 1 },
  testBtnText: { fontSize: 14 },
  saveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 12, gap: 8 },
  saveBtnText: { fontSize: 14, color: "#FFF" },
  helpSection: { borderRadius: 14, padding: 16 },
  helpTitle: { fontSize: 14, marginBottom: 10 },
  helpRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  helpProvider: { fontSize: 15 },
  helpDetail: { fontSize: 12, marginTop: 2 },
});
