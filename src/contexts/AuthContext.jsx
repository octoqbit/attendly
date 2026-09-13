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

  const login = useCallback(async (email, password) => {
    const res = await db.signIn(email, password);
    if (res.success) {
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
    localStorage.removeItem('attendly_supabase_url');
    localStorage.removeItem('attendly_supabase_key');
  }, []);

  const isStudent = user?.role === 'Student' || user?.role === 'student';
  const isFaculty = user?.role === 'Faculty' || user?.role === 'faculty';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isStudent,
      isFaculty,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}
