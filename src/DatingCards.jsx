import React, { useState, useEffect, useRef } from 'react';

const AVATAR_BASE = 'https://api.dicebear.com/7.x/avataaars/svg';

function DatingCards({ socket, onBack, onStartChat }) {
  const [users, setUsers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState(null);

  const cardRef = useRef(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  useEffect(() => {
    if (!socket) return;

    const handleDatingUsers = (data) => {
      setUsers(data);
      setLoading(false);
      setCurrentIndex(0);
    };

    const handleMatch = (data) => {
      setMatch(data);
    };

    socket.on('dating_users', handleDatingUsers);
    socket.on('dating_match', handleMatch);

    socket.emit('get_dating_users');

    return () => {
      socket.off('dating_users', handleDatingUsers);
      socket.off('dating_match', handleMatch);
    };
  }, [socket]);

  const handleSwipe = (direction) => {
    if (currentIndex >= users.length) return;

    const swipedUser = users[currentIndex];
    setSwipeDirection(direction);

    // Give some time for animation
    setTimeout(() => {
      socket.emit('swipe_user', {
        swipedId: swipedUser.id,
        type: direction === 'right' ? 'like' : 'dislike'
      });
      setCurrentIndex(prev => prev + 1);
      setSwipeDirection(null);
    }, 300);
  };

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };

  const onTouchMove = (e) => {
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${diff}px) rotate(${diff / 20}deg)`;
      cardRef.current.style.transition = 'none';
    }
  };

  const onTouchEnd = () => {
    const diff = currentX.current - startX.current;
    const threshold = 100;

    if (diff > threshold) {
      handleSwipe('right');
    } else if (diff < -threshold) {
      handleSwipe('left');
    } else {
      if (cardRef.current) {
        cardRef.current.style.transform = 'translateX(0) rotate(0)';
        cardRef.current.style.transition = 'transform 0.3s ease';
      }
    }
  };

  if (loading) {
    return (
      <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <div className="loader">Loading potential matches...</div>
      </div>
    );
  }

  if (match) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.9)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white'
      }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontFamily: "'Pacifico', cursive", color: '#ff2d55', textShadow: '0 0 20px rgba(255,45,85,0.5)' }}>It's a Match!</h1>
        <p style={{ marginBottom: '2.5rem', fontSize: '1.2rem', opacity: 0.9 }}>You and {match.nickname} liked each other.</p>
        
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '3rem' }}>
          <div style={{ textAlign: 'center' }}>
            <img 
              src={`${AVATAR_BASE}?seed=${match.avatar_seed || match.nickname}&backgroundColor=c0aede`} 
              style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid #ff2d55', boxShadow: '0 0 30px rgba(255,45,85,0.3)' }} 
              alt="match" 
            />
            <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>{match.nickname}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '80%', maxWidth: '300px' }}>
          <button 
            onClick={() => {
              onStartChat(match);
              setMatch(null);
            }}
            style={{ padding: '1rem', background: '#ff2d55', color: 'white', border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}
          >Send Message</button>
          <button 
            onClick={() => setMatch(null)}
            style={{ padding: '1rem', background: 'transparent', color: 'white', border: '2px solid white', borderRadius: '30px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}
          >Keep Swiping</button>
        </div>
      </div>
    );
  }

  const currentUser = users[currentIndex];

  return (
    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', background: '#f5f5f5', overflow: 'hidden', position: 'relative' }}>
      
      <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        {currentIndex < users.length ? (
          <div 
            ref={cardRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              width: '100%', maxWidth: '350px', height: '500px',
              background: 'white', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              position: 'relative', overflow: 'hidden', cursor: 'grab',
              transform: swipeDirection === 'right' ? 'translateX(1000px) rotate(30deg)' : 
                         swipeDirection === 'left' ? 'translateX(-1000px) rotate(-30deg)' : 'none',
              transition: swipeDirection ? 'transform 0.5s ease' : 'none',
              display: 'flex', flexDirection: 'column'
            }}
          >
            {/* Avatar Area */}
            <div style={{ flexGrow: 1, background: 'linear-gradient(180deg, #ff9a9e 0%, #fad0c4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src={`${AVATAR_BASE}?seed=${currentUser.avatar_seed || currentUser.nickname}&backgroundColor=c0aede`} 
                style={{ width: '250px', height: '250px' }} 
                alt="profile" 
              />
            </div>

            {/* Info Area */}
            <div style={{ padding: '1.5rem', background: 'white' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {currentUser.nickname}
                <span style={{ fontSize: '1.2rem', color: currentUser.gender === 'F' ? '#ff2d55' : currentUser.gender === 'M' ? '#007bff' : '#888' }}>
                  {currentUser.gender === 'M' ? '♂' : currentUser.gender === 'F' ? '♀' : '⚧'}
                </span>
              </div>
              <div style={{ color: '#888', marginTop: '0.5rem' }}>📍 India</div>
              <div style={{ fontSize: '0.9rem', color: '#aaa', marginTop: '1rem' }}>
                Looking for new friends and fun conversations!
              </div>
            </div>

            {/* Swipe Indicators */}
            {swipeDirection === 'right' && (
              <div style={{ position: 'absolute', top: '40px', left: '40px', border: '5px solid #34c759', color: '#34c759', padding: '0.5rem 1.5rem', borderRadius: '10px', fontSize: '2.5rem', fontWeight: 'bold', transform: 'rotate(-20deg)', zIndex: 10 }}>LIKE</div>
            )}
            {swipeDirection === 'left' && (
              <div style={{ position: 'absolute', top: '40px', right: '40px', border: '5px solid #ff3b30', color: '#ff3b30', padding: '0.5rem 1.5rem', borderRadius: '10px', fontSize: '2.5rem', fontWeight: 'bold', transform: 'rotate(20deg)', zIndex: 10 }}>NOPE</div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
            <h3>No more people for now!</h3>
            <p style={{ color: '#888' }}>Check back later for more potential matches.</p>
            <button 
              onClick={() => socket.emit('get_dating_users')}
              style={{ marginTop: '1.5rem', padding: '0.8rem 2rem', background: '#ff2d55', color: 'white', border: 'none', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer' }}
            >Refresh</button>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      {currentIndex < users.length && !swipeDirection && (
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', padding: '1.5rem', background: 'white' }}>
          <button 
            onClick={() => handleSwipe('left')}
            style={{ width: '60px', height: '60px', borderRadius: '50%', border: 'none', background: '#fff', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >❌</button>
          <button 
            onClick={() => handleSwipe('right')}
            style={{ width: '60px', height: '60px', borderRadius: '50%', border: 'none', background: '#fff', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >❤️</button>
        </div>
      )}
    </div>
  );
}

export default DatingCards;
