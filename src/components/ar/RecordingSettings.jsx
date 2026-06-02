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
        
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
       className="extracted-ui-24">
        <motion.div
          
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) = className="extracted-ui-25"> e.stopPropagation()}
        >
          {/* Header */}
          <div  className="extracted-ui-26">
            <h6  className="extracted-ui-27">
              ⚙️ Recording & Photo Settings
            </h6>
            <button
              onClick={onClose}
              
             className="extracted-ui-9">✕</button>
          </div>

          {/* Body */}
          <div  className="extracted-ui-28">
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
              <div  className="extracted-ui-29">
                {['720p', '1080p', '4K'].map((r) => (
                  <button
                    key={r}
                    onClick={() => update('resolution', r)}
                    className={`setting-btn ${local.resolution === r ? 'active' : ''}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </SettingRow>

            {/* Photo Format */}
            <SettingRow icon="📷" label="Photo Format" sub="Image capture format">
              <div  className="extracted-ui-30">
                {['PNG', 'JPEG', 'WebP'].map((f) => (
                  <button
                    key={f}
                    onClick={() => update('photoFormat', f)}
                    className={`setting-btn ${local.photoFormat === f ? 'active' : ''}`}
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
                
               className="extracted-ui-31">
                <label  className="extracted-ui-10">
                  Delete after (days)
                </label>
                <input
                  type="range"
                  min={7}
                  max={90}
                  step={7}
                  value={local.autoDeleteDays}
                  onChange={(e) => update('autoDeleteDays', Number(e.target.value))}
                  className="extracted-ui-25 range-accent"
                />
                <div  className="extracted-ui-11">
                  <span>7 days</span>
                  <span  className="extracted-ui-12">{local.autoDeleteDays} days</span>
                  <span>90 days</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div  className="extracted-ui-32">
            <button className="extracted-ui-33 btn btn-aura-outline"  onClick={onClose}>
              Cancel
            </button>
            <button className="extracted-ui-34 btn btn-aura"  onClick={handleApply} id="rec-settings-apply-btn">
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
    <div  className="extracted-ui-35">
      <div  className="extracted-ui-36">
        <span  className="extracted-ui-37">{icon}</span>
        <div>
          <div  className="extracted-ui-38">{label}</div>
          <div  className="extracted-ui-13">{sub}</div>
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
      className={`toggle-btn ${value ? 'active' : ''}`}
    >
      <motion.div
        animate={{ x: value ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        
       className="extracted-ui-39"/>
    </button>
  );
}
