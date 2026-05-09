import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';

const AdminFAQs = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [formData, setFormData] = useState({ question: '', answer: '', order_num: 0 });

  const fetchFaqs = async () => {
    console.log("AdminFAQs: Fetching FAQs...");
    try {
      const res = await fetch(`${API_BASE_URL}/api/faqs`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      console.log("AdminFAQs: Data received:", data);
      setFaqs(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) { 
      console.error("AdminFAQs: Fetch error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');
    const url = editingFaq ? `${API_BASE_URL}/api/admin/faqs/${editingFaq.id}` : `${API_BASE_URL}/api/admin/faqs`;
    const method = editingFaq ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setEditingFaq(null);
        setFormData({ question: '', answer: '', order_num: 0 });
        fetchFaqs();
      }
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this FAQ?')) return;
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/faqs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchFaqs();
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Manage FAQs</h2>
        <button 
          onClick={() => { setEditingFaq(null); setFormData({ question: '', answer: '', order_num: 0 }); setShowModal(true); }}
          style={{ padding: '10px 20px', background: '#ff2d55', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          + Add FAQ
        </button>
      </div>

      {loading ? <p>Loading...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={{ padding: '15px' }}>Order</th>
              <th style={{ padding: '15px' }}>Question</th>
              <th style={{ padding: '15px' }}>Answer</th>
              <th style={{ padding: '15px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {faqs.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                  No FAQs found. Click "+ Add FAQ" to create one.
                </td>
              </tr>
            ) : faqs.map(faq => (
              <tr key={faq.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '15px' }}>{faq.order_num}</td>
                <td style={{ padding: '15px', fontWeight: 'bold' }}>{faq.question}</td>
                <td style={{ padding: '15px' }}>{faq.answer}</td>
                <td style={{ padding: '15px' }}>
                  <button onClick={() => { setEditingFaq(faq); setFormData({ question: faq.question, answer: faq.answer, order_num: faq.order_num }); setShowModal(true); }} style={{ marginRight: '10px', padding: '5px 10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDelete(faq.id)} style={{ padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '90%', maxWidth: '500px' }}>
            <h3>{editingFaq ? 'Edit FAQ' : 'Add New FAQ'}</h3>
            <form onSubmit={handleSubmit} style={{ marginTop: '15px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Question</label>
                <input 
                  type="text" 
                  value={formData.question} 
                  onChange={e => setFormData({ ...formData, question: e.target.value })} 
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} 
                  required 
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Answer</label>
                <textarea 
                  value={formData.answer} 
                  onChange={e => setFormData({ ...formData, answer: e.target.value })} 
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', minHeight: '100px' }} 
                  required 
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Order Number</label>
                <input 
                  type="number" 
                  value={formData.order_num} 
                  onChange={e => setFormData({ ...formData, order_num: e.target.value })} 
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} 
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: '5px', border: '1px solid #ccc', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '5px', border: 'none', background: '#ff2d55', color: 'white', cursor: 'pointer' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFAQs;
