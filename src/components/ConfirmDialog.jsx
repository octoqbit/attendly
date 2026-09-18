import React, { useState } from 'react';
import Modal from './Modal';

/**
 * Double-confirmation dialog for destructive actions.
 *
 * Step 1: "Are you sure you want to delete {itemName}?"
 * Step 2: "Final confirmation — this cannot be undone."
 *
 * Only after both confirms does it call onConfirm().
 */
export default function ConfirmDialog({ itemName, onConfirm, onCancel }) {
  const [step, setStep] = useState(1);

  if (step === 1) {
    return (
      <Modal
        title="⚠️ Confirm Deletion"
        onClose={onCancel}
        footer={
          <>
            <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            <button className="btn btn-danger" onClick={() => setStep(2)}>Yes, Delete</button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
          <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
            Are you sure you want to delete this session?
          </p>
          <p style={{
            fontSize: '15px',
            color: 'var(--emerald-dark)',
            fontWeight: 700,
            background: 'rgba(16,185,129,0.08)',
            padding: '10px 16px',
            borderRadius: '10px',
            margin: '12px 0'
          }}>
            "{itemName}"
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            This will hide the session from the dashboard.<br />
            Attendance records will be preserved in the database.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="🔴 Final Confirmation"
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Permanently Delete
          </button>
        </>
      }
    >
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(225,29,72,0.1)',
          border: '2px solid rgba(225,29,72,0.3)',
          display: 'grid',
          placeItems: 'center',
          fontSize: '28px',
          margin: '0 auto 16px'
        }}>
          ⚠️
        </div>
        <p style={{ fontSize: '16px', fontWeight: 700, color: '#e11d48', marginBottom: '8px' }}>
          This action cannot be undone!
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          You are about to permanently delete <strong>"{itemName}"</strong> from the dashboard.
          Please confirm one more time to proceed.
        </p>
      </div>
    </Modal>
  );
}
