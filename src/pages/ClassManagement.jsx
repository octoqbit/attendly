import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import * as db from '../lib/supabase';
import ConfirmDialog from '../components/ConfirmDialog';

/**
 * Class Management page — Faculty can view all classes and manage them.
 * Includes delete functionality with double confirmation.
 */
export default function ClassManagement({ classes, onClassDeleted }) {
  const showToast = useToast();
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    await db.deleteClass(deleteTarget.id);
    onClassDeleted(deleteTarget.id);
    showToast(`Session "${deleteTarget.name}" has been deleted.`);
    setDeleteTarget(null);
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3 style={{ fontSize: '20px' }}>All Department Courses</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Manage real-time check-in windows for your subjects</p>
        </div>
      </div>

      <div className="class-grid">
        {classes.map(cls => (
          <div className="class-card" key={cls.id}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--emerald)', textTransform: 'uppercase' }}>
                  {cls.course_code || 'CS-301'}
                </span>
                <span className={`status-pill ${cls.status}`}>{cls.status}</span>
              </div>
              <h3 style={{ fontSize: '18px', margin: '6px 0' }}>{cls.name}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                ⏰ {cls.time || '10:00 AM'}<br />
                📍 {cls.room || 'Main Hall'}<br />
                Branch: {cls.branch || 'CSE'} · {cls.year || '3rd Year'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-emerald" style={{ flex: 1 }}>View Student Roster</button>
              <button
                onClick={() => setDeleteTarget(cls)}
                className="btn btn-danger"
                style={{ fontSize: '12px', padding: '10px 14px' }}
              >
                🗑 Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          itemName={deleteTarget.name}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
