/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AxiosError } from 'axios';
import { authApi, tokenStorage, userApi } from '../services/api';
import { normalizeDateInputValue } from '../shared/lib/date';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  register: (userData: Partial<User> & { password: string }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type JwtPayload = {
  sub?: string;
  role?: string;
  userId?: number;
};

const parseJwt = (token: string): JwtPayload | null => {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;

    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const normalized = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(normalized);

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
};

const buildUserFromAccessToken = (token: string): User | null => {
  const payload = parseJwt(token);
  if (!payload?.sub) return null;

  const email = payload.sub;
  const inferredName = email.split('@')[0] || 'Khách hàng';

  return {
    id: payload.userId != null ? String(payload.userId) : email,
    email,
    name: inferredName,
    fullName: inferredName,
    phone: '',
    phoneNumber: '',
    role: payload.role || 'CUSTOMER',
    dateOfBirth: '',
    address: '',
    imageUrl: '',
  };
};

const mergeProfileIntoUser = (current: User | null, profile: { fullName?: string; name?: string; phone?: string; phoneNumber?: string; dateOfBirth?: string; address?: string; imageUrl?: string }): User | null => {
  if (!current) return null;
  const fullName = profile.fullName || profile.name || current.fullName || current.name;
  const phone = profile.phone || profile.phoneNumber || current.phone || current.phoneNumber || '';
  return {
    ...current,
    name: fullName,
    fullName,
    phone,
    phoneNumber: phone,
    dateOfBirth: normalizeDateInputValue(profile.dateOfBirth || current.dateOfBirth),
    address: profile.address || current.address,
    imageUrl: profile.imageUrl || current.imageUrl,
  };
};

/**
 * Returns true if the error means the token is invalid/user not found in DB.
 * - Any HTTP response error (4xx, 5xx) = credentials are invalid → force logout.
 * - No response (network timeout/offline) = keep token, don't logout.
 */
const isHardAuthError = (error: unknown): boolean => {
  if (!(error instanceof AxiosError)) return false; // Unknown → don't logout
  if (!error.response) return false;                // Network timeout/offline → keep token
  const status = error.response.status;
  // Only clear auth on identity/authorization errors, NOT on server-side failures
  return status === 401 || status === 403 || status === 404;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const accessToken = tokenStorage.getAccessToken();
      const refreshToken = tokenStorage.getRefreshToken();

      // ── CASE 1: access token exists → verify against backend ──────────────
      if (accessToken) {
        const tokenUser = buildUserFromAccessToken(accessToken);
        if (tokenUser) {
          try {
            const profileRes = await userApi.getMe();
            setUser(mergeProfileIntoUser(tokenUser, profileRes.data));
          } catch (error) {
            if (isHardAuthError(error)) {
              // Backend returned error → user/token invalid (e.g. DB was reset)
              tokenStorage.clear();
              setUser(null);
            } else {
              // Network offline only → trust local token temporarily
              setUser(tokenUser);
            }
          }
          setLoading(false);
          return;
        }
      }

      // ── CASE 2: no access token but refresh token exists → try refresh ────
      if (refreshToken) {
        try {
          const refreshed = await authApi.refreshTokens(refreshToken);
          tokenStorage.setTokens(refreshed.data.accessToken, refreshed.data.refreshToken);
          const tokenUser = buildUserFromAccessToken(refreshed.data.accessToken);
          if (tokenUser) {
            try {
              const profileRes = await userApi.getMe();
              setUser(mergeProfileIntoUser(tokenUser, profileRes.data));
            } catch (meError) {
              // getMe failed even after fresh token → DB was reset
              if (isHardAuthError(meError)) {
                tokenStorage.clear();
                setUser(null);
              } else {
                setUser(tokenUser);
              }
            }
          } else {
            tokenStorage.clear();
            setUser(null);
          }
        } catch {
          // Refresh itself failed → DB was reset or tokens expired
          tokenStorage.clear();
          setUser(null);
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User | null> => {
    const response = await authApi.login(email, password);
    const { accessToken, refreshToken } = response.data;
    tokenStorage.setTokens(accessToken, refreshToken);
    const tokenUser = buildUserFromAccessToken(accessToken);
    if (tokenUser) {
      try {
        const profileRes = await userApi.getMe();
        const mergedUser = mergeProfileIntoUser(tokenUser, profileRes.data);
        setUser(mergedUser);
        return mergedUser;
      } catch (error) {
        if (isHardAuthError(error)) {
          tokenStorage.clear();
          setUser(null);
          return null;
        }
        // Network offline: use token-derived user
        setUser(tokenUser);
        return tokenUser;
      }
    } else {
      setUser(null);
      return null;
    }
  };

  const register = async (userData: Partial<User> & { password: string }) => {
    await authApi.register(userData);
    const loginResponse = await authApi.login(userData.email || '', userData.password);
    const { accessToken, refreshToken } = loginResponse.data;
    tokenStorage.setTokens(accessToken, refreshToken);

    const tokenUser = buildUserFromAccessToken(accessToken);

    try {
      await userApi.createProfile({
        name: userData.name || '',
        phone: userData.phone || '',
        address: '',
        dateOfBirth: '',
      });
    } catch (err) {
      // Profile creation can fail if USER service is down or profile already exists.
      console.warn('User profile creation failed', err);
    }

    if (tokenUser) {
      try {
        const profileRes = await userApi.getMe();
        setUser(mergeProfileIntoUser(tokenUser, profileRes.data));
      } catch (error) {
        if (isHardAuthError(error)) {
          tokenStorage.clear();
          setUser(null);
          return;
        }
        setUser(tokenUser);
      }
    } else {
      setUser(null);
    }
  };

  const logout = () => {
    authApi.logout();
    tokenStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
