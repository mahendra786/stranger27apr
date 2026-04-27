import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './index.css';
import NearbyFriends from './NearbyFriends';
import Settings from './Settings';

const AVATAR_SEEDS = ['Felix','Aneka','Oliver','Molly','Jack','Mia','Leo','Zoe','Max','Luna','Sam','Ruby','Luke','Lily','Alex','Chloe','Ryan','Emma','Tom','Lucy','Liam','Ava','Noah','Sophia','Ethan'];
const AVATAR_BASE = 'https://api.dicebear.com/7.x/avataaars/svg';

function SearchingAnimation() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIdx(i => (i + 1) % AVATAR_SEEDS.length);
        setFade(true);
      }, 200);
    }, 700);
    return () => clearInterval(interval);
  }, []);

  const seed = AVATAR_SEEDS[currentIdx];
  return (
    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem' }}>
      <div style={{ position: 'relative', width: '130px', height: '130px' }}>
        {/* Pulsing ring */}
        <div style={{ position: 'absolute', inset: '-12px', borderRadius: '50%', border: '3px solid #ff2d55', opacity: 0.3, animation: 'pulse 1.2s ease-out infinite' }} />
        <div style={{ position: 'absolute', inset: '-24px', borderRadius: '50%', border: '3px solid #ff2d55', opacity: 0.15, animation: 'pulse 1.2s ease-out infinite 0.4s' }} />
        <img
          src={`${AVATAR_BASE}?seed=${seed}&backgroundColor=c0aede`}
          alt="searching"
          style={{
            width: '130px', height: '130px', borderRadius: '50%',
            border: '4px solid white', boxShadow: '0 4px 20px rgba(255,45,85,0.3)',
            opacity: fade ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#222' }}>Finding a stranger...</div>
        <div style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '4px' }}>Please wait a moment</div>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff2d55', animation: `bounce 1s infinite ${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );
}

