import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Topbar({ title, subtitle }) {
  const { user } = useAuth();

  return (
    <header className="topbar">
      <div>
        <h2 style={{ fontSize: '22px' }}>{title}</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {subtitle || 'Real-time Geofenced Attendance Network'}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(16,185,129,0.12)',
          color: 'var(--mint)',
          border: '1px solid rgba(16,185,129,0.3)',
          padding: '6px 16px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: 600
        }}>
          👋 Welcome, {user?.name}
        </div>
      </div>
    </header>
  );
}
