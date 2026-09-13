import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar({ activePage, onNavigate }) {
  const { user, isStudent, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div>
        <a href="#" className="brand-logo" onClick={(e) => e.preventDefault()}>
          <div className="brand-icon">✓</div>
          <span>Attend</span>ly
        </a>

        <nav className="sidebar-nav">
          <a
            href="#"
            className={`nav-link ${activePage === 'overview' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); onNavigate('overview'); }}
          >
            <span>📊</span> Dashboard
          </a>

          {!isStudent && (
            <a
              href="#"
              className={`nav-link ${activePage === 'classes' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); onNavigate('classes'); }}
            >
              <span>📚</span> Class Sessions
            </a>
          )}

          <a
            href="#"
            className={`nav-link ${activePage === 'attendance' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); onNavigate('attendance'); }}
          >
            <span>✓</span> Attendance Log
          </a>
        </nav>
      </div>

      <div className="user-profile-bar">
        <div className="avatar-circle">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="user-info" style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.name}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
            {user?.role}
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign Out"
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '16px', cursor: 'pointer' }}
        >
          🚪
        </button>
      </div>
    </aside>
  );
}
