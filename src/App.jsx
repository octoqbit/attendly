import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useRealtimeClasses } from './hooks/useRealtimeClasses';
import * as db from './lib/supabase';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import AuthView from './pages/AuthView';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import ClassManagement from './pages/ClassManagement';
import AttendanceLog from './pages/AttendanceLog';
import AdminDashboard from './pages/AdminDashboard';

import { loadModels } from './lib/faceApi';

import './index.css';

export default function App() {
  const { user, loading, isAdmin, isApproved, loginMode, logout } = useAuth();

  useEffect(() => {
    // Pre-load ML models in the background so face scanner starts instantly
    loadModels().catch(console.error);
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div className="brand-icon" style={{ width: '48px', height: '48px', fontSize: '24px' }}>✓</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading Attendly...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  if (!isApproved) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: 'var(--text-main)' }}>
        <div style={{ background: 'var(--surface-color)', padding: '40px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
          <h2 style={{ margin: '0 0 12px 0' }}>Approval Pending</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
            Your account has been created but requires administrator approval before you can access the platform. Please check back later or contact support.
          </p>
          <button className="btn btn-secondary" onClick={logout} style={{ width: '100%' }}>Sign Out</button>
        </div>
      </div>
    );
  }

  if (isAdmin && loginMode === 'admin') {
    return <AdminDashboard />;
  }

  return <Dashboard />;
}

function Dashboard() {
  const { isStudent } = useAuth();
  const [activePage, setActivePage] = useState('overview');
  const [attendanceLogs, setAttendanceLogs] = useState([]);

  // Real-time classes hook — auto-updates on INSERT/UPDATE/DELETE
  const { classes, addClass, removeClass, updateClass } = useRealtimeClasses();

  // Load attendance logs
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await db.getAttendanceRecords();
      if (!cancelled && res.success) {
        setAttendanceLogs(res.data);
      } else if (!cancelled) {
        // Fallback to localStorage
        const stored = JSON.parse(localStorage.getItem('attendly_attendance_store') || '[]');
        setAttendanceLogs(stored);
      }
    }

    load();

    // Refresh attendance every 30 seconds for near-real-time
    const interval = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const pageTitles = {
    overview: 'Dashboard Overview',
    classes: 'Class Management',
    attendance: 'Attendance Log'
  };

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="main-viewport">
        <Topbar title={pageTitles[activePage] || 'Dashboard'} />

        <main className="page-container">
          {activePage === 'overview' && isStudent && (
            <StudentDashboard classes={classes} attendanceLogs={attendanceLogs} />
          )}

          {activePage === 'overview' && !isStudent && (
            <FacultyDashboard
              classes={classes}
              attendanceLogs={attendanceLogs}
              onClassCreated={addClass}
              onClassDeleted={removeClass}
              onClassUpdated={updateClass}
            />
          )}

          {activePage === 'classes' && !isStudent && (
            <ClassManagement classes={classes} onClassDeleted={removeClass} />
          )}

          {activePage === 'attendance' && (
            <AttendanceLog attendanceLogs={attendanceLogs} />
          )}
        </main>
      </div>
    </div>
  );
}
