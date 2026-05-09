import React, { useState, useEffect } from 'react';

const MALE_NAMES = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Leo", "Alex", "Max", "Sam", "Oliver"];
const FEMALE_NAMES = ["Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen", "Emma", "Olivia", "Ava", "Sophia", "Isabella"];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);

  // Pagination & Search states
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const resUsers = await fetch(`http://localhost:5000/api/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, {
        headers: { 'Authorization': token }
      });
      if (!resUsers.ok) throw new Error('Failed to fetch users');
      const data = await resUsers.json();
      setUsers(data.users);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const fetchAvatars = async () => {
    try {
      const resAvatars = await fetch('http://localhost:5000/api/avatars');
      if (resAvatars.ok) {
        const dataAvatars = await resAvatars.json();
        setAvatars(dataAvatars);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  useEffect(() => {
    fetchAvatars();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user? All their matches and messages will be lost.")) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`http://localhost:5000/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        fetchUsers(); // Refresh current page
      }
    } catch (err) {
      alert("Failed to delete user.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`http://localhost:5000/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token 
        },
        body: JSON.stringify(editingUser)
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
        setEditingUser(null);
      } else {
        alert("Failed to save user.");
      }
    } catch (err) {
      alert("Error saving user.");
    }
  };

  const setRandomName = (gender) => {
    const list = gender === 'M' ? MALE_NAMES : FEMALE_NAMES;
    const randName = list[Math.floor(Math.random() * list.length)];
    setEditingUser({ ...editingUser, nickname: randName });
  };

  const setRandomAvatar = () => {
    if (avatars.length === 0) return;
    const randSeed = avatars[Math.floor(Math.random() * avatars.length)].seed_name;
    setEditingUser({ ...editingUser, avatar_seed: randSeed });
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div style={{ padding: '1.5rem', background: '#f5f5f5', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Manage Users ({totalCount})</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            placeholder="Search nickname..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #ddd', minWidth: '250px', outline: 'none' }}
          />
        </div>
      </div>
      
      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <h3>Edit User #{editingUser.id}</h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${editingUser.avatar_seed || editingUser.nickname}`} 
                alt="Avatar" 
                style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#eee' }}
              />
              <button type="button" onClick={setRandomAvatar} style={{ padding: '0.5rem', background: '#eee', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                🎲 Random Avatar
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold' }}>Nickname</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    value={editingUser.nickname || ''} 
                    onChange={e => setEditingUser({ ...editingUser, nickname: e.target.value })}
                    style={{ flexGrow: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc' }}
                  />
                  <button type="button" onClick={() => setRandomName('M')} title="Random Male Name" style={{ background: '#4facfe', color: 'white', border: 'none', borderRadius: '8px', padding: '0 0.5rem', cursor: 'pointer' }}>♂</button>
                  <button type="button" onClick={() => setRandomName('F')} title="Random Female Name" style={{ background: '#ff0844', color: 'white', border: 'none', borderRadius: '8px', padding: '0 0.5rem', cursor: 'pointer' }}>♀</button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold' }}>Gender</label>
                <select 
                  value={editingUser.gender || 'Other'} 
                  onChange={e => setEditingUser({ ...editingUser, gender: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc' }}
                >
                  <option value="M">Male (M)</option>
                  <option value="F">Female (F)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold' }}>Coins</label>
                  <input 
                    type="number" 
                    value={editingUser.coins || 0} 
                    onChange={e => setEditingUser({ ...editingUser, coins: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold' }}>Is Adult</label>
                  <select 
                    value={editingUser.is_adult || 0} 
                    onChange={e => setEditingUser({ ...editingUser, is_adult: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc' }}
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setEditingUser(null)} style={{ flex: 1, padding: '0.8rem', border: 'none', borderRadius: '8px', cursor: 'pointer', background: '#ddd' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.8rem', border: 'none', borderRadius: '8px', cursor: 'pointer', background: '#ff2d55', color: 'white', fontWeight: 'bold' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && <div style={{ padding: '1rem', background: '#ffebee', color: '#c62828', borderRadius: '8px', marginBottom: '1.5rem' }}>Error: {error}</div>}

      <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '1rem' }}>ID</th>
              <th style={{ padding: '1rem' }}>Avatar</th>
              <th style={{ padding: '1rem' }}>Nickname</th>
              <th style={{ padding: '1rem' }}>Gender</th>
              <th style={{ padding: '1rem' }}>Coins</th>
              <th style={{ padding: '1rem' }}>Joined</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center' }}>Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center' }}>No users found.</td></tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '1rem', color: '#555' }}>#{u.id}</td>
                <td style={{ padding: '1rem' }}>
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.avatar_seed || u.nickname}`} style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eee' }} />
                </td>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{u.nickname}</td>
                <td style={{ padding: '1rem' }}>{u.gender}</td>
                <td style={{ padding: '1rem' }}>{u.coins || 0}</td>
                <td style={{ padding: '1rem', color: '#777', fontSize: '0.9rem' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '1rem' }}>
                  <button onClick={() => setEditingUser({...u})} style={{ background: '#4facfe', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', marginRight: '0.5rem' }}>Edit</button>
                  <button onClick={() => handleDelete(u.id)} style={{ background: '#ff0844', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '1.5rem', borderTop: '1px solid #eee' }}>
            <button 
              disabled={page === 1} 
              onClick={() => setPage(page - 1)}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #ddd', background: page === 1 ? '#f5f5f5' : 'white', cursor: page === 1 ? 'default' : 'pointer' }}
            >
              Previous
            </button>
            
            <span style={{ margin: '0 1rem', fontWeight: 'bold', color: '#555' }}>
              Page {page} of {totalPages}
            </span>

            <button 
              disabled={page === totalPages} 
              onClick={() => setPage(page + 1)}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #ddd', background: page === totalPages ? '#f5f5f5' : 'white', cursor: page === totalPages ? 'default' : 'pointer' }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
