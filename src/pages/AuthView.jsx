import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function AuthView() {
  const [mode, setMode] = useState('login');
  const [activeRole, setActiveRole] = useState('student');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register } = useAuth();
  const showToast = useToast();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const email = e.target.loginEmail.value.trim();
    const password = e.target.loginPassword.value;

    showToast('Signing in...', 'info');
    const res = await login(email, password);

    if (res.success) {
      showToast(`Welcome back, ${res.user.name}!`);
    } else {
      setError(res.error);
    }
    setSubmitting(false);
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const name = e.target.regName.value.trim();
    const email = e.target.regEmail.value.trim();
    const password = e.target.regPassword.value;

    const extraData = activeRole === 'student' ? {
      branch: e.target.regBranch.value.trim(),
      roll_number: e.target.regRoll.value.trim()
    } : {
      department: e.target.regDept.value.trim(),
      faculty_id: e.target.regFacultyId.value.trim()
    };

    // Validate faculty ID
    if (activeRole === 'faculty' && extraData.faculty_id !== 'FACULTYECE123') {
      setError('Invalid Faculty ID. Please enter the authorized Faculty ID to register.');
      setSubmitting(false);
      return;
    }

    showToast('Creating user account...', 'info');
    const res = await register(email, password, name, activeRole, extraData);

    if (res.success) {
      showToast('Account registered! Please sign in with your credentials.');
      setMode('login');
      setError('');
    } else {
      setError(res.error || 'Failed to register account');
    }
    setSubmitting(false);
  }

  return (
    <div className="auth-container">
      <section className="auth-banner">
        <div className="brand-logo">
          <div className="brand-icon">✓</div>
          Attend<span>ly</span>
        </div>
        <div className="banner-content">
          <p style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 700, color: 'var(--emerald)', letterSpacing: '1px', marginBottom: '8px' }}>
            Enterprise Campus Attendance
          </p>
          <h1>Automated, Geofenced & Biometric Check-In.</h1>
          <p style={{ color: '#94a3b8', fontSize: '16px', marginTop: '16px', maxWidth: '480px' }}>
            Eliminate proxy attendance with GPS location verification, biometric facial validation, and real-time database analytics for modern educational institutions.
          </p>
          <div className="banner-features">
            <div className="feature-pill">
              <span>🎯</span>
              <h4>GPS Geofencing</h4>
              <p>Strict radius coordinates validation</p>
            </div>
            <div className="feature-pill">
              <span>📸</span>
              <h4>Face Verification</h4>
              <p>Biometric facial verification</p>
            </div>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>© 2026 Attendly Systems · Powered by Supabase</div>
      </section>

      <section className="auth-form-shell">
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(''); }}
            >
              Register
            </button>
          </div>

          {error && (
            <div style={{
              background: 'rgba(244,63,94,0.15)',
              border: '1px solid rgba(244,63,94,0.3)',
              color: '#f43f5e',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              marginBottom: '18px'
            }}>
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email Address</label>
                <input name="loginEmail" type="email" className="input-field" placeholder="student@college.edu or faculty@college.edu" required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <input name="loginPassword" type={showPassword ? "text" : "password"} className="input-field" placeholder="Enter your password" required style={{ paddingRight: '40px' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--text-muted)' }}>
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-emerald" style={{ width: '100%', marginTop: '8px' }} disabled={submitting}>
                {submitting ? 'Signing In...' : 'Sign In to Account'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>I am registering as</label>
                <div className="role-selector">
                  <div
                    className={`role-card ${activeRole === 'student' ? 'active' : ''}`}
                    onClick={() => setActiveRole('student')}
                  >
                    <div style={{ fontSize: '20px' }}>👨‍🎓</div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>Student</div>
                  </div>
                  <div
                    className={`role-card ${activeRole === 'faculty' ? 'active' : ''}`}
                    onClick={() => setActiveRole('faculty')}
                  >
                    <div style={{ fontSize: '20px' }}>👩‍🏫</div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>Faculty</div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Full Name</label>
                <input name="regName" type="text" className="input-field" placeholder="e.g. Aarav Mehta" required />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input name="regEmail" type="email" className="input-field" placeholder="yourname@college.edu" required />
              </div>

              <div className="form-group">
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <input name="regPassword" type={showPassword ? "text" : "password"} className="input-field" placeholder="Create strong password" required style={{ paddingRight: '40px' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--text-muted)' }}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {activeRole === 'student' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Branch / Major</label>
                    <input name="regBranch" type="text" className="input-field" placeholder="Computer Science" required />
                  </div>
                  <div className="form-group">
                    <label>Roll Number</label>
                    <input name="regRoll" type="text" className="input-field" placeholder="CS-2026-041" required />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Department</label>
                    <input name="regDept" type="text" className="input-field" placeholder="Computer Engineering" required />
                  </div>
                  <div className="form-group">
                    <label>Faculty ID</label>
                    <input name="regFacultyId" type="text" className="input-field" placeholder="FAC-108" required />
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-emerald" style={{ width: '100%', marginTop: '8px' }} disabled={submitting}>
                {submitting ? 'Creating Account...' : 'Create Real Account'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
