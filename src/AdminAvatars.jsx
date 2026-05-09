import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';

export default function AdminAvatars() {
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAvatar, setEditingAvatar] = useState(null);
  const [newAvatar, setNewAvatar] = useState({ seed_name: '', gender: 'Other' });
  const [isAdding, setIsAdding] = useState(false);

  const fetchAvatars = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/avatars`);
      if (res.ok) {
        const data = await res.json();
        setAvatars(data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAvatars();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this avatar?")) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE_URL}/api/admin/avatars/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      if (res.ok) setAvatars(avatars.filter(a => a.id !== id));
    } catch (err) {
      alert("Failed to delete avatar.");
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE_URL}/api/admin/avatars/${editingAvatar.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify(editingAvatar)
      });
      if (res.ok) {
        setAvatars(avatars.map(a => a.id === editingAvatar.id ? editingAvatar : a));
        setEditingAvatar(null);
      } else {
        alert("Failed to save avatar.");
      }
    } catch (err) {
      alert("Error saving avatar.");
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE_URL}/api/admin/avatars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify(newAvatar)
      });
      if (res.ok) {
        const data = await res.json();
        setAvatars([...avatars, { id: data.id, seed_name: data.seed_name, gender: data.gender }]);
        setIsAdding(false);
        setNewAvatar({ seed_name: '', gender: 'Other' });
      } else {
        alert("Failed to add avatar. Name might already exist.");
      }
    } catch (err) {
      alert("Error adding avatar.");
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading avatars...</div>;

  return (
    <div style={{ padding: '1.5rem', background: '#f5f5f5', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Manage Avatar Icons</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href="https://www.dicebear.com/styles/avataaars/" target="_blank" rel="noopener noreferrer" style={{ color: '#4facfe', fontWeight: 'bold', fontSize: '0.9rem', textDecoration: 'none' }}>
            🔗 Find more names at DiceBear
          </a>
          <button onClick={() => setIsAdding(true)} style={{ background: '#43e97b', color: 'white', border: 'none', padding: '0.8rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            + Add New Avatar
          </button>
        </div>
      </div>

      {isAdding && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h3>Add New Avatar</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>Avatar Seed Name</label>
              <input type="text" value={newAvatar.seed_name} onChange={e => setNewAvatar({...newAvatar, seed_name: e.target.value})} required style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #ccc' }} placeholder="e.g. Felix" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>Category</label>
              <select value={newAvatar.gender} onChange={e => setNewAvatar({...newAvatar, gender: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #ccc' }}>
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <button type="submit" style={{ padding: '0.6rem 1.2rem', background: '#4facfe', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Add</button>
            <button type="button" onClick={() => setIsAdding(false)} style={{ padding: '0.6rem 1.2rem', background: '#ddd', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
          </form>
          
          {newAvatar.seed_name && (
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span>Preview:</span>
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${newAvatar.seed_name}`} style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#eee' }} />
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {avatars.map(a => (
          <div key={a.id} style={{ background: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${a.seed_name}`} style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#eee', marginBottom: '1rem' }} />
            
            {editingAvatar?.id === a.id ? (
              <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input type="text" value={editingAvatar.seed_name} onChange={e => setEditingAvatar({...editingAvatar, seed_name: e.target.value})} required style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                <select value={editingAvatar.gender} onChange={e => setEditingAvatar({...editingAvatar, gender: e.target.value})} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="M">Male (M)</option>
                  <option value="F">Female (F)</option>
                  <option value="Other">Other</option>
                </select>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '0.4rem', background: '#4facfe', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                  <button type="button" onClick={() => setEditingAvatar(null)} style={{ flex: 1, padding: '0.4rem', background: '#ddd', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            ) : (
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>{a.seed_name}</h4>
                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1rem' }}>Category: {a.gender}</div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button onClick={() => setEditingAvatar(a)} style={{ padding: '0.4rem 0.8rem', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDelete(a.id)} style={{ padding: '0.4rem 0.8rem', background: '#ff0844', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
