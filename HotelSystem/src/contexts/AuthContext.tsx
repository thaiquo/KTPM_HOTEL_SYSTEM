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

const isAuthError = (error: unknown) => {
  if (!(error instanceof AxiosError)) return false;
  return error.response?.status === 401 || error.response?.status === 403;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const accessToken = tokenStorage.getAccessToken();
      const refreshToken = tokenStorage.getRefreshToken();

      if (accessToken) {
        const tokenUser = buildUserFromAccessToken(accessToken);
        if (tokenUser) {
          try {
            const profileRes = await userApi.getMe();
            setUser(mergeProfileIntoUser(tokenUser, profileRes.data));
          } catch (error) {
            if (isAuthError(error)) {
              tokenStorage.clear();
              setUser(null);
            } else {
              setUser(tokenUser);
            }
          }
          setLoading(false);
          return;
        }
      }

      if (refreshToken) {
        try {
          const refreshed = await authApi.refreshTokens(refreshToken);
          tokenStorage.setTokens(refreshed.data.accessToken, refreshed.data.refreshToken);
          const tokenUser = buildUserFromAccessToken(refreshed.data.accessToken);
          if (tokenUser) {
            try {
              const profileRes = await userApi.getMe();
              setUser(mergeProfileIntoUser(tokenUser, profileRes.data));
            } catch {
              setUser(tokenUser);
            }
          } else {
            setUser(null);
          }
        } catch {
          tokenStorage.clear();
          setUser(null);
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
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
        if (isAuthError(error)) {
          tokenStorage.clear();
          setUser(null);
          return null;
        }
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
        fullName: userData.name || '',
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
        if (isAuthError(error)) {
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
