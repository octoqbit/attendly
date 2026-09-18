import React from 'react';

/**
 * Reusable modal dialog overlay.
 * Renders children inside the standard Attendly modal chrome.
 */
export default function Modal({ title, onClose, children, footer, maxWidth = '520px' }) {
  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal-dialog" style={{ maxWidth }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '18px' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
