import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, getApiUrl } from "./query-client";
import { fetch } from "expo/fetch";

interface User {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  username: string;
  role: string;
  phone?: string;
  profilePhotoUrl?: string;
  isActive: boolean;
  isLicensed: boolean;
  notificationsEnabled: boolean;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface AuthContextValue {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, orgSlug: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    username: string;
    orgName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "ez_auth_token";
const USER_KEY = "ez_auth_user";
const ORG_KEY = "ez_auth_org";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const [storedToken, storedUser, storedOrg] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
        AsyncStorage.getItem(ORG_KEY),
      ]);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedOrg) setOrganization(JSON.parse(storedOrg));

        try {
          const baseUrl = getApiUrl();
          const url = new URL("/api/auth/me", baseUrl);
          const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setOrganization(data.organization);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
            await AsyncStorage.setItem(ORG_KEY, JSON.stringify(data.organization));
          } else {
            await clearAuth();
          }
        } catch {
          // Keep cached data if network fails
        }
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }

  async function clearAuth() {
    setUser(null);
    setOrganization(null);
    setToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, ORG_KEY]);
  }

  async function login(email: string, password: string, orgSlug: string) {
    const baseUrl = getApiUrl();
    const url = new URL("/api/auth/login", baseUrl);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, orgSlug }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Login failed");
    }

    const data = await res.json();
    setUser(data.user);
    setOrganization(data.organization);
    setToken(data.token);

    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    await AsyncStorage.setItem(ORG_KEY, JSON.stringify(data.organization));
  }

  async function register(regData: {
    email: string;
    password: string;
    fullName: string;
    username: string;
    orgName: string;
  }) {
    const baseUrl = getApiUrl();
    const url = new URL("/api/auth/register", baseUrl);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(regData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Registration failed");
    }

    const data = await res.json();
    setUser(data.user);
    setOrganization(data.organization);
    setToken(data.token);

    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    await AsyncStorage.setItem(ORG_KEY, JSON.stringify(data.organization));
  }

  async function refreshUser() {
    if (!token) return;
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/me", baseUrl);
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setOrganization(data.organization);
      }
    } catch {
      // Silent fail
    }
  }

  const value = useMemo(
    () => ({
      user,
      organization,
      token,
      isLoading,
      login,
      register,
      logout: clearAuth,
      refreshUser,
    }),
    [user, organization, token, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
