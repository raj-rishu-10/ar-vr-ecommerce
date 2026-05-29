import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RecordingSettings({ settings, onChange, onClose }) {
  const [local, setLocal] = useState({ ...settings });

  const update = (key, value) => setLocal((s) => ({ ...s, [key]: value }));

  const handleApply = () => {
    onChange(local);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1060,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: 420,
            overflow: 'hidden',
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <h6 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: 0 }}>
              ⚙️ Recording & Photo Settings
            </h6>
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '0.85rem',
              }}
            >✕</button>
          </div>

          {/* Body */}
          <div style={{ padding: '1.5rem' }}>
            {/* Microphone */}
            <SettingRow
              icon="🎙"
              label="Microphone"
              sub="Include audio in recordings"
            >
              <Toggle value={local.mic} onChange={(v) => update('mic', v)} id="rec-mic-toggle" />
            </SettingRow>

            {/* UI Overlays */}
            <SettingRow
              icon="🖼"
              label="Include UI Overlays"
              sub="Show toolbar & labels in captures"
            >
              <Toggle value={local.overlays} onChange={(v) => update('overlays', v)} id="rec-overlays-toggle" />
            </SettingRow>

            {/* Resolution */}
            <SettingRow icon="📐" label="Video Resolution" sub="Recording output resolution">
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['720p', '1080p', '4K'].map((r) => (
                  <button
                    key={r}
                    onClick={() => update('resolution', r)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 8,
                      border: `1px solid ${local.resolution === r ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      background: local.resolution === r ? 'var(--accent)' : 'var(--bg-card)',
                      color: local.resolution === r ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </SettingRow>

            {/* Photo Format */}
            <SettingRow icon="📷" label="Photo Format" sub="Image capture format">
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['PNG', 'JPEG', 'WebP'].map((f) => (
                  <button
                    key={f}
                    onClick={() => update('photoFormat', f)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 8,
                      border: `1px solid ${local.photoFormat === f ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      background: local.photoFormat === f ? 'var(--accent)' : 'var(--bg-card)',
                      color: local.photoFormat === f ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </SettingRow>

            {/* Auto-delete */}
            <SettingRow icon="🗓" label="Auto-delete Recordings" sub="Remove old recordings automatically">
              <Toggle value={local.autoDelete} onChange={(v) => update('autoDelete', v)} id="rec-autodelete-toggle" />
            </SettingRow>

            {local.autoDelete && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                style={{ marginTop: '-0.5rem', marginBottom: '1rem', paddingLeft: '2rem' }}
              >
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Delete after (days)
                </label>
                <input
                  type="range"
                  min={7}
                  max={90}
                  step={7}
                  value={local.autoDeleteDays}
                  onChange={(e) => update('autoDeleteDays', Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>7 days</span>
                  <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>{local.autoDeleteDays} days</span>
                  <span>90 days</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex', gap: '0.75rem',
          }}>
            <button className="btn btn-aura-outline" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-aura" style={{ flex: 1 }} onClick={handleApply} id="rec-settings-apply-btn">
              Apply Settings
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SettingRow({ icon, label, sub, children }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.85rem 0',
      borderBottom: '1px solid var(--border-subtle)',
      gap: '1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{sub}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange, id }) {
  return (
    <button
      id={id}
      onClick={() => onChange(!value)}
      style={{
        width: 48,
        height: 26,
        borderRadius: 13,
        border: 'none',
        background: value ? 'var(--accent)' : 'var(--bg-card)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
        boxShadow: value ? 'var(--shadow-glow)' : 'none',
      }}
    >
      <motion.div
        animate={{ x: value ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{
          position: 'absolute',
          top: 3,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'white',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  );
}
