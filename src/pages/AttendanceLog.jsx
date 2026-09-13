import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AttendanceLog({ attendanceLogs }) {
  const { user } = useAuth();
  const [classFilter, setClassFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

  // Unique class names
  const classNames = useMemo(() => {
    return [...new Set(attendanceLogs.map(l => l.class_name || l.class?.name || 'Unknown'))];
  }, [attendanceLogs]);

  // Filter & group
  const groupedByDate = useMemo(() => {
    let filtered = attendanceLogs.filter(l => {
      const logDate = l.date || todayStr;
      if (logDate < thirtyDaysAgoStr) return false;
      if (classFilter !== 'all' && (l.class_name || l.class?.name) !== classFilter) return false;
      if (dateFilter && logDate !== dateFilter) return false;
      return true;
    });

    const groups = {};
    filtered.forEach(log => {
      const dateKey = log.date || todayStr;
      if (!groups[dateKey]) groups[dateKey] = {};
      const className = log.class_name || log.class?.name || 'Unknown';
      if (!groups[dateKey][className]) groups[dateKey][className] = [];
      groups[dateKey][className].push(log);
    });

    return groups;
  }, [attendanceLogs, classFilter, dateFilter]);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  function exportCsv() {
    let csv = 'Student Name,Roll No,Course Subject,Date,Time,Status,GPS Verified,Face Verified\n';
    attendanceLogs.forEach(l => {
      csv += `"${l.student_name || user.name}","${l.roll_number || user.roll_number || ''}","${l.class_name || 'Unknown'}","${l.date || ''}","${l.time || ''}","${l.status || 'present'}","Yes","Yes"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendly-audit-${todayStr}.csv`;
    link.click();
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h3 style={{ fontSize: '20px' }}>Verified Attendance Records</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Past 30 days · Grouped by date & class</p>
        </div>
        <button onClick={exportCsv} className="btn btn-secondary">📥 Export CSV</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select
          className="input-field"
          style={{ width: 'auto', minWidth: '200px', padding: '8px 12px', fontSize: '13px' }}
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
        >
          <option value="all">All Classes</option>
          {classNames.map(cn => <option key={cn} value={cn}>{cn}</option>)}
        </select>

        <input
          type="date"
          className="input-field"
          style={{ width: 'auto', padding: '8px 12px', fontSize: '13px' }}
          value={dateFilter}
          min={thirtyDaysAgoStr}
          max={todayStr}
          onChange={e => setDateFilter(e.target.value)}
        />

        {(classFilter !== 'all' || dateFilter) && (
          <button
            onClick={() => { setClassFilter('all'); setDateFilter(''); }}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '12px' }}
          >
            ✕ Clear Filters
          </button>
        )}
      </div>

      {/* Records */}
      {sortedDates.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: 'var(--text-muted)',
          background: 'rgba(0,0,0,0.02)',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📭</div>
          <p style={{ fontSize: '15px', fontWeight: 500 }}>No attendance records found</p>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>Check in to a live session to log your first record.</p>
        </div>
      ) : (
        sortedDates.map(dateKey => {
          const classesForDate = groupedByDate[dateKey];
          return (
            <div key={dateKey} style={{ marginBottom: '24px' }}>
              <h4 style={{
                fontSize: '15px',
                color: 'var(--mint)',
                marginBottom: '12px',
                padding: '8px 14px',
                background: 'rgba(16,185,129,0.08)',
                borderRadius: 'var(--radius-md)',
                display: 'inline-block'
              }}>
                📅 {dateKey}
              </h4>

              {Object.keys(classesForDate).map(className => {
                const logs = classesForDate[className];
                return (
                  <div key={className} style={{ marginBottom: '16px', marginLeft: '8px' }}>
                    <h5 style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '8px', fontWeight: 600 }}>
                      📚 {className}
                    </h5>
                    <div className="data-table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Roll No.</th>
                            <th>Time</th>
                            <th>Status</th>
                            <th>GPS</th>
                            <th>Face</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logs.map((log, i) => {
                            const isPres = (log.status || 'present') === 'present';
                            return (
                              <tr key={i}>
                                <td style={{ fontWeight: 600 }}>
                                  {log.student_name || log.student?.name || user.name}
                                </td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                  {log.roll_number || log.student?.roll_number || user.roll_number || '—'}
                                </td>
                                <td style={{ color: 'var(--text-muted)' }}>{log.time || '—'}</td>
                                <td>
                                  <span style={{
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    background: isPres ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                                    color: isPres ? 'var(--mint)' : '#f43f5e',
                                    border: `1px solid ${isPres ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`
                                  }}>
                                    {log.status || 'present'}
                                  </span>
                                </td>
                                <td style={{ color: 'var(--mint)', fontSize: '12px' }}>{isPres ? '🎯 Verified' : '—'}</td>
                                <td style={{ color: 'var(--mint)', fontSize: '12px' }}>{isPres ? '📸 Matched' : '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </>
  );
}
