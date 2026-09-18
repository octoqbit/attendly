import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import * as db from '../lib/supabase';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const showToast = useToast();
  const [activeTab, setActiveTab] = useState('faculty');
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [uRes, cRes, aRes] = await Promise.all([
      db.getAllUsers(),
      db.getClasses(),
      db.getAttendanceRecords()
    ]);
    
    if (uRes.success) setUsers(uRes.data);
    if (cRes.success) setClasses(cRes.data);
    if (aRes.success) setAttendance(aRes.data);
    setLoading(false);
  }

  async function handleApprove(userId) {
    if (!window.confirm("Approve this faculty member?")) return;
    const res = await db.approveUser(userId);
    if (res.success) {
      showToast("User approved!");
      loadData();
    } else {
      showToast("Error approving user.", "error");
    }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm("Permanently delete this user? This cannot be undone.")) return;
    const res = await db.deleteUser(userId);
    if (res.success) {
      showToast("User deleted!");
      loadData();
    } else {
      showToast("Error deleting user.", "error");
    }
  }

  async function handleDeleteClass(classId) {
    if (!window.confirm("Delete this class?")) return;
    const res = await db.deleteClass(classId); // We can just soft delete or use custom hard delete
    if (res.success) {
      showToast("Class deleted!");
      loadData();
    } else {
      showToast("Error deleting class.", "error");
    }
  }

  async function handleDeleteAttendance(attId) {
    if (!window.confirm("Delete this attendance record?")) return;
    const res = await db.deleteAttendance(attId);
    if (res.success) {
      showToast("Record deleted!");
      loadData();
    } else {
      showToast("Error deleting record.", "error");
    }
  }

  const pendingFaculty = users.filter(u => u.role === 'faculty' && !u.is_approved);
  const allUsers = users.filter(u => u.role !== 'admin');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-main)', padding: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', background: 'var(--surface-color)', padding: '16px 24px', borderRadius: '12px', border: '1px solid rgba(244,63,94,0.3)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#f43f5e' }}>🛡️ Admin Portal</span>
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>System Control and Oversight</p>
        </div>
        <button className="btn btn-secondary" onClick={logout}>Sign Out</button>
      </header>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <TabButton active={activeTab === 'faculty'} onClick={() => setActiveTab('faculty')}>
          Faculty Approvals {pendingFaculty.length > 0 && <span style={{ background: '#f43f5e', color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '12px', marginLeft: '8px' }}>{pendingFaculty.length}</span>}
        </TabButton>
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>All Users</TabButton>
        <TabButton active={activeTab === 'classes'} onClick={() => setActiveTab('classes')}>Classes</TabButton>
        <TabButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')}>Attendance Records</TabButton>
      </div>

      <main style={{ background: 'var(--surface-color)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        {loading ? <p>Loading data...</p> : (
          <>
            {activeTab === 'faculty' && (
              <div>
                <h2>Pending Faculty Accounts</h2>
                {pendingFaculty.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No pending approvals.</p> : (
                  <table style={tableStyle}>
                    <thead>
                      <tr><th>Name</th><th>Email</th><th>Dept</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {pendingFaculty.map(f => (
                        <tr key={f.id}>
                          <td>{f.name}</td>
                          <td>{f.email}</td>
                          <td>{f.department}</td>
                          <td>
                            <button className="btn btn-emerald" style={{ padding: '4px 12px', fontSize: '13px', marginRight: '8px' }} onClick={() => handleApprove(f.id)}>Approve</button>
                            <button className="btn" style={{ padding: '4px 12px', fontSize: '13px', background: '#f43f5e', color: 'white', border: 'none' }} onClick={() => handleDeleteUser(f.id)}>Reject (Delete)</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <h2>Manage All Users</h2>
                <table style={tableStyle}>
                  <thead>
                    <tr><th>Name</th><th>Role</th><th>Email</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {allUsers.map(u => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                        <td>{u.email}</td>
                        <td>{u.is_approved ? 'Active' : 'Pending'}</td>
                        <td>
                          <button className="btn" style={{ padding: '4px 12px', fontSize: '13px', background: '#f43f5e', color: 'white', border: 'none' }} onClick={() => handleDeleteUser(u.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'classes' && (
              <div>
                <h2>Manage Classes</h2>
                <table style={tableStyle}>
                  <thead>
                    <tr><th>Class Name</th><th>Course Code</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {classes.map(c => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{c.course_code}</td>
                        <td>{c.is_deleted ? 'Soft Deleted' : 'Active'}</td>
                        <td>
                          <button className="btn" style={{ padding: '4px 12px', fontSize: '13px', background: '#f43f5e', color: 'white', border: 'none' }} onClick={() => handleDeleteClass(c.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'attendance' && (
              <div>
                <h2>Attendance Logs</h2>
                <table style={tableStyle}>
                  <thead>
                    <tr><th>Date</th><th>Class ID</th><th>Student ID</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {attendance.map(a => (
                      <tr key={a.id}>
                        <td>{a.date} {a.time}</td>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.class_id}</td>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.student_id}</td>
                        <td>
                           <span style={{ 
                            background: a.status === 'present' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                            color: a.status === 'present' ? 'var(--emerald)' : '#f43f5e',
                            padding: '2px 8px', borderRadius: '12px', fontSize: '12px'
                          }}>
                            {a.status}
                          </span>
                        </td>
                        <td>
                          <button className="btn" style={{ padding: '4px 12px', fontSize: '13px', background: '#f43f5e', color: 'white', border: 'none' }} onClick={() => handleDeleteAttendance(a.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'var(--blue)' : 'var(--surface-color)',
      color: active ? 'white' : 'var(--text-main)',
      border: `1px solid ${active ? 'var(--blue)' : 'var(--border-color)'}`,
      padding: '8px 16px',
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center'
    }}>
      {children}
    </button>
  );
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left'
};
