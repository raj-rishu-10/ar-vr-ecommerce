import React from 'react';

export default function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '80vh',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <div className="spinner-border" role="status" style={{ color: 'var(--accent)', width: '3rem', height: '3rem' }}>
        <span className="visually-hidden">Loading...</span>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading experience...</p>
    </div>
  );
}
