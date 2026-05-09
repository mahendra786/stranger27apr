import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';
import AdminSEO from './AdminSEO';
import AdminUsers from './AdminUsers';
import AdminAvatars from './AdminAvatars';
import AdminStrangerSettings from './AdminStrangerSettings';
import AdminFAQs from './AdminFAQs';

function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('adminToken', data.token);
        onLogin(data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  };

  return (
    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ background: 'white', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', width: '100%', maxWidth: '380px' }}>
        <h2 style={{ textAlign: 'center', color: '#ff2d55', marginBottom: '1.5rem', fontSize: '1.8rem' }}>Admin Login</h2>
        {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem', color: '#555' }}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required
              style={{ width: '100%', padding: '0.9rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', outline: 'none' }}
              placeholder="admin"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem', color: '#555' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
              style={{ width: '100%', padding: '0.9rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', outline: 'none' }}
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ marginTop: '0.5rem', background: 'linear-gradient(90deg, #ff2d55, #ff6b6b)', color: 'white', border: 'none', padding: '1rem', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DashboardOverview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    fetch(`${API_BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': token }
    })
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => setStats(data))
      .catch(() => setError(true));
  }, []);

  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>Failed to load stats. Please log in again.</div>;
  if (!stats) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading stats...</div>;

  const statCards = [
    { label: 'Total Users', value: stats.users, icon: '👥', color: '#4facfe' },
    { label: 'Active Matches', value: stats.matches, icon: '🔥', color: '#ff0844' },
    { label: 'Total Messages', value: stats.messages, icon: '💬', color: '#43e97b' },
    { label: 'Online Sockets', value: stats.activeSockets, icon: '🟢', color: '#f6d365' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', padding: '1rem' }}>
      {statCards.map((card, idx) => (
        <div key={idx} style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '2.5rem', background: card.color, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {card.icon}
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>{card.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#222' }}>{card.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard({ onBack }) {
  const [token, setToken] = useState(() => localStorage.getItem('adminToken'));
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
  };

  if (!token) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '1rem', background: 'white', borderBottom: '1px solid #eee' }}>
          <button onClick={onBack} style={{ background: '#eee', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            ← Back to App
          </button>
        </div>
        <AdminLogin onLogin={setToken} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f5f5f5', overflow: 'hidden' }}>
      {/* Admin Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '1rem 1.5rem', borderBottom: '1px solid #ddd' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onBack} style={{ background: '#eee', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            ← Back
          </button>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#333' }}>Admin Panel</h2>
        </div>
        <button onClick={handleLogout} style={{ background: '#ffebee', color: '#c62828', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #ddd', padding: '0 1.5rem', gap: '1.5rem' }}>
        <button 
          onClick={() => setActiveTab('overview')}
          style={{ padding: '1rem 0', border: 'none', background: 'none', fontWeight: 700, fontSize: '1rem', color: activeTab === 'overview' ? '#ff2d55' : '#777', borderBottom: activeTab === 'overview' ? '3px solid #ff2d55' : '3px solid transparent', cursor: 'pointer' }}
        >
          📊 Dashboard Overview
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          style={{ padding: '1rem 0', border: 'none', background: 'none', fontWeight: 700, fontSize: '1rem', color: activeTab === 'users' ? '#ff2d55' : '#777', borderBottom: activeTab === 'users' ? '3px solid #ff2d55' : '3px solid transparent', cursor: 'pointer' }}
        >
          👥 Manage Users
        </button>
        <button 
          onClick={() => setActiveTab('avatars')}
          style={{ padding: '1rem 0', border: 'none', background: 'none', fontWeight: 700, fontSize: '1rem', color: activeTab === 'avatars' ? '#ff2d55' : '#777', borderBottom: activeTab === 'avatars' ? '3px solid #ff2d55' : '3px solid transparent', cursor: 'pointer' }}
        >
          🖼️ Manage Avatars
        </button>
        <button 
          onClick={() => setActiveTab('stranger_settings')}
          style={{ padding: '1rem 0', border: 'none', background: 'none', fontWeight: 700, fontSize: '1rem', color: activeTab === 'stranger_settings' ? '#ff2d55' : '#777', borderBottom: activeTab === 'stranger_settings' ? '3px solid #ff2d55' : '3px solid transparent', cursor: 'pointer' }}
        >
          🎭 Stranger Names
        </button>
        <button 
          onClick={() => setActiveTab('seo')}
          style={{ padding: '1rem 0', border: 'none', background: 'none', fontWeight: 700, fontSize: '1rem', color: activeTab === 'seo' ? '#ff2d55' : '#777', borderBottom: activeTab === 'seo' ? '3px solid #ff2d55' : '3px solid transparent', cursor: 'pointer' }}
        >
          📈 SEO Settings
        </button>
        <button 
          onClick={() => setActiveTab('faqs')}
          style={{ padding: '1rem 0', border: 'none', background: 'none', fontWeight: 700, fontSize: '1rem', color: activeTab === 'faqs' ? '#ff2d55' : '#777', borderBottom: activeTab === 'faqs' ? '3px solid #ff2d55' : '3px solid transparent', cursor: 'pointer' }}
        >
          ❓ Manage FAQs
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flexGrow: 1, overflowY: 'auto' }}>
        {activeTab === 'overview' && <DashboardOverview />}
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'avatars' && <AdminAvatars />}
        {activeTab === 'stranger_settings' && <AdminStrangerSettings />}
        {activeTab === 'seo' && (
          <div style={{ height: '100%', overflow: 'hidden' }}>
            {/* Using the existing AdminSEO component */}
            <AdminSEO onBack={() => {}} />
          </div>
        )}
        {activeTab === 'faqs' && <AdminFAQs />}
      </div>
    </div>
  );
}
