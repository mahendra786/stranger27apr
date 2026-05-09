import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';

export default function AdminStrangerSettings() {
  const [names, setNames] = useState([]);
  const [cities, setCities] = useState([]);
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const [resNames, resCities] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/stranger-names`, { headers: { 'Authorization': token } }),
        fetch(`${API_BASE_URL}/api/admin/stranger-cities`, { headers: { 'Authorization': token } })
      ]);
      const [dataNames, dataCities] = await Promise.all([resNames.json(), resCities.json()]);
      setNames(dataNames);
      setCities(dataCities);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleAddName = async (e) => {
    e.preventDefault();
    if (!newName) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE_URL}/api/admin/stranger-names`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ name: newName })
      });
      if (res.ok) { setNewName(''); fetchSettings(); }
    } catch (err) { alert("Failed to add name"); }
  };

  const handleAddCity = async (e) => {
    e.preventDefault();
    if (!newCity) return;
    
    // Automatically add 🇮🇳 flag if missing
    let cityWithFlag = newCity;
    if (!newCity.includes('🇮🇳') && !newCity.includes('🇮')) {
      cityWithFlag = `🇮🇳 ${newCity}`;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE_URL}/api/admin/stranger-cities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ name: cityWithFlag })
      });
      if (res.ok) { setNewCity(''); fetchSettings(); }
    } catch (err) { alert("Failed to add city"); }
  };

  const handleDeleteName = async (id) => {
    if (!window.confirm("Delete this name?")) return;
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(`${API_BASE_URL}/api/admin/stranger-names/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      fetchSettings();
    } catch (err) { alert("Failed to delete"); }
  };

  const handleDeleteCity = async (id) => {
    if (!window.confirm("Delete this city?")) return;
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(`${API_BASE_URL}/api/admin/stranger-cities/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      fetchSettings();
    } catch (err) { alert("Failed to delete"); }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading settings...</div>;

  return (
    <div style={{ padding: '1.5rem', background: '#f5f5f5', minHeight: '100%', display: 'flex', gap: '2rem' }}>
      {/* Names Column */}
      <div style={{ flex: 1, background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h3>Stranger Names</h3>
        <form onSubmit={handleAddName} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Add new name..." style={{ flexGrow: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #ddd' }} />
          <button type="submit" style={{ background: '#43e97b', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Add</button>
        </form>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {names.map(n => (
            <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #eee' }}>
              <span>{n.name}</span>
              <button onClick={() => handleDeleteName(n.id)} style={{ color: '#ff0844', border: 'none', background: 'none', cursor: 'pointer' }}>Delete</button>
            </div>
          ))}
        </div>
      </div>

      {/* Cities Column */}
      <div style={{ flex: 1, background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h3>Stranger Cities</h3>
        <form onSubmit={handleAddCity} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input type="text" value={newCity} onChange={e => setNewCity(e.target.value)} placeholder="Type city name (flag 🇮🇳 added automatically)..." style={{ flexGrow: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #ddd' }} />
          <button type="submit" style={{ background: '#4facfe', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Add</button>
        </form>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {cities.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #eee' }}>
              <span>{c.name}</span>
              <button onClick={() => handleDeleteCity(c.id)} style={{ color: '#ff0844', border: 'none', background: 'none', cursor: 'pointer' }}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
