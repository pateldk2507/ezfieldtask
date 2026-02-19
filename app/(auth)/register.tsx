import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import Colors from "@/constants/colors";

export default function RegisterScreen() {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!fullName || !username || !email || !password || !orgName) {
      setError("All fields are required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await register({
        fullName,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        orgName: orgName.trim(),
      });
      router.replace("/");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const renderInput = (
    icon: string,
    label: string,
    value: string,
    onChangeText: (v: string) => void,
    opts: { placeholder?: string; secure?: boolean; keyboard?: any; autoCapitalize?: any } = {}
  ) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
        {label}
      </Text>
      <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name={icon as any} size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.input, { color: theme.text, fontFamily: "Inter_400Regular" }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={opts.placeholder || ""}
          placeholderTextColor={theme.tabIconDefault}
          secureTextEntry={opts.secure}
          keyboardType={opts.keyboard || "default"}
          autoCapitalize={opts.autoCapitalize || "none"}
          autoCorrect={false}
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
        </View>

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            Create Workspace
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Set up your organization and admin account
          </Text>
        </View>

        <View style={styles.formContainer}>
          {renderInput("business-outline", "Organization Name", orgName, setOrgName, {
            placeholder: "Acme Services Inc.",
            autoCapitalize: "words",
          })}
          {renderInput("person-outline", "Full Name", fullName, setFullName, {
            placeholder: "John Doe",
            autoCapitalize: "words",
          })}
          {renderInput("at-outline", "Username", username, setUsername, {
            placeholder: "johndoe",
          })}
          {renderInput("mail-outline", "Email", email, setEmail, {
            placeholder: "john@acme.com",
            keyboard: "email-address",
          })}
          {renderInput("lock-closed-outline", "Password", password, setPassword, {
            placeholder: "Min 6 characters",
            secure: true,
          })}

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: Colors.urgency.critical + "15" }]}>
              <Ionicons name="alert-circle" size={18} color={Colors.urgency.critical} />
              <Text style={[styles.errorText, { color: Colors.urgency.critical, fontFamily: "Inter_500Medium" }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.registerButton,
              { backgroundColor: theme.tint, opacity: pressed ? 0.9 : 1 },
            ]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={[styles.registerButtonText, { fontFamily: "Inter_600SemiBold" }]}>
                Create Workspace
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  titleContainer: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
  },
  formContainer: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  registerButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  registerButtonText: {
    color: "#FFF",
    fontSize: 16,
  },
});
