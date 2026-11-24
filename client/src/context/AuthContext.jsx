import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Start from the cached session so the app renders instantly; /auth/me revalidates in the background.
  const cached = (key) => {
    try { return localStorage.getItem('pos_token') ? JSON.parse(localStorage.getItem(key)) : null; } catch { return null; }
  };
  const [user, setUser] = useState(() => cached('pos_user'));
  const [activeShop, setActiveShop] = useState(() => cached('pos_active_shop'));
  const [loading, setLoading] = useState(() => !(cached('pos_user') && cached('pos_active_shop')) && !!localStorage.getItem('pos_token'));

  const refreshSession = useCallback(async (signal) => {
    if (!localStorage.getItem('pos_token')) return;
    const res = await api.get('/auth/me', { signal });
    if (signal?.aborted) return;
    setUser(res.data.data.user);
    syncShop(res.data.data.shop);
  }, []);

  function syncShop(shop) {
    setActiveShop(shop ?? null);
    if (shop) localStorage.setItem('pos_active_shop', JSON.stringify(shop));
    else localStorage.removeItem('pos_active_shop');
  }

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => refreshSession(controller.signal).catch(() => {});
    refresh().finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    window.addEventListener('pos:shop-status-changed', refresh);
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('pos:shop-status-changed', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [refreshSession]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const { token, user: userData, shop: shopData } = res.data.data;
      localStorage.setItem('pos_token', token);
      localStorage.setItem('pos_user', JSON.stringify(userData));
      setUser(userData);

      syncShop(shopData);
      return { success: true, user: userData, shop: shopData };
    }
    return { success: false, message: res.data.message };
  };

  const registerShop = async (formData) => {
    const res = await api.post('/auth/register-shop', formData);
    if (res.data.success) {
      const { token, user: userData, shop: shopData } = res.data.data;
      localStorage.setItem('pos_token', token);
      localStorage.setItem('pos_user', JSON.stringify(userData));
      setUser(userData);
      syncShop(shopData);
      return { success: true };
    }
    return { success: false, message: res.data.message };
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    localStorage.removeItem('pos_active_shop');
    localStorage.removeItem('pos_admin_mode');
    setUser(null);
    setActiveShop(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeShop,
        loading,
        isAuthenticated: !!user,
        isSuperAdmin: user?.isSuperAdmin || false,
        login,
        registerShop,
        logout,
        refreshSession,
        setActiveShop
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
