import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { apiUrl } from "../config/api";

const AuthContext = createContext(null);

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_INFO_KEY = "userInfo";
const GUEST_TOKEN_KEY = "guestToken";
const GUEST_INFO_KEY = "guestInfo";

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
};

const normalizeRole = (role) => {
  if (!role || typeof role !== "string") {
    return "";
  }
  return role.trim().toUpperCase();
};

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_INFO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

const readStoredGuestInfo = () => {
  try {
    const raw = localStorage.getItem(GUEST_INFO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(localStorage.getItem(ACCESS_TOKEN_KEY) || "");
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem(REFRESH_TOKEN_KEY) || "");
  const [guestToken, setGuestToken] = useState(localStorage.getItem(GUEST_TOKEN_KEY) || "");
  const [guestInfo, setGuestInfo] = useState(readStoredGuestInfo());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Initialize user from localStorage or decode from token
  const [user, setUser] = useState(() => {
    const storedUser = readStoredUser();
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    
    if (storedUser && storedUser.role) {
      return storedUser;
    }
    
    // If no stored user or missing role, decode from token
    if (token) {
      const decoded = decodeJwtPayload(token);
      if (decoded) {
        return {
          username: decoded?.username || decoded?.user_name || "",
          email: decoded?.email || "",
          role: normalizeRole(decoded?.role || decoded?.user_role || decoded?.user?.role),
          department: decoded?.department || ""
        };
      }
    }
    
    return storedUser;
  });

  const refreshAccessToken = async () => {
    if (!refreshToken || isRefreshing) {
      return false;
    }

    setIsRefreshing(true);
    try {
      const response = await fetch(apiUrl("/api/auth/refresh/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken })
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const data = await response.json();
      
      localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
      setAccessToken(data.access);
      
      // Update user info from new token
      const decoded = decodeJwtPayload(data.access);
      if (decoded) {
        const updatedUser = {
          username: decoded?.username || decoded?.user_name || user?.username || "",
          email: decoded?.email || user?.email || "",
          role: normalizeRole(decoded?.role || decoded?.user_role || decoded?.user?.role),
          department: decoded?.department || user?.department || ""
        };
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
      
      return true;
    } catch (error) {
      console.error("Token refresh failed:", error);
      logout();
      return false;
    } finally {
      setIsRefreshing(false);
    }
  };

  const login = ({ access, refresh, role, username, email, department }) => {
    const decoded = decodeJwtPayload(access);
    const resolvedRole = normalizeRole(
      role || decoded?.role || decoded?.user_role || decoded?.user?.role
    );
    const userInfo = {
      username: username || decoded?.username || decoded?.user_name || "",
      email: email || decoded?.email || "",
      role: resolvedRole,
      department: department || decoded?.department || ""
    };

    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    }
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));

    setAccessToken(access);
    setRefreshToken(refresh || "");
    setUser(userInfo);
  };

  // Sync user data with JWT token on mount
  useEffect(() => {
    if (accessToken) {
      const decoded = decodeJwtPayload(accessToken);
      if (decoded && decoded.role) {
        const tokenRole = normalizeRole(decoded.role);
        const storedUser = readStoredUser();
        
        // Update if stored role doesn't match token role
        if (!storedUser || storedUser.role !== tokenRole) {
          const updatedUser = {
            username: storedUser?.username || decoded?.username || decoded?.user_name || "",
            email: storedUser?.email || decoded?.email || "",
            role: tokenRole,
            department: storedUser?.department || decoded?.department || ""
          };
          localStorage.setItem(USER_INFO_KEY, JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
      }
    }
  }, [accessToken]);

  // Auto-refresh token before expiry (check every 5 minutes)
  useEffect(() => {
    if (!accessToken) return;

    const checkAndRefresh = async () => {
      const decoded = decodeJwtPayload(accessToken);
      if (decoded && decoded.exp) {
        const expTime = decoded.exp * 1000;
        const now = Date.now();
        const timeUntilExpiry = expTime - now;
        
        // Refresh if token expires in less than 5 minutes
        if (timeUntilExpiry < 5 * 60 * 1000) {
          await refreshAccessToken();
        }
      }
    };

    const interval = setInterval(checkAndRefresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [accessToken, refreshToken]);

  const guestLogin = ({ guest_code, email, guest_info }) => {
    const guestData = {
      guest_code,
      email,
      ...guest_info,
      is_guest: true
    };

    localStorage.setItem(GUEST_TOKEN_KEY, guest_code);
    localStorage.setItem(GUEST_INFO_KEY, JSON.stringify(guestData));

    setGuestToken(guest_code);
    setGuestInfo(guestData);
  };

  const logout = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    localStorage.removeItem(GUEST_TOKEN_KEY);
    localStorage.removeItem(GUEST_INFO_KEY);
    setAccessToken("");
    setRefreshToken("");
    setUser(null);
    setGuestToken("");
    setGuestInfo(null);
  };

  const value = useMemo(
    () => ({
      accessToken,
      refreshToken,
      user,
      guestToken,
      guestInfo,
      isAuthenticated: Boolean(accessToken),
      isGuest: Boolean(guestToken),
      isRefreshing,
      role: normalizeRole(user?.role),
      login,
      guestLogin,
      logout,
      refreshAccessToken
    }),
    [accessToken, refreshToken, user, guestToken, guestInfo, isRefreshing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
