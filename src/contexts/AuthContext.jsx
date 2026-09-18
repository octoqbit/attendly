import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as db from '../lib/supabase';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginMode, setLoginMode] = useState(localStorage.getItem('attendly_login_mode') || 'student');

  // Check session on mount
  useEffect(() => {
    let cancelled = false;
    db.getCurrentUser().then(u => {
      if (!cancelled) {
        setUser(u);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email, password, mode = 'student') => {
    const res = await db.signIn(email, password);
    if (res.success) {
      if (res.user.role.toLowerCase() === 'admin') {
        setLoginMode(mode);
        localStorage.setItem('attendly_login_mode', mode);
      }
      setUser(res.user);
    }
    return res;
  }, []);

  const register = useCallback(async (email, password, name, role, additionalData) => {
    return await db.signUp(email, password, name, role, additionalData);
  }, []);

  const logout = useCallback(async () => {
    db.unsubscribeAll();
    await db.signOut();
    setUser(null);
    localStorage.removeItem('attendly_login_mode');
    localStorage.removeItem('attendly_supabase_url');
    localStorage.removeItem('attendly_supabase_key');
  }, []);

  const isStudent = user?.role === 'student' || user?.role === 'Student' || (user?.role === 'admin' && loginMode !== 'admin');
  const isFaculty = user?.role === 'faculty' || user?.role === 'Faculty';
  const isAdmin = user?.role === 'admin' || user?.role === 'Admin';
  const isApproved = user?.is_approved !== false; // Treat null/undefined as true for backwards compatibility with old records

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isStudent,
      isFaculty,
      isAdmin,
      isApproved,
      loginMode,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}
