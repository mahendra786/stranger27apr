import React, { useState, useEffect } from 'react';

const AVATAR_BASE = 'https://api.dicebear.com/7.x/avataaars/svg';
const AVATAR_SEEDS = ['Felix', 'Aneka', 'Oliver', 'Molly', 'Jack', 'Mia', 'Leo', 'Zoe', 'Max', 'Luna', 'Sam', 'Ruby', 'Luke', 'Lily', 'Alex', 'Chloe', 'Ryan', 'Emma', 'Tom', 'Lucy'];

const Toggle = ({ value, onChange, color = '#ff2d55' }) => (
  <div
    onClick={() => onChange(!value)}
    style={{
      width: '50px', height: '28px',
      borderRadius: '14px',
      background: value ? color : '#ccc',
      position: 'relative',
      cursor: 'pointer',
      transition: 'background 0.25s',
      flexShrink: 0,
    }}
  >
    <div style={{
      position: 'absolute',
      top: '3px',
      left: value ? '25px' : '3px',
      width: '22px', height: '22px',
      borderRadius: '50%',
      background: 'white',
      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      transition: 'left 0.25s',
    }} />
  </div>
);

const Row = ({ label, right, onClick, border = true }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.95rem 1.2rem',
      borderBottom: border ? '1px solid #f0f0f0' : 'none',
      cursor: onClick ? 'pointer' : 'default',
      background: 'white',
    }}
  >
    <span style={{ fontSize: '0.95rem', color: '#222' }}>{label}</span>
    <span style={{ color: '#aaa', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>{right}</span>
  </div>
);

const SectionTitle = ({ title }) => (
  <div style={{ padding: '1rem 1rem 0.4rem', fontWeight: 'bold', fontSize: '0.95rem', color: '#333' }}>
    {title}
  </div>
);

const Card = ({ children }) => (
  <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', margin: '0 1rem 1.2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
    {children}
  </div>
);

function Settings({ socket, settings, onSettingsChange, avatarSeed, onAvatarChange, darkMode, onDarkModeChange }) {
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('fontSize') || '16'));
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showMatchSettings, setShowMatchSettings] = useState(false);

  const update = (key, value) => {
    const next = { ...settings, [key]: value };
    onSettingsChange(next);
    if (socket) socket.emit('update_settings', { allowSearch: next.allowSearch, autoFriendAccept: next.autoFriendAccept });
  };

  const handleFontSize = (size) => {
    setFontSize(size);
    localStorage.setItem('fontSize', size);
    document.documentElement.style.fontSize = size + 'px';
    setShowFontPicker(false);
  };

  return (
    <div style={{ flexGrow: 1, overflowY: 'auto', background: '#f0f0f0', paddingBottom: '2rem' }}>

      {/* ── Matching & Chat ─────────────────────────── */}
      <SectionTitle title="Matching & Chat" />
      <Card>
        <Row
          label="Alarm setting"
          right={<span style={{ fontSize: '1.1rem' }}>›</span>}
          onClick={() => {}}
        />
        <Row
          label="Avatar"
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src={`${AVATAR_BASE}?seed=${avatarSeed || 'Felix'}&backgroundColor=c0aede`} style={{ width: '30px', height: '30px', borderRadius: '50%' }} alt="avatar" />
              <span style={{ fontSize: '1.1rem' }}>›</span>
            </div>
          }
          onClick={() => setShowAvatarPicker(true)}
        />
        <Row
          label="Match Settings"
          right={<span style={{ fontSize: '1.1rem' }}>›</span>}
          onClick={() => setShowMatchSettings(true)}
        />
        <Row
          label="Allow friend search"
          right={<Toggle value={settings.allowSearch} onChange={v => update('allowSearch', v)} />}
        />
        <Row
          label="Allow Auto-Friend Accept"
          right={<Toggle value={settings.autoFriendAccept} onChange={v => update('autoFriendAccept', v)} color="#333" />}
        />
        <Row
          label="Automatic Translation"
          right={<Toggle value={settings.autoTranslate} onChange={v => onSettingsChange({ ...settings, autoTranslate: v })} />}
          border={false}
        />
      </Card>

      {/* ── App Preferences ─────────────────────────── */}
      <SectionTitle title="App Preferences" />
      <Card>
        <Row
          label="Dark Mode"
          right={<Toggle value={darkMode} onChange={onDarkModeChange} color="#333" />}
        />
        <Row
          label="App Language Settings"
          right={<span style={{ fontSize: '0.85rem', color: '#aaa' }}>System defaults</span>}
          onClick={() => {}}
        />
        <Row
          label="App Font Size"
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.9rem', color: '#666' }}>{fontSize}</span>
              <span style={{ fontSize: '1.1rem', color: '#aaa' }}>›</span>
            </div>
          }
          onClick={() => setShowFontPicker(true)}
        />
        <Row
          label="Photo Picker"
          right={<span style={{ fontSize: '0.9rem', color: '#aaa' }}>-</span>}
          border={false}
        />
      </Card>

      {/* ── Premium ─────────────────────────────────── */}
      <SectionTitle title="Premium" />
      <Card>
        <Row label="Subscribe Premium" right={<span style={{ fontSize: '1.1rem' }}>›</span>} onClick={() => {}} />
        <Row label="Restore Purchase" right={<span style={{ fontSize: '1.1rem' }}>›</span>} onClick={() => {}} border={false} />
      </Card>

      {/* ── Account ─────────────────────────────────── */}
      <SectionTitle title="Account" />
      <Card>
        <Row label="Privacy Policy" right={<span style={{ fontSize: '1.1rem' }}>›</span>} onClick={() => {}} />
        <Row label="Terms of Service" right={<span style={{ fontSize: '1.1rem' }}>›</span>} onClick={() => {}} />
        <Row label="Delete Account" right={<span style={{ color: '#ff3b30', fontSize: '1.1rem' }}>›</span>} onClick={() => {}} border={false} />
      </Card>

      {/* ── Avatar Picker Modal ──────────────────────── */}
      {showAvatarPicker && (
        <div
          onClick={() => setShowAvatarPicker(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: '480px', maxHeight: '70vh', overflowY: 'auto' }}
          >
            <h3 style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '1.1rem' }}>Choose Your Avatar</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {AVATAR_SEEDS.map(seed => (
                <div
                  key={seed}
                  onClick={() => { onAvatarChange(seed); setShowAvatarPicker(false); }}
                  style={{
                    cursor: 'pointer', borderRadius: '12px', padding: '6px',
                    background: avatarSeed === seed ? '#ffebee' : 'transparent',
                    border: `2px solid ${avatarSeed === seed ? '#ff2d55' : 'transparent'}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  }}
                >
                  <img src={`${AVATAR_BASE}?seed=${seed}&backgroundColor=c0aede`} style={{ width: '60px', height: '60px', borderRadius: '50%' }} alt={seed} />
                  <span style={{ fontSize: '0.7rem', color: '#666' }}>{seed}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Font Size Picker Modal ───────────────────── */}
      {showFontPicker && (
        <div
          onClick={() => setShowFontPicker(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: '480px' }}
          >
            <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>App Font Size</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {[12, 13, 14, 15, 16, 17, 18, 20].map(s => (
                <button
                  key={s}
                  onClick={() => handleFontSize(s)}
                  style={{
                    width: '50px', height: '50px', borderRadius: '50%',
                    border: fontSize === s ? '2px solid #ff2d55' : '2px solid #eee',
                    background: fontSize === s ? '#ffebee' : 'white',
                    color: fontSize === s ? '#ff2d55' : '#333',
                    fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer',
                  }}
                >{s}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Match Settings Sheet ─────────────────────── */}
      {showMatchSettings && (
        <div
          onClick={() => setShowMatchSettings(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: '480px' }}
          >
            <h3 style={{ textAlign: 'center', marginBottom: '1.2rem' }}>Match Settings</h3>
            {[
              { label: 'Match with All genders', key: 'matchAll' },
              { label: 'Match with Male only', key: 'matchMale' },
              { label: 'Match with Female only', key: 'matchFemale' },
            ].map(opt => (
              <div
                key={opt.key}
                onClick={() => onSettingsChange({ ...settings, matchGender: opt.key })}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0.5rem', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '0.95rem' }}>{opt.label}</span>
                {settings.matchGender === opt.key && <span style={{ color: '#ff2d55', fontWeight: 'bold' }}>✓</span>}
              </div>
            ))}
            <button onClick={() => setShowMatchSettings(false)} style={{ width: '100%', marginTop: '1rem', padding: '0.9rem', background: '#ff2d55', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
