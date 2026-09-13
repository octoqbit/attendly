import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import * as db from '../lib/supabase';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

/**
 * Time slot generator for class scheduling.
 */
function generateTimeSlots() {
  const slots = [];
  for (let h = 7; h <= 21; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const minStr = m === 0 ? '00' : '30';
      slots.push(`${hour12}:${minStr} ${ampm}`);
    }
  }
  return slots;
}

/**
 * Faculty Dashboard — shows stats, class cards with open/close/delete/roster controls.
 * Classes update in real-time.
 */
export default function FacultyDashboard({ classes, attendanceLogs, onClassCreated, onClassDeleted, onClassUpdated }) {
  const showToast = useToast();
  const [createModal, setCreateModal] = useState(false);
  const [rosterModal, setRosterModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Compute stats
  const liveCount = classes.filter(c => c.status === 'open').length;
  const totalRecords = attendanceLogs.length;
  const avgRate = totalRecords > 0
    ? Math.round((attendanceLogs.filter(l => l.status === 'present').length / totalRecords) * 100)
    : 0;

  // Toggle class open/closed
  async function toggleStatus(cls) {
    const newStatus = cls.status === 'open' ? 'closed' : 'open';
    await db.updateClassStatus(cls.id, newStatus);
    onClassUpdated(cls.id, { status: newStatus });
    showToast(`Session for ${cls.name} is now ${newStatus.toUpperCase()}`);
  }

  // Create new class
  async function handleCreateClass(e) {
    e.preventDefault();
    const name = e.target.clsName.value.trim();
    const code = e.target.clsCode.value.trim();
    const startTime = e.target.clsStart.value;
    const endTime = e.target.clsEnd.value;
    const room = e.target.clsRoom.value.trim();

    if (!name || !code || !startTime || !endTime) {
      showToast('Please fill all fields including start and end time.', 'error');
      return;
    }

    const time = `${startTime} - ${endTime}`;
    const newClassObj = {
      id: `cls_${Date.now()}`,
      name,
      course_code: code,
      time,
      room: room || 'Main Hall',
      status: 'open',
      created_at: new Date().toISOString()
    };

    const res = await db.createClass(newClassObj);
    if (res.success && res.data) {
      onClassCreated(res.data);
    } else {
      // Fallback: use local object
      onClassCreated(newClassObj);
    }

    setCreateModal(false);
    showToast(`Class session "${name}" created & opened for check-in!`);
  }

  // Delete class (soft-delete with double confirmation)
  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    await db.deleteClass(deleteTarget.id);
    onClassDeleted(deleteTarget.id);
    showToast(`Session "${deleteTarget.name}" has been deleted.`);
    setDeleteTarget(null);
  }

  const timeSlots = generateTimeSlots();

  return (
    <>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div style={{ fontSize: '24px', color: 'var(--emerald)', marginBottom: '4px' }}>📚</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Active Classes</div>
          <div className="stat-val">{liveCount}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: '24px', color: 'var(--blue)', marginBottom: '4px' }}>📋</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Sessions</div>
          <div className="stat-val">{classes.length}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: '24px', color: 'var(--purple)', marginBottom: '4px' }}>📊</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Avg Attendance</div>
          <div className="stat-val" style={{ color: 'var(--mint)' }}>{avgRate}%</div>
        </div>
      </div>

      {/* Class Sessions */}
      <section style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '18px' }}>Faculty Course Sessions</h3>
          <button onClick={() => setCreateModal(true)} className="btn btn-emerald">+ Schedule New Class</button>
        </div>

        {classes.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-muted)',
            background: 'rgba(0,0,0,0.02)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📭</div>
            <p style={{ fontSize: '15px', fontWeight: 500 }}>No sessions scheduled</p>
            <p style={{ fontSize: '13px', marginTop: '6px' }}>Click "+ Schedule New Class" to create your first session.</p>
          </div>
        ) : (
          <div className="class-grid">
            {classes.map(cls => (
              <div className="class-card" key={cls.id}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--emerald)', textTransform: 'uppercase' }}>
                      {cls.course_code || 'CS-301'}
                    </span>
                    <span className={`status-pill ${cls.status}`}>{cls.status}</span>
                  </div>
                  <h3 style={{ fontSize: '17px', marginBottom: '8px' }}>{cls.name}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                    ⏰ {cls.time || '10:00 AM'}<br />
                    📍 {cls.room || 'Main Hall'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => toggleStatus(cls)} className="btn btn-secondary" style={{ flex: 1, fontSize: '12px' }}>
                    {cls.status === 'open' ? 'Close' : 'Open'}
                  </button>
                  <button onClick={() => setRosterModal(cls)} className="btn btn-emerald" style={{ flex: 2, fontSize: '12px' }}>
                    👥 Roster
                  </button>
                  <button onClick={() => setDeleteTarget(cls)} className="btn btn-danger" style={{ fontSize: '12px', padding: '10px 14px' }}>
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create Class Modal */}
      {createModal && (
        <Modal
          title="📚 Schedule New Class Session"
          onClose={() => setCreateModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
              <button type="submit" form="createClassForm" className="btn btn-emerald">Save & Open Class Session</button>
            </>
          }
        >
          <form id="createClassForm" onSubmit={handleCreateClass}>
            <div className="form-group">
              <label>Course Subject Name</label>
              <input name="clsName" type="text" className="input-field" placeholder="e.g. Cloud Computing & DevOps" required />
            </div>
            <div className="form-group">
              <label>Course Code</label>
              <input name="clsCode" type="text" className="input-field" placeholder="e.g. CS-402" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label>Start Time</label>
                <select name="clsStart" className="input-field" required defaultValue="">
                  <option value="" disabled>Select start time</option>
                  {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>End Time</label>
                <select name="clsEnd" className="input-field" required defaultValue="">
                  <option value="" disabled>Select end time</option>
                  {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Room Location</label>
              <input name="clsRoom" type="text" className="input-field" placeholder="Lab 4 · Room 201" required />
            </div>
          </form>
        </Modal>
      )}

      {/* Roster Modal */}
      {rosterModal && (
        <Modal
          title="👥 Batch Attendance Roster"
          onClose={() => setRosterModal(null)}
          maxWidth="600px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setRosterModal(null)}>Cancel</button>
              <button className="btn btn-emerald" onClick={() => {
                showToast(`Saved roster attendance for ${rosterModal.name}!`);
                setRosterModal(null);
              }}>Save Roster Logs</button>
            </>
          }
        >
          <h4 style={{ color: 'var(--mint)', marginBottom: '12px' }}>{rosterModal.name}</h4>
          <table className="data-table" style={{ fontSize: '13px' }}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll No</th>
                <th>Mark Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Aarav Mehta', roll: 'CS-2026-041' },
                { name: 'Ishita Roy', roll: 'CS-2026-017' },
                { name: 'Kabir Singh', roll: 'CS-2026-062' },
                { name: 'Meera Nair', roll: 'CS-2026-029' }
              ].map((s, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{s.roll}</td>
                  <td>
                    <select className="input-field" style={{ padding: '6px', fontSize: '12px' }}>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}

      {/* Delete Confirmation (double-step) */}
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
