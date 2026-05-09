import React, { useState, useEffect } from 'react';

export default function AdminSEO({ onBack }) {
  const [seoData, setSeoData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Define the pages we want to manage SEO for
  const pages = ['chat', 'friends', 'find_friend', 'nearby', 'settings'];

  useEffect(() => {
    fetch('http://localhost:5000/api/seo')
      .then(res => res.json())
      .then(data => {
        setSeoData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load SEO data:', err);
        setLoading(false);
      });
  }, []);

  const handleSave = async (page) => {
    setSaving(true);
    const data = seoData[page] || { page_name: page, title: '', description: '', keywords: '' };
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('http://localhost:5000/api/seo', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token 
        },
        body: JSON.stringify({
          page_name: page,
          title: data.title || '',
          description: data.description || '',
          keywords: data.keywords || ''
        })
      });
      if (!res.ok) throw new Error('Unauthorized or server error');
      alert(`SEO settings for ${page} saved successfully!`);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save settings.');
    }
    setSaving(false);
  };

  const handleChange = (page, field, value) => {
    setSeoData(prev => ({
      ...prev,
      [page]: {
        ...(prev[page] || { page_name: page }),
        [field]: value
      }
    }));
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading SEO Settings...</div>;

  return (
    <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1rem', background: '#f5f5f5' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {pages.map(page => (
          <div key={page} style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', textTransform: 'capitalize', color: '#ff2d55' }}>
              {page.replace('_', ' ')} Page
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem', color: '#555' }}>Page Title</label>
                <input 
                  type="text" 
                  value={seoData[page]?.title || ''} 
                  onChange={(e) => handleChange(page, 'title', e.target.value)}
                  placeholder={`Default ${page} title`}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem', color: '#555' }}>Meta Description</label>
                <textarea 
                  value={seoData[page]?.description || ''} 
                  onChange={(e) => handleChange(page, 'description', e.target.value)}
                  placeholder="Enter meta description"
                  rows={3}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem', color: '#555' }}>Meta Keywords</label>
                <input 
                  type="text" 
                  value={seoData[page]?.keywords || ''} 
                  onChange={(e) => handleChange(page, 'keywords', e.target.value)}
                  placeholder="keyword1, keyword2, keyword3"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' }}
                />
              </div>

              <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                <button 
                  onClick={() => handleSave(page)}
                  disabled={saving}
                  style={{ background: '#34c759', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
