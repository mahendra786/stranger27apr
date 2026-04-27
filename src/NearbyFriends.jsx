import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const AVATAR_BASE = 'https://api.dicebear.com/7.x/avataaars/svg';

function timeAgo(dateStr) {
  if (!dateStr) return '?';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff} minute(s) ago`;
  return `${Math.floor(diff / 60)} hour(s) ago`;
}

function NearbyFriends({ socket, onBack, onStartChat }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const myMarkerRef = useRef(null);

  const [step, setStep] = useState('permission'); // permission | confirm | map
  const [genderFilter, setGenderFilter] = useState('All');
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Listen for nearby users from server
  useEffect(() => {
    if (!socket) return;
    const handler = (users) => {
      setNearbyUsers(users);
      setLoading(false);
    };
    socket.on('nearby_users', handler);
    return () => socket.off('nearby_users', handler);
  }, [socket]);

  // Init map once we reach map step
  useEffect(() => {
    if (step !== 'map' || !mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([20.5937, 78.9629], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    mapInstance.current = map;
  }, [step]);

  // Update markers when users or location changes
  useEffect(() => {
    if (!mapInstance.current || step !== 'map') return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // My location marker
    if (myLocation) {
      if (myMarkerRef.current) myMarkerRef.current.remove();
      const myIcon = L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(59,130,246,0.8)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      myMarkerRef.current = L.marker([myLocation.lat, myLocation.lng], { icon: myIcon })
        .addTo(mapInstance.current)
        .bindPopup('You');
    }

    // Cluster nearby users by approximate location
    const clusters = {};
    nearbyUsers.forEach(user => {
      const key = `${parseFloat(user.latitude).toFixed(2)},${parseFloat(user.longitude).toFixed(2)}`;
      if (!clusters[key]) clusters[key] = { users: [], lat: user.latitude, lng: user.longitude };
      clusters[key].users.push(user);
    });

    Object.values(clusters).forEach(cluster => {
      const count = cluster.users.length;
      const html = count === 1
        ? `<img src="${AVATAR_BASE}?seed=${cluster.users[0].avatar_seed || cluster.users[0].nickname}&backgroundColor=c0aede" style="width:36px;height:36px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">`
        : `<div style="width:40px;height:40px;background:#3b82f6;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:1rem;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${count}</div>`;

      const icon = L.divIcon({ className: '', html, iconSize: [40, 40], iconAnchor: [20, 20] });
      const marker = L.marker([cluster.lat, cluster.lng], { icon })
        .addTo(mapInstance.current)
        .on('click', () => {
          if (count === 1) setSelectedUser(cluster.users[0]);
        });
      markersRef.current.push(marker);
    });

    if (nearbyUsers.length > 0) {
      const bounds = nearbyUsers.map(u => [u.latitude, u.longitude]);
      if (myLocation) bounds.push([myLocation.lat, myLocation.lng]);
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [nearbyUsers, myLocation, step]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(loc);
        setStep('map');
        if (socket) socket.emit('update_location', loc);
        fetchNearby(loc, genderFilter);
        if (mapInstance.current) mapInstance.current.setView([loc.lat, loc.lng], 14);
      },
      () => alert('Could not get location. Please allow location access.')
    );
  };

  const fetchNearby = (loc, gender) => {
    if (!socket || !loc) return;
    setLoading(true);
    socket.emit('get_nearby_users', { lat: loc.lat, lng: loc.lng, gender, radius: 50 });
  };

  const handleFilterChange = (f) => {
    setGenderFilter(f);
    if (myLocation) fetchNearby(myLocation, f);
  };

  const recenter = () => {
    if (mapInstance.current && myLocation) {
      mapInstance.current.setView([myLocation.lat, myLocation.lng], 14);
    }
  };

  const refresh = () => {
    if (myLocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(loc);
        if (socket) socket.emit('update_location', loc);
        fetchNearby(loc, genderFilter);
      });
    }
  };

  // ─── STEP: PERMISSION ────────────────────────────────────────────────────
  if (step === 'permission') {
    return (
      <div style={{ flexGrow: 1, background: '#ccc', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          background: 'white', borderRadius: '16px', width: '85%', maxWidth: '350px',
          padding: '2rem 1.5rem', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📍</div>
          <p style={{ fontSize: '1.1rem', lineHeight: 1.5, marginBottom: '2rem', color: '#222' }}>
            Allow <strong>Random Chat</strong> to access this device's location?
          </p>
          <button
            onClick={() => setStep('confirm')}
            style={{ width: '100%', padding: '1rem', borderTop: '1px solid #eee', background: 'none', border: 'none', borderTop: '1px solid #eee', color: '#009688', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}
          >WHILE USING THE APP</button>
          <button
            onClick={requestLocation}
            style={{ width: '100%', padding: '1rem', background: 'none', border: 'none', borderTop: '1px solid #eee', color: '#009688', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}
          >ONLY THIS TIME</button>
          <button
            onClick={onBack}
            style={{ width: '100%', padding: '1rem', background: 'none', border: 'none', borderTop: '1px solid #eee', color: '#009688', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}
          >DON'T ALLOW</button>
        </div>
      </div>
    );
  }

  // ─── STEP: CONFIRM PERMISSIONS ───────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div style={{ flexGrow: 1, background: '#ccc', display: 'flex', flexDirection: 'column' }}>
        {/* Blurred map placeholder */}
        <div style={{ flexGrow: 1, background: 'url(https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Earthmap1000x500compac.jpg/640px-Earthmap1000x500compac.jpg) center/cover', filter: 'blur(3px)' }} />
        
        {/* Filter bar */}
        <div style={{ background: 'rgba(0,0,0,0.6)', padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          {['All', 'Male', 'Female'].map(f => (
            <div key={f} style={{ background: f === 'All' ? 'white' : 'transparent', borderRadius: '25px', padding: '0.5rem 1.5rem', color: f === 'All' ? '#333' : 'white', fontWeight: '500', border: '1px solid white' }}>{f === 'All' ? '✓ All' : f}</div>
          ))}
        </div>

        {/* Permission bottom sheet */}
        <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '2rem 1.5rem' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '1.1rem' }}>Permission Requests</h3>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Random Chat requires the following permissions.</p>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '2rem' }}>- Permission to access location information</p>
          <button
            onClick={() => { setStep('confirm_done'); requestLocation(); }}
            style={{ width: '100%', padding: '1.2rem', background: '#e51e3a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
          >CONFIRM</button>
        </div>
      </div>
    );
  }

  // ─── STEP: MAP ────────────────────────────────────────────────────────────
  return (
    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      
      {/* Notice banner */}
      <div style={{ background: 'rgba(0,0,0,0.65)', color: 'white', padding: '0.5rem 1rem', textAlign: 'center', fontSize: '0.8rem', zIndex: 20, flexShrink: 0 }}>
        The displayed user location is approximate
      </div>

      {/* Gender filter */}
      <div style={{ background: 'white', padding: '0.7rem 1rem', display: 'flex', gap: '0.5rem', zIndex: 20, flexShrink: 0, borderBottom: '1px solid #eee' }}>
        {['All', 'Male', 'Female'].map(f => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            style={{
              flex: 1, padding: '0.5rem', border: '1.5px solid #ccc', borderRadius: '25px',
              background: genderFilter === f ? '#ffebee' : 'white',
              color: genderFilter === f ? '#e51e3a' : '#333',
              fontWeight: genderFilter === f ? 'bold' : 'normal',
              cursor: 'pointer', fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
            }}
          >
            {genderFilter === f && <span>✓</span>} {f}
          </button>
        ))}
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ flexGrow: 1, zIndex: 1 }} />

      {/* Map controls */}
      <div style={{ position: 'absolute', bottom: nearbyUsers.length > 0 ? '130px' : '20px', right: '16px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 20 }}>
        <button onClick={recenter} style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'white', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', fontSize: '1.3rem', cursor: 'pointer' }}>🎯</button>
        <button onClick={refresh} style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'white', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', fontSize: '1.3rem', cursor: 'pointer' }}>🔄</button>
      </div>

      {loading && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'white', padding: '1rem 2rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 30 }}>
          Searching nearby...
        </div>
      )}

      {/* Horizontal user list */}
      {nearbyUsers.length > 0 && (
        <div style={{ background: 'white', padding: '0.8rem 1rem', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)', zIndex: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '4px' }}>
            {nearbyUsers.map((user, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedUser(user)}
                style={{ flexShrink: 0, textAlign: 'center', cursor: 'pointer', width: '72px' }}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={`${AVATAR_BASE}?seed=${user.avatar_seed || user.nickname}&backgroundColor=c0aede`}
                    style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid #eee' }}
                    alt="avatar"
                  />
                  <div style={{
                    position: 'absolute', bottom: 2, right: 2, width: '12px', height: '12px',
                    borderRadius: '50%', background: '#34c759', border: '2px solid white'
                  }} />
                </div>
                <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {'•'.repeat(Math.min(user.nickname?.length || 8, 8))}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#aaa' }}>{timeAgo(user.last_seen)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {nearbyUsers.length === 0 && !loading && (
        <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', background: 'white', padding: '0.8rem 1.5rem', borderRadius: '12px', fontSize: '0.85rem', color: '#888', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', zIndex: 20, whiteSpace: 'nowrap' }}>
          No nearby users found within 50km
        </div>
      )}

      {/* User detail popup */}
      {selectedUser && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedUser(null)}
          style={{ zIndex: 400 }}
        >
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ padding: 0, overflow: 'hidden', width: '85%', maxWidth: '320px', borderRadius: '16px' }}
          >
            <div style={{ background: '#e51e3a', padding: '1rem', color: 'white', textAlign: 'center' }}>
              <img
                src={`${AVATAR_BASE}?seed=${selectedUser.avatar_seed || selectedUser.nickname}&backgroundColor=c0aede`}
                style={{ width: '70px', height: '70px', borderRadius: '50%', border: '3px solid white' }}
                alt="avatar"
              />
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginTop: '0.5rem' }}>{selectedUser.nickname}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                {selectedUser.gender === 'M' ? '♂ Male' : selectedUser.gender === 'F' ? '♀ Female' : '⚧ Other'} · {Math.round(selectedUser.distance)} km away
              </div>
            </div>
            <div style={{ padding: '1rem', display: 'flex', gap: '0.8rem' }}>
              <button
                onClick={() => {
                  if (socket) socket.emit('send_friend_request', { friendId: selectedUser.id });
                  setSelectedUser(null);
                }}
                style={{ flex: 1, padding: '0.8rem', background: '#e51e3a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
              >👤+ Add Friend</button>
              <button
                onClick={() => {
                  if (onStartChat) onStartChat(selectedUser);
                  setSelectedUser(null);
                }}
                style={{ flex: 1, padding: '0.8rem', background: 'white', color: '#e51e3a', border: '2px solid #e51e3a', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
              >💬 Chat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NearbyFriends;