function App() {
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const [status, setStatus] = useState('disconnected'); // disconnected, waiting, connected
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [partnerName, setPartnerName] = useState('Stranger');
  const partnerNameRef = useRef('Stranger');
  
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('Other');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [partnerAvatar, setPartnerAvatar] = useState(null);
  const [partnerGender, setPartnerGender] = useState('Other');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editGender, setEditGender] = useState('Other');
  
  const [partnerTyping, setPartnerTyping] = useState(false);
  const typingTimeout = useRef(null);

  const [callState, setCallState] = useState(null);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  
  const chatAreaRef = useRef(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  
  const [showFriendRequestBanner, setShowFriendRequestBanner] = useState(false);
  const [currentView, setCurrentView] = useState('chat');
  const [friendsList, setFriendsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStranger, setSelectedStranger] = useState(null);
  const [incomingRequestSender, setIncomingRequestSender] = useState(null);

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [appSettings, setAppSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('appSettings') || '{}'); } catch { return {}; }
  });
  const mergedSettings = {
    allowSearch: true, autoFriendAccept: false, autoTranslate: true, matchGender: 'matchAll', ...appSettings
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const handleSettingsChange = (next) => {
    setAppSettings(next);
    localStorage.setItem('appSettings', JSON.stringify(next));
  };

  useEffect(() => {
    let storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      storedUserId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userId', storedUserId);
    }
    const newSocket = io('https://mobileapp-starngerchat.vercel.app', { query: { userId: storedUserId } });
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('profile_info', (data) => {
      setNickname(data.nickname);
      setGender(data.gender);
      setAvatarSeed(data.avatarSeed || '');
      setEditNickname(data.nickname);
      setEditGender(data.gender);
      if (data.allowSearch !== undefined || data.autoFriendAccept !== undefined) {
        setAppSettings(prev => ({ ...prev, allowSearch: data.allowSearch, autoFriendAccept: data.autoFriendAccept }));
      }
    });

    newSocket.on('waiting', (data) => {
      setStatus('waiting');
      setMessages([]);
    });

    newSocket.on('chat_started', (data) => {
      setStatus('connected');
      setPartnerName(data.partnerName || 'Stranger');
      setPartnerAvatar(data.partnerAvatar || null);
      setPartnerGender(data.partnerGender || 'Other');
      partnerNameRef.current = data.partnerName || 'Stranger';
      setMessages([
        { type: 'system', text: `Stranger(🇮🇳 India) has entered.` },
        { type: 'notice', text: '[Notice] The following will be blocked.\n- Conversations related to crime.\n- Conversations related to prostitution.\n- Send offensive pictures and videos.\n- Conversation for advertising.' },
        { type: 'link', text: 'The random chat web version has been launched.' }
      ]);
    });

    newSocket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, { type: 'stranger', text: data.message, msgType: data.type }]);
    });

    newSocket.on('friend_request_received', (data) => {
      setShowFriendRequestBanner(true);
      if (data.senderId) setIncomingRequestSender(data.senderId);
      setMessages((prev) => [...prev, { type: 'system', text: data.message }]);
    });

    newSocket.on('friend_request_accepted', (data) => {
      setMessages((prev) => [...prev, { type: 'system', text: data.message }]);
    });

    newSocket.on('partner_typing', () => {
       setPartnerTyping(true);
       clearTimeout(typingTimeout.current);
       typingTimeout.current = setTimeout(() => setPartnerTyping(false), 2000);
    });

    newSocket.on('call_offer', async (data) => {
      setIsVideoCall(data.type === 'video');
      setCallState('receiving');
      window.incomingCallOffer = data.offer;
    });

    newSocket.on('call_answer', async (data) => {
      const pc = peerConnection.current;
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          // setCallState('active') will be triggered by onconnectionstatechange
          // but set a fallback in case the event doesn't fire on some browsers
          setCallState('active');
        } catch(e) {
          console.error('Error setting remote description:', e);
        }
      }
    });

    newSocket.on('ice_candidate', async (data) => {
      const pc = peerConnection.current;
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data));
        } catch(e) {
          console.warn('ICE candidate error:', e);
        }
      }
    });

    newSocket.on('call_ended', () => {
      if (peerConnection.current) peerConnection.current.close();
      if (localStream.current) localStream.current.getTracks().forEach(t => t.stop());
      peerConnection.current = null;
      localStream.current = null;
      setCallState(null);
    });

    newSocket.on('friends_list', (data) => {
      setFriendsList(data);
    });

    newSocket.on('search_results', (data) => {
      setSearchResults(data);
    });

    newSocket.on('chat_ended', (data) => {
      setStatus('disconnected');
      setMessages((prev) => [
        ...prev, 
        { type: 'link', text: `Send a mail to ${data?.partnerName || partnerNameRef.current || 'Stranger'}` },
        { type: 'system', text: 'Stranger was sent off.' }
      ]);
    });

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleChatStartClick = () => {
    const hasAgreed = localStorage.getItem('warningAgreed');
    if (hasAgreed === 'true') {
      if (socket) {
        setMessages([]);
        socket.emit('start_chat');
        setStatus('waiting');
      }
    } else {
      setAdultConfirmed(false);
      setTermsAgreed(false);
      setShowWarningModal(true);
    }
  };

  const confirmAndStartChat = () => {
    if (adultConfirmed && termsAgreed && socket) {
      localStorage.setItem('warningAgreed', 'true');
      setShowWarningModal(false);
      setMessages([]);
      socket.emit('start_chat');
      setStatus('waiting');
    }
  };

  const saveProfile = () => {
    if (socket) {
      socket.emit('update_profile', { nickname: editNickname, gender: editGender, avatarSeed });
      setNickname(editNickname);
      setGender(editGender);
    }
    setShowProfileModal(false);
  };

  const selectAvatar = (seed) => {
    setAvatarSeed(seed);
    if (socket) {
       socket.emit('update_profile', { nickname, gender, avatarSeed: seed });
    }
    setShowAvatarModal(false);
  };

  const endChat = () => {
    if (socket) {
      socket.emit('end_chat');
      setStatus('disconnected');
      setMessages((prev) => [
        ...prev, 
        { type: 'link', text: `Send a mail to ${partnerName}` },
        { type: 'system', text: 'Stranger was sent off.' }
      ]);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() && socket && status === 'connected') {
      socket.emit('send_message', { message: inputValue.trim(), type: 'text' });
      setMessages((prev) => [...prev, { type: 'me', text: inputValue.trim(), msgType: 'text' }]);
      setInputValue('');
    }
  };

  const handleTyping = (e) => {
     setInputValue(e.target.value);
     if (socket && status === 'connected') socket.emit('typing');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && socket && status === 'connected') {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Str = reader.result;
        socket.emit('send_message', { message: base64Str, type: 'image' });
        setMessages((prev) => [...prev, { type: 'me', msgType: 'image', text: base64Str }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const setupWebRTC = async (video) => {
    try {
       const constraints = video
         ? { video: true, audio: true }
         : { video: false, audio: true };
       const stream = await navigator.mediaDevices.getUserMedia(constraints);
       localStream.current = stream;
       // Show local video immediately (only for video calls)
       if (video && localVideoRef.current) localVideoRef.current.srcObject = stream;

       const pc = new RTCPeerConnection({
         iceServers: [
           { urls: 'stun:stun.l.google.com:19302' },
           { urls: 'stun:stun1.l.google.com:19302' },
         ]
       });
       peerConnection.current = pc;

       stream.getTracks().forEach(track => pc.addTrack(track, stream));

       pc.ontrack = (event) => {
         if (remoteVideoRef.current) {
           remoteVideoRef.current.srcObject = event.streams[0];
         }
       };

       pc.onicecandidate = (event) => {
         if (event.candidate && socketRef.current) {
           socketRef.current.emit('ice_candidate', event.candidate);
         }
       };

       pc.onconnectionstatechange = () => {
         if (pc.connectionState === 'connected') setCallState('active');
         if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') endCallLocal();
       };

       return pc;
    } catch (e) {
       console.error('Media error:', e);
       alert('Could not access camera/microphone. Please allow permissions and try again.');
       return null;
    }
  };

  const startCall = async (type) => {
    setIsVideoCall(type === 'video');
    setCallState('calling');
    const pc = await setupWebRTC(type === 'video');
    if (!pc) { setCallState(null); return; }
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: type === 'video' });
    await pc.setLocalDescription(offer);
    socketRef.current.emit('call_offer', { offer, type });
  };

  const acceptCall = async () => {
    const pc = await setupWebRTC(isVideoCall);
    if (!pc) { return; }
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(window.incomingCallOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit('call_answer', { answer });
      setCallState('active');
    } catch(e) {
      console.error('Accept call error:', e);
      endCallLocal();
    }
  };

  const endCallLocal = () => {
    if (peerConnection.current) peerConnection.current.close();
    if (localStream.current) localStream.current.getTracks().forEach(t => t.stop());
    setCallState(null);
  };

  const endCall = () => {
    if (socket) socket.emit('end_call');
    endCallLocal();
  };

  const formatTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-left">
          {currentView === 'friends' || currentView === 'find_friend' ? (
             <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" onClick={() => setCurrentView('chat')} style={{cursor: 'pointer'}}>
               <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
             </svg>
          ) : (
             <div className="menu-icon" onClick={() => setIsNavOpen(true)}>
               <span></span>
               <span></span>
               <span></span>
               <div className="notification-dot"></div>
             </div>
          )}
          <div className="logo-text">{currentView === 'friends' ? 'Friend List' : currentView === 'find_friend' ? 'Find friends' : currentView === 'nearby' ? 'Nearby Friends' : currentView === 'settings' ? 'Settings' : 'Randomchat'}</div>
        </div>
        <div className="header-right">
          {currentView === 'chat' && status === 'connected' && (
             <div style={{ display: 'flex', gap: '1rem', marginRight: '1rem' }}>
                <span onClick={() => startCall('audio')} style={{fontSize: '1.2rem', cursor: 'pointer'}} title="Audio Call">📞</span>
                <span onClick={() => startCall('video')} style={{fontSize: '1.2rem', cursor: 'pointer'}} title="Video Call">🎥</span>
             </div>
          )}
          {(currentView === 'chat' || currentView === 'nearby') && (
             <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" onClick={() => {
               if (status === 'connected') {
                 setShowPartnerModal(true);
               } else {
                 setShowProfileModal(true);
               }
             }} style={{cursor: 'pointer'}}>
               <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
             </svg>
          )}
        </div>
      </header>

      {showFriendRequestBanner && (
         <div style={{ background: '#e51e3a', color: 'white', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50, position: 'relative' }}>
           <span style={{ fontSize: '0.9rem' }}>Stranger wants to be your friend!</span>
           <div style={{ display: 'flex', gap: '0.5rem' }}>
             <button onClick={() => {
               if (socket) socket.emit('accept_friend_request', { senderId: incomingRequestSender });
               setShowFriendRequestBanner(false);
               setIncomingRequestSender(null);
             }} style={{ background: 'white', color: '#e51e3a', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}>Accept</button>
             <button onClick={() => {
               setShowFriendRequestBanner(false);
               setIncomingRequestSender(null);
             }} style={{ background: 'transparent', color: 'white', border: '1px solid white', padding: '0.4rem 0.8rem', borderRadius: '15px', cursor: 'pointer' }}>Decline</button>
           </div>
         </div>
      )}

      {currentView === 'settings' ? (
        <Settings
          socket={socket}
          settings={mergedSettings}
          onSettingsChange={handleSettingsChange}
          avatarSeed={avatarSeed}
          onAvatarChange={(seed) => {
            setAvatarSeed(seed);
            if (socket) socket.emit('update_profile', { nickname, gender, avatarSeed: seed });
          }}
          darkMode={darkMode}
          onDarkModeChange={setDarkMode}
        />
      ) : currentView === 'nearby' ? (
        <NearbyFriends
          socket={socket}
          onBack={() => setCurrentView('chat')}
          onStartChat={(user) => {
            if (socket) socket.emit('start_friend_chat', { friendId: user.id, friendName: user.nickname });
            setCurrentView('chat');
          }}
        />
      ) : currentView === 'chat' ? (
        <>

      <div style={{ height: '3px', width: '100%', background: '#eaeaea', display: 'flex' }}>
        <div style={{ height: '100%', width: status === 'waiting' ? '50%' : status === 'connected' ? '100%' : '0%', background: '#ff2d55', transition: 'width 0.3s' }}></div>
      </div>

      <div className="coin-badge">
        <div className="coin-icon">P</div>
        <span>0</span>
      </div>

      <main className="chat-messages-container" ref={chatAreaRef}>
        {messages.length === 0 && status === 'disconnected' && (
           <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '2rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#222', textAlign: 'center' }}>Find a person to chat with</div>
              <div style={{ color: '#888', fontSize: '0.95rem', textAlign: 'center' }}>Anonymous, secure, fun</div>
           </div>
        )}

        {messages.length === 0 && status === 'waiting' && (
           <SearchingAnimation />
        )}

        {messages.map((msg, idx) => {
          if (msg.type === 'system') {
            return <div key={idx} className="msg-system">{msg.text}</div>;
          } else if (msg.type === 'notice') {
             return <div key={idx} className="msg-notice">{msg.text}</div>;
          } else if (msg.type === 'link') {
             return <div key={idx} className="chat-link">{msg.text}</div>;
          } else if (msg.type === 'stranger') {
            return (
              <div key={idx} className="msg-stranger-wrapper">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerAvatar || partnerName}&backgroundColor=c0aede`} className="stranger-avatar" alt="avatar" />
                <div className="stranger-msg-content">
                  <div className="stranger-name">{partnerName}</div>
                  <div className="stranger-bubble-row">
                    <span style={{ fontSize: '0.8rem', background: '#eaeaea', padding: '2px 6px', borderRadius: '10px', marginRight: '5px' }}>
                       {partnerGender === 'M' ? '♂' : partnerGender === 'F' ? '♀' : '⚧'}
                    </span>
                    <div className="msg-stranger-bubble">
                       {msg.msgType === 'image' || msg.type === 'image' ? <img src={msg.text} style={{maxWidth: '100%', borderRadius: '10px'}} alt="attachment" /> : msg.text}
                    </div>
                    <div className="msg-time">{formatTime()}</div>
                  </div>
                </div>
              </div>
            );
          } else {
             return (
                <div key={idx} className="msg-me-wrapper">
                   <div className="msg-time">{formatTime()}</div>
                   <div className="msg-me-bubble">
                      {msg.msgType === 'image' || msg.type === 'image' ? <img src={msg.text} style={{maxWidth: '100%', borderRadius: '10px'}} alt="attachment" /> : msg.text}
                   </div>
                </div>
             );
          }
        })}
      </main>

      {partnerTyping && status === 'connected' && (
         <div style={{ padding: '0.2rem 1rem', fontStyle: 'italic', color: '#888', fontSize: '0.85rem' }}>
            {partnerName} is typing...
         </div>
      )}

      {status === 'disconnected' ? (
        <div className="bottom-btn-container">
           <button
             className="btn-chat-start-large"
             onClick={handleChatStartClick}
             style={{ fontSize: '1rem', letterSpacing: '1px' }}
           >
             CHAT START
           </button>
        </div>
      ) : (
        <form className="chat-input-bar" onSubmit={sendMessage}>
          <button type="button" className="icon-btn" onClick={endChat}>
             <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
               <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
             </svg>
          </button>
          <label htmlFor="image-upload" className="icon-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
               <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
             </svg>
          </label>
          <input type="file" id="image-upload" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          <div className="chat-input-pill">
            <input
              type="text"
              value={inputValue}
              onChange={handleTyping}
              disabled={status !== 'connected'}
              placeholder={status === 'waiting' ? "Searching..." : ""}
            />
            <span className="chat-sparkle">✨</span>
          </div>
          <button type="submit" className="send-btn-circle" disabled={status !== 'connected' || !inputValue.trim()}>
             <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </form>
      )}
        </>
      ) : currentView === 'find_friend' ? (
        <main className="find-friend-page" style={{ flexGrow: 1, background: '#eaeaea', overflowY: 'auto' }}>
           <div style={{ padding: '1rem' }}>
              <div style={{ background: 'white', borderRadius: '30px', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', elevation: 2 }}>
                 <span style={{ fontSize: '1.2rem' }}>🔍</span>
                 <input 
                   type="text" 
                   value={searchQuery}
                   onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (socket) socket.emit('search_users', { query: e.target.value });
                   }}
                   style={{ border: 'none', outline: 'none', flexGrow: 1, fontSize: '1rem' }}
                   placeholder="Search..."
                 />
              </div>

              <div style={{ background: 'white', borderRadius: '15px', overflow: 'hidden' }}>
                 {searchResults.length === 0 ? (
                    <p style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Type a nickname to search.</p>
                 ) : (
                    searchResults.map((user, idx) => (
                      <div key={idx} onClick={() => {
                          setSelectedStranger(user);
                          setShowPartnerModal(true);
                      }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderBottom: '1px solid #eaeaea', cursor: 'pointer' }}>
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed || user.nickname}&backgroundColor=c0aede`} style={{ width: '45px', height: '45px', borderRadius: '50%' }} alt="avatar" />
                        <div style={{ flexGrow: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#333' }}>{user.nickname}</div>
                          <div style={{ fontSize: '0.8rem', color: user.gender === 'F' ? '#e51e3a' : user.gender === 'M' ? '#007bff' : '#666', marginTop: '0.2rem' }}>
                            {user.gender === 'M' ? '♂ Male' : user.gender === 'F' ? '♀ Female' : '⚧ Other'}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#888' }}>0 minute(s) ago</div>
                      </div>
                    ))
                 )}
              </div>
           </div>
        </main>
      ) : (
        <main className="friend-list-page" style={{ flexGrow: 1, background: '#f5f5f5', overflowY: 'auto' }}>
            {friendsList.length === 0 ? (
               <div style={{ padding: '2rem', textAlign: 'center', color: '#888', marginTop: '2rem' }}>
                 <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                 <p>No friends yet.</p>
               </div>
            ) : (
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                 {friendsList.map((friend, idx) => (
                   <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderBottom: '1px solid #eaeaea', background: 'white' }}>
                     <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.avatarSeed || friend.nickname}&backgroundColor=c0aede`} style={{ width: '50px', height: '50px', borderRadius: '50%' }} alt="avatar" />
                     <div style={{ flexGrow: 1 }}>
                       <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{friend.nickname}</div>
                       <div style={{ fontSize: '0.85rem', color: friend.gender === 'F' ? '#e51e3a' : friend.gender === 'M' ? '#007bff' : '#888' }}>
                         {friend.gender === 'M' ? '♂' : friend.gender === 'F' ? '♀' : '⚧'} {friend.gender === 'M' ? 'Male' : friend.gender === 'F' ? 'Female' : 'Other'}
                       </div>
                     </div>
                     <button onClick={() => {
                       setCurrentView('chat');
                       setMessages([]);
                       if (socket) socket.emit('start_friend_chat', { friendId: friend.id, friendName: friend.nickname });
                     }} style={{ background: '#ff2d55', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>Chat</button>
                   </div>
                 ))}
               </div>
            )}
        </main>
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-body">
              <div className="modal-header">
                <div className="modal-title">
                  <span role="img" aria-label="siren" style={{ fontSize: '1.5rem' }}>🚨</span>
                  Warning
                </div>
                <div className="modal-divider"></div>
              </div>

              <p className="modal-text">
                This app can make new friends. Sexual and hateful speech is strictly prohibited.
              </p>
              <p className="modal-text">
                Do not expose your personal information, especially phone numbers exchanged. Please note that from fraud.
              </p>
              <p className="modal-text">
                It is also strictly forbidden to offend users.
              </p>

              <label className="modal-checkbox-group">
                <input 
                  type="checkbox" 
                  checked={adultConfirmed}
                  onChange={(e) => setAdultConfirmed(e.target.checked)}
                />
                <span className="modal-checkbox-label">
                  To use the service, I confirm that I am an adult.
                </span>
              </label>

              <label className="modal-checkbox-group" style={{ marginBottom: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                />
                <span className="modal-checkbox-label">
                  By continuing, you agree to our <span className="modal-link">Terms of Service</span> and <span className="modal-link">Privacy Policy</span>.
                </span>
              </label>
            </div>

            <button 
              className={`btn-confirm ${adultConfirmed && termsAgreed ? 'active' : ''}`}
              disabled={!adultConfirmed || !termsAgreed}
              onClick={confirmAndStartChat}
            >
              CONFIRM
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)} style={{ zIndex: 400 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '1.5rem', width: '90%', maxWidth: '350px' }}>
            <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Edit Profile</h3>
            
            <div className="profile-avatar-container" onClick={() => setShowAvatarModal(true)} style={{ cursor: 'pointer', textAlign: 'center', marginBottom: '1rem' }}>
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed || nickname}&backgroundColor=c0aede`} alt="avatar" style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
              <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>Tap to change</div>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Name</label>
              <input 
                type="text" 
                value={editNickname} 
                onChange={(e) => setEditNickname(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' }}
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Gender</label>
              <select 
                value={editGender} 
                onChange={(e) => setEditGender(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', background: 'white' }}
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setShowProfileModal(false)}
                style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', background: '#f0f0f0', cursor: 'pointer', fontWeight: 'bold' }}
              >Cancel</button>
              <button 
                onClick={saveProfile}
                style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#ff2d55', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
              >Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Selection Modal */}
      {showAvatarModal && (
        <div className="modal-overlay" onClick={() => setShowAvatarModal(false)} style={{ zIndex: 600 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '1.5rem', width: '90%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Choose Avatar</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
               {['Felix', 'Aneka', 'Oliver', 'Molly', 'Jack', 'Mia', 'Leo', 'Zoe', 'Max', 'Luna', 'Sam', 'Ruby', 'Luke', 'Lily', 'Alex', 'Chloe', 'Ryan', 'Emma', 'Tom', 'Lucy'].map((seed) => (
                  <div key={seed} onClick={() => selectAvatar(seed)} style={{ cursor: 'pointer', borderRadius: '10px', padding: '5px', background: avatarSeed === seed ? '#eaeaea' : 'transparent', border: avatarSeed === seed ? '2px solid #ff2d55' : '2px solid transparent' }}>
                     <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=c0aede`} style={{ width: '100%', aspectRatio: '1/1', borderRadius: '50%' }} alt="avatar" />
                  </div>
               ))}
            </div>
            <button 
              onClick={() => setShowAvatarModal(false)}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#ff2d55', color: 'white', cursor: 'pointer', fontWeight: 'bold', marginTop: '1rem' }}
            >Close</button>
          </div>
        </div>
      )}

      {/* Navigation Drawer */}
      {isNavOpen && (
        <div className="nav-overlay" onClick={() => setIsNavOpen(false)} style={{ zIndex: 250 }}>
          <div className="nav-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="nav-profile-card">
               <div className="profile-avatar" onClick={() => { setShowProfileModal(true); setIsNavOpen(false); }} style={{cursor: 'pointer'}}>
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed || nickname}&backgroundColor=c0aede`} alt="avatar" />
                  <div className="edit-icon">✎</div>
               </div>
               <div className="profile-info">
                  <div className="profile-name">
                    {nickname || '...'} 
                    <span style={{ fontSize: '0.9rem', marginLeft: '0.5rem', color: gender === 'F' ? '#e51e3a' : gender === 'M' ? '#007bff' : '#888' }}>
                       {gender === 'M' ? '♂' : gender === 'F' ? '♀' : '⚧'}
                    </span>
                    <span className="gear-icon" onClick={() => { setShowProfileModal(true); setIsNavOpen(false); }} style={{cursor: 'pointer', marginLeft: '0.5rem'}}>⚙️</span>
                  </div>
                  <div className="profile-coins">
                     <div className="coin-icon">P</div> 0
                     <button className="btn-buy-voucher">Buy voucher</button>
                  </div>
               </div>
            </div>

            <div className="nav-menu-card">
               <div className="nav-item">
                  <span className="nav-icon">💌</span>
                  <span className="nav-text">Dating cards</span>
                  <span className="nav-badge">N</span>
               </div>
               <div className="nav-item" onClick={() => {
                  setCurrentView('find_friend');
                  setIsNavOpen(false);
               }} style={{ cursor: 'pointer' }}>
                  <span className="nav-icon">🔍</span>
                  <span className="nav-text">Find friends</span>
               </div>
               <div className="nav-item">
                  <span className="nav-icon">📬</span>
                  <span className="nav-text">Mail box</span>
               </div>
               <div className="nav-item" onClick={() => {
                  if (socket) socket.emit('get_friends');
                  setCurrentView('friends');
                  setIsNavOpen(false);
               }} style={{ cursor: 'pointer' }}>
                  <span className="nav-icon">👫</span>
                  <span className="nav-text">Friend list</span>
               </div>
               <div className="nav-item" onClick={() => {
                   setCurrentView('nearby');
                   setIsNavOpen(false);
                }} style={{ cursor: 'pointer' }}>
                   <span className="nav-icon">🌍</span>
                   <span className="nav-text">Nearby friends</span>
                </div>
               <div className="nav-item">
                  <span className="nav-icon">❤️</span>
                  <span className="nav-text">Favorites</span>
               </div>
               <div className="nav-item">
                  <span className="nav-icon">📜</span>
                  <span className="nav-text">Matching history</span>
               </div>
               <div className="nav-item">
                  <span className="nav-icon">⭐</span>
                  <span className="nav-text">Review</span>
               </div>
               <div className="nav-item">
                  <span className="nav-icon">❓</span>
                  <span className="nav-text">FAQs</span>
               </div>
               <div className="nav-item" onClick={() => { setCurrentView('settings'); setIsNavOpen(false); }} style={{ cursor: 'pointer' }}>
                  <span className="nav-icon">⚙️</span>
                  <span className="nav-text">Setting</span>
               </div>
            </div>
          </div>
        </div>
      )}

      {callState && (
        <div className="modal-overlay" style={{ zIndex: 1000, background: 'rgba(0,0,0,0.9)', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          
          {callState === 'receiving' && (
            <div style={{ textAlign: 'center' }}>
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerAvatar || partnerName}&backgroundColor=c0aede`} style={{ width: '120px', height: '120px', borderRadius: '50%', marginBottom: '2rem' }} alt="avatar" />
               <h2 style={{ marginBottom: '1rem' }}>{partnerName} is calling...</h2>
               <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginTop: '2rem' }}>
                 <button onClick={acceptCall} style={{ background: '#34c759', border: 'none', borderRadius: '50%', width: '70px', height: '70px', fontSize: '2rem', color: 'white', cursor: 'pointer' }}>📞</button>
                 <button onClick={endCall} style={{ background: '#ff3b30', border: 'none', borderRadius: '50%', width: '70px', height: '70px', fontSize: '2rem', color: 'white', cursor: 'pointer' }}>✖</button>
               </div>
            </div>
          )}

          {(callState === 'calling' || callState === 'active') && (
            isVideoCall ? (
              // --- VIDEO CALL UI ---
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                 <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#222' }} />
                 <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '120px', height: '160px', position: 'absolute', bottom: '120px', right: '20px', borderRadius: '15px', objectFit: 'cover', background: '#000', border: '2px solid white', zIndex: 1001 }} />
                 {callState === 'calling' && <div style={{ position: 'absolute', top: '10%', width: '100%', textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold', zIndex: 1001 }}>Calling {partnerName}...</div>}
                 <div style={{ position: 'absolute', bottom: '40px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 1001 }}>
                   <button onClick={endCall} style={{ background: '#ff3b30', border: 'none', borderRadius: '50%', width: '70px', height: '70px', fontSize: '2rem', color: 'white', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>📞</button>
                 </div>
              </div>
            ) : (
              // --- AUDIO CALL UI ---
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerAvatar || partnerName}&backgroundColor=c0aede`} style={{ width: '130px', height: '130px', borderRadius: '50%', marginBottom: '1.5rem', border: '4px solid #34c759', boxShadow: '0 0 0 8px rgba(52,199,89,0.2)', animation: callState === 'calling' ? 'pulse 1.5s infinite' : 'none' }} alt="avatar" />
                 <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>{partnerName}</h2>
                 <p style={{ color: '#aaa', marginBottom: '3rem' }}>{callState === 'calling' ? 'Calling...' : '🔊 Voice call in progress'}</p>
                 {/* Hidden audio elements */}
                 <audio ref={localVideoRef} autoPlay muted style={{ display: 'none' }} />
                 <audio ref={remoteVideoRef} autoPlay style={{ display: 'none' }} />
                 <button onClick={endCall} style={{ background: '#ff3b30', border: 'none', borderRadius: '50%', width: '70px', height: '70px', fontSize: '2rem', color: 'white', cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,59,48,0.5)' }}>📞</button>
              </div>
            )
          )}
        </div>
      )}

      {/* Partner/Stranger Modal */}
      {showPartnerModal && (
        <div className="modal-overlay" onClick={() => setShowPartnerModal(false)} style={{ zIndex: 400 }}>
          <div className="modal-content partner-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="partner-modal-header">
              <span>🔒 {selectedStranger ? selectedStranger.nickname : partnerName}</span>
            </div>
            
            <div className="partner-map-area">
              <div className="partner-map-overlay">
                <p>Please allow location permissions to view distance information.</p>
                <button className="btn-allow-location">ALLOW PERMISSIONS</button>
              </div>
            </div>
            
            <div className="partner-info-card">
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedStranger ? (selectedStranger.avatarSeed || selectedStranger.nickname) : (partnerAvatar || partnerName)}&backgroundColor=c0aede`} className="stranger-avatar" alt="avatar" />
               <div className="partner-details">
                  <div className="partner-country">🇮🇳 India</div>
                  <div className="partner-sub" style={{ color: selectedStranger ? (selectedStranger.gender === 'F' ? '#e51e3a' : selectedStranger.gender === 'M' ? '#007bff' : '#888') : '#007bff' }}>
                     {selectedStranger ? (selectedStranger.gender === 'M' ? '♂ Male' : selectedStranger.gender === 'F' ? '♀ Female' : '⚧ Other') : '♂ Male'} · 0 minute(s) ago
                  </div>
               </div>
               <div className="partner-heart">🤍</div>
            </div>

            <div className="partner-action-list">
               <div className="partner-action-item">
                  <span className="action-icon">✉️</span> Mail to friend
               </div>
               <div className="partner-action-item" onClick={() => {
                  if (socket) socket.emit('send_friend_request', { friendId: selectedStranger ? selectedStranger.id : null });
                  setShowPartnerModal(false);
                  setMessages((prev) => [...prev, { type: 'system', text: 'Friend request sent!' }]);
               }}>
                  <span className="action-icon">👤+</span> Add friends
               </div>
               <div className="partner-action-item">
                  <span className="action-icon">⚠️</span> Report
               </div>
               <div className="partner-action-item">
                  <span className="action-icon">🎁</span> Give points
               </div>
               <div className="partner-action-item">
                  <span className="action-icon">🚫</span> Block user
               </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

export default App;
