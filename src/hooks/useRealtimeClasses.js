import { useState, useEffect, useCallback } from 'react';
import * as db from '../lib/supabase';

/**
 * Custom hook that fetches classes from Supabase and subscribes
 * to Realtime changes — INSERT, UPDATE, DELETE are reflected instantly.
 */
export function useRealtimeClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initial fetch
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await db.getClasses();
      if (!cancelled && res.success) {
        setClasses(res.data);
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = db.subscribeToClasses(
      // INSERT
      (newRow) => {
        if (newRow.is_deleted) return;
        setClasses(prev => {
          // Avoid duplicates
          if (prev.some(c => c.id === newRow.id)) return prev;
          return [newRow, ...prev];
        });
      },
      // UPDATE
      (updatedRow) => {
        setClasses(prev => {
          // If soft-deleted, remove from visible list
          if (updatedRow.is_deleted) {
            return prev.filter(c => c.id !== updatedRow.id);
          }
          // Update in-place
          return prev.map(c => c.id === updatedRow.id ? { ...c, ...updatedRow } : c);
        });
      },
      // DELETE
      (oldRow) => {
        setClasses(prev => prev.filter(c => c.id !== oldRow.id));
      }
    );

    return unsubscribe;
  }, []);

  // Refresh function for manual re-fetch
  const refresh = useCallback(async () => {
    const res = await db.getClasses();
    if (res.success) {
      setClasses(res.data);
    }
  }, []);

  // Add a class optimistically
  const addClass = useCallback((cls) => {
    setClasses(prev => {
      if (prev.some(c => c.id === cls.id)) return prev;
      return [cls, ...prev];
    });
  }, []);

  // Remove a class optimistically (for soft-delete)
  const removeClass = useCallback((classId) => {
    setClasses(prev => prev.filter(c => c.id !== classId));
  }, []);

  // Update a class optimistically
  const updateClass = useCallback((classId, updates) => {
    setClasses(prev => prev.map(c => c.id === classId ? { ...c, ...updates } : c));
  }, []);

  return {
    classes,
    loading,
    refresh,
    addClass,
    removeClass,
    updateClass
  };
}
