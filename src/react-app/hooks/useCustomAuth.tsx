import React, { useState, useEffect, useContext, createContext } from "react";
import toast from "react-hot-toast";

interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  profile_image?: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  signup: (userData: {
    email: string;
    password: string;
    name: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

interface ApiUserJson {
  user?: User;
  error?: unknown;
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error?: unknown }).error;
    if (typeof err === "string") return err;
  }
  return fallback;
}

function extractUser(data: unknown): User | null {
  if (data && typeof data === "object" && "user" in data) {
    const u = (data as ApiUserJson).user;
    if (u && typeof u === "object") return u;
  }
  return null;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void checkAuthStatus();
  }, []);

  const checkAuthStatus = async (): Promise<void> => {
    try {
      const response = await fetch("/api/auth/me");
      let data: unknown = null;
      try {
        data = await response.json();
      } catch (err) {
        console.warn("Invalid JSON from /api/auth/me", err);
      }
      if (response.ok) {
        const u = extractUser(data);
        if (u) setUser(u);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: {
    email: string;
    password: string;
  }): Promise<void> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      let data: unknown = null;
      try {
        data = await response.json();
      } catch (err) {
        console.warn("Invalid JSON from /api/auth/login", err);
      }
      if (response.ok) {
        const u = extractUser(data);
        if (u) setUser(u);
        toast.success("Logged in successfully!");
      } else {
        const msg = extractErrorMessage(data, "Login failed");
        throw new Error(msg);
      }
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("Login failed");
      throw error;
    }
  };

  const signup = async (userData: {
    email: string;
    password: string;
    name: string;
  }): Promise<void> => {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      let data: unknown = null;
      try {
        data = await response.json();
      } catch (err) {
        console.warn("Invalid JSON from /api/auth/signup", err);
      }
      if (response.ok) {
        const u = extractUser(data);
        if (u) setUser(u);
        toast.success("Account created successfully!");
      } else {
        const msg = extractErrorMessage(data, "Signup failed");
        throw new Error(msg);
      }
    } catch (error) {
      console.error("Signup failed:", error);
      toast.error("Signup failed");
      throw error;
    }
  };

  // Removed Google OAuth flow

  const logout = async (): Promise<void> => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateProfile = async (data: Partial<User>): Promise<void> => {
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      let body: unknown = null;
      try {
        body = await response.json();
      } catch (err) {
        console.warn("Invalid JSON from /api/auth/profile", err);
      }
      if (response.ok) {
        const u = extractUser(body);
        if (u) setUser(u);
        toast.success("Profile updated!");
      } else {
        const msg = extractErrorMessage(body, "Profile update failed");
        throw new Error(msg);
      }
    } catch (error) {
      console.error("Profile update failed:", error);
      toast.error("Failed to update profile");
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
