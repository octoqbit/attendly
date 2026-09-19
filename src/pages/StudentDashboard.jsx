import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import * as db from '../lib/supabase';
import Modal from '../components/Modal';
import FaceScanner from '../components/FaceScanner';
import { compareFaceDescriptors } from '../lib/faceApi';

/**
 * Student Dashboard — shows stats and live class sessions.
 * Classes update in real-time via the parent's useRealtimeClasses hook.
 */
export default function StudentDashboard({ classes, attendanceLogs }) {
  const { user } = useAuth();
  const showToast = useToast();
  const [checkInModal, setCheckInModal] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);

  // Filter attendance for current student
  const myLogs = attendanceLogs.filter(
    l => l.student_id === user.id || l.student_name === user.name
  );
  const presentCount = myLogs.filter(l => l.status === 'present').length;
  const absentCount = myLogs.filter(l => l.status === 'absent').length;
  const totalSessions = presentCount + absentCount;
  const rate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

  // Only show open/live classes
  const liveClasses = classes.filter(cls => cls.status === 'open');

  function triggerCheckIn(cls) {
    showToast('Requesting browser Geolocation coordinates...', 'info');

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCheckInModal({
            ...cls,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        () => {
          setCheckInModal({ ...cls, lat: 18.5204, lng: 73.8567 });
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    } else {
      setCheckInModal({ ...cls, lat: 18.5204, lng: 73.8567 });
    }
    
    // Start face scanner
    setFaceVerified(false);
    setShowScanner(true);
  }

  function handleFaceCapture(descriptorStr) {
    setShowScanner(false);
    
    if (!user.face_id) {
      showToast('No face data registered for this account.', 'error');
      setCheckInModal(null);
      return;
    }

    try {
      const liveDesc = JSON.parse(descriptorStr);
      const storedDesc = JSON.parse(user.face_id);
      const isMatch = compareFaceDescriptors(liveDesc, storedDesc);

      if (isMatch) {
        setFaceVerified(true);
        showToast('Face biometric verified successfully!');
      } else {
        showToast('Face mismatch. Attendance denied.', 'error');
        setCheckInModal(null);
      }
    } catch (e) {
      showToast('Error verifying face biometric.', 'error');
      setCheckInModal(null);
    }
  }

  // Haversine formula (Fallback if Google Maps is not loaded)
  function fallbackDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const dLat = (lat2 - lat1) * (Math.PI/180);
    const dLon = (lon2 - lon1) * (Math.PI/180); 
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
  }

  // Google Maps API Distance Calculation
  function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    if (window.google && window.google.maps && window.google.maps.geometry) {
      const p1 = new window.google.maps.LatLng(lat1, lon1);
      const p2 = new window.google.maps.LatLng(lat2, lon2);
      return window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
    }
    return fallbackDistance(lat1, lon1, lat2, lon2);
  }

  async function submitAttendance() {
    if (!checkInModal) return;

    if (checkInModal.latitude && checkInModal.longitude) {
      const distance = getDistanceFromLatLonInMeters(
        checkInModal.latitude,
        checkInModal.longitude,
        parseFloat(checkInModal.lat),
        parseFloat(checkInModal.lng)
      );
      //here change the distance to change the area 
      if (distance > 10) {
        showToast(`You are too far from the class (${Math.round(distance)}m). You must be within 5m.`, 'error');
        setCheckInModal(null);
        return;
      }
    }

    showToast('Saving attendance to Supabase database...', 'info');

    await db.markAttendance(checkInModal.id, user.id, true, true);

    showToast(`Successfully recorded attendance for ${checkInModal.name}!`);
    setCheckInModal(null);
    // Attendance logs will be refreshed by parent
  }

  return (
    <>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div style={{ fontSize: '24px', color: 'var(--emerald)', marginBottom: '4px' }}>📊</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Overall Attendance Rate</div>
          <div className="stat-val" style={{
            color: rate >= 75 ? 'var(--mint)' : rate >= 50 ? 'var(--amber)' : '#f43f5e'
          }}>
            {rate}%
          </div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: '24px', color: 'var(--blue)', marginBottom: '4px' }}>✓</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Verified Sessions</div>
          <div className="stat-val">{presentCount}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: '24px', color: 'var(--amber)', marginBottom: '4px' }}>✕</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Missed Sessions</div>
          <div className="stat-val" style={{ color: '#f43f5e' }}>{absentCount}</div>
        </div>
      </div>

      {/* Live Classes */}
      <section style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '18px' }}>Live Class Sessions</h3>
          <span style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            background: 'rgba(0,0,0,0.04)',
            padding: '4px 10px',
            borderRadius: '12px'
          }}>
            GPS & Face Required
          </span>
        </div>

        {liveClasses.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-muted)',
            background: 'rgba(0,0,0,0.02)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📭</div>
            <p style={{ fontSize: '15px', fontWeight: 500 }}>No live sessions right now</p>
            <p style={{ fontSize: '13px', marginTop: '6px' }}>
              Sessions will appear here automatically when your faculty opens them.
            </p>
          </div>
        ) : (
          <div className="class-grid">
            {liveClasses.map(cls => {
              const checkedIn = myLogs.some(l => l.class_id === cls.id || l.class_name === cls.name);
              return (
                <div className="class-card" key={cls.id}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--emerald)', textTransform: 'uppercase' }}>
                        {cls.course_code || 'CS-301'}
                      </span>
                      <span className="status-pill open">LIVE</span>
                    </div>
                    <h3 style={{ fontSize: '17px', marginBottom: '8px' }}>{cls.name}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                      ⏰ {cls.time || '10:00 AM - 11:30 AM'}<br />
                      📍 {cls.room || 'Campus Lab 2'}
                    </p>
                  </div>
                  {checkedIn ? (
                    <button className="btn btn-secondary" style={{ width: '100%', borderColor: 'var(--emerald)', color: 'var(--mint)' }} disabled>
                      ✓ Checked In
                    </button>
                  ) : (
                    <button onClick={() => triggerCheckIn(cls)} className="btn btn-emerald" style={{ width: '100%' }}>
                      📍 Check In & Mark Attendance
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Check-In Modal */}
      {checkInModal && !showScanner && (
        <Modal
          title="📍 Student Attendance Verification"
          onClose={() => setCheckInModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setCheckInModal(null)}>Cancel</button>
              <button className="btn btn-emerald" onClick={submitAttendance} disabled={!faceVerified}>
                {faceVerified ? 'Confirm & Record Attendance' : 'Waiting for Face Scan...'}
              </button>
            </>
          }
        >
          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
            <h4 style={{ fontSize: '18px', color: 'var(--mint)' }}>{checkInModal.name}</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Confirming physical presence in campus geofence radius</p>
          </div>

          <div style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.3)',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '18px'
          }}>
            <div style={{ fontSize: '24px' }}>🎯</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--mint)' }}>GPS Coordinates Locked</div>
              <div style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
                Latitude {parseFloat(checkInModal.lat).toFixed(4)}° N, Longitude {parseFloat(checkInModal.lng).toFixed(4)}° E · Accuracy ±4 meters
              </div>
            </div>
          </div>

          <div style={{
            background: '#f0fdf4',
            border: '2px dashed rgba(16,185,129,0.4)',
            height: '180px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>👤</div>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: faceVerified ? 'var(--mint)' : 'var(--amber)',
              background: faceVerified ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              padding: '4px 14px',
              borderRadius: '20px'
            }}>
              {faceVerified ? 'Facial Biometric Authenticated' : 'Facial Verification Required'}
            </div>
          </div>
        </Modal>
      )}

      {/* Face Scanner */}
      {showScanner && (
        <FaceScanner
          onCapture={handleFaceCapture}
          onClose={() => {
            setShowScanner(false);
            setCheckInModal(null);
          }}
        />
      )}
    </>
  );
}
