import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './index.css';
import NearbyFriends from './NearbyFriends';
import Settings from './Settings';
import AdminDashboard from './AdminDashboard';
import DatingCards from './DatingCards';
import { API_BASE_URL } from './config';

const AVATAR_BASE = 'https://api.dicebear.com/7.x/avataaars/svg';

function getRandomStrangerName(names = []) {
  if (!names || names.length === 0) return 'Shadow Wolf';
  return names[Math.floor(Math.random() * names.length)];
}

function getRandomCity(cities = []) {
  if (!cities || cities.length === 0) return '🇮🇳 Mumbai';
  return cities[Math.floor(Math.random() * cities.length)];
}

function SearchingAnimation() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fade, setFade] = useState(true);

  const [dynamicAvatars, setDynamicAvatars] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/avatars`)
      .then(res => res.json())
      .then(data => setDynamicAvatars(data.map(a => a.seed_name)))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (dynamicAvatars.length === 0) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIdx(i => (i + 1) % dynamicAvatars.length);
        setFade(true);
      }, 200);
    }, 700);
    return () => clearInterval(interval);
  }, [dynamicAvatars]);

  const seed = dynamicAvatars.length > 0 ? dynamicAvatars[currentIdx] : 'Felix';
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
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff2d55', animation: `bounce 1s infinite ${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );
}

// Relative time helper — e.g. "2 min ago", "3 hrs ago", "Just now"
// MySQL returns timestamps as "2026-05-08 12:34:56" (space, no timezone).
// new Date() treats that as UTC which is 5h30m ahead of IST — causing wrong diffs.
// Fix: replace the space with 'T' so it parses as local time in modern browsers.
function timeAgo(dateStr) {
  if (!dateStr) return '';
  // Normalize MySQL "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DDTHH:MM:SS" (local time)
  const normalized = typeof dateStr === 'string'
    ? dateStr.replace(' ', 'T').replace(/\.\d+$/, '')
    : dateStr;
  const now = Date.now();
  const past = new Date(normalized).getTime();
  const diffMs = now - past;
  if (isNaN(diffMs) || diffMs < 0) return 'Just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr > 1 ? 's' : ''} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  return new Date(normalized).toLocaleDateString();
}

function App() {
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const [status, setStatus] = useState('disconnected');
  const statusRef = useRef('disconnected');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [partnerName, setPartnerName] = useState('Shadow Wolf');
  const partnerNameRef = useRef('Shadow Wolf');
  const [partnerId, setPartnerId] = useState(null);
  const [partnerLastSeen, setPartnerLastSeen] = useState(null);
  const [strangerNames, setStrangerNames] = useState([]);
  const [strangerCities, setStrangerCities] = useState([]);
  const [strangerPopupName, setStrangerPopupName] = useState('Shadow Wolf');
  const [strangerPopupCity, setStrangerPopupCity] = useState('🇮🇳 Mumbai');

  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [partnerAvatar, setPartnerAvatar] = useState(null);
  const [partnerGender, setPartnerGender] = useState('Other');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editGender, setEditGender] = useState('');

  const [partnerTyping, setPartnerTyping] = useState(false);
  const typingTimeout = useRef(null);

  const [callState, setCallState] = useState(null);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  const chatAreaRef = useRef(null);
  const [viewImage, setViewImage] = useState(null); // fullscreen image lightbox
  const [friendRequestToast, setFriendRequestToast] = useState(null); // global FR toast
  const toastTimerRef = useRef(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);

  const [friendRequests, setFriendRequests] = useState([]);

  const [currentView, setCurrentView] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('view') === 'admin' || window.location.pathname === '/admin' || window.location.pathname === '/admin/') return 'admin_seo';
    return sessionStorage.getItem('currentView') || 'chat';
  });

  const [friendsList, setFriendsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStranger, setSelectedStranger] = useState(null);

  const [activeFriendId, setActiveFriendId] = useState(() => {
    const saved = sessionStorage.getItem('activeFriendId');
    return saved ? parseInt(saved, 10) : null;
  });

  const activeFriendIdRef = useRef(null);
  const [totalUnread, setTotalUnread] = useState(0);

  const activeFriend = friendsList.find(f => f.id === activeFriendId);
  const isPendingChat = activeFriend && activeFriend.status === 'pending';

  // ── SEO Management ────────────────────────────────────────────────
  const [seoData, setSeoData] = useState({});
  const [availableAvatars, setAvailableAvatars] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/seo`)
      .then(res => res.json())
      .then(data => setSeoData(data))
      .catch(console.error);

    fetch(`${API_BASE_URL}/api/stranger-settings`)
      .then(res => res.json())
      .then(data => {
        setStrangerNames(data.names);
        setStrangerCities(data.cities);
        setStrangerPopupName(getRandomStrangerName(data.names));
        setStrangerPopupCity(getRandomCity(data.cities));
      })
      .catch(console.error);

    fetch(`${API_BASE_URL}/api/avatars`)
      .then(res => res.json())
      .then(data => setAvailableAvatars(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    // Update Document Meta Tags based on currentView
    const data = seoData[currentView];
    if (data) {
      if (data.title) document.title = data.title;
      
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = data.description || '';

      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = "keywords";
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.content = data.keywords || '';
    } else {
      // Default fallbacks
      document.title = currentView === 'friends' ? 'Friend List - Randomchat' : 
                       currentView === 'find_friend' ? 'Find Friends - Randomchat' :
                       currentView === 'nearby' ? 'Nearby - Randomchat' : 'Randomchat';
    }
  }, [currentView, seoData]);
  // ──────────────────────────────────────────────────────────────────


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
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
  }, [darkMode, appSettings]);

  const currentViewRef = useRef(currentView);
  useEffect(() => {
    currentViewRef.current = currentView;
    sessionStorage.setItem('currentView', currentView);
    if (currentView !== 'chat') {
      // Don't clear activeFriendId here — user may switch tabs and come back
    }
  }, [currentView]);

  const hasInitializedFriendChatRef = useRef(false);

  useEffect(() => {
    activeFriendIdRef.current = activeFriendId;
    if (activeFriendId) {
      sessionStorage.setItem('activeFriendId', activeFriendId.toString());
      // Re-trigger chat history fetch on mount/refresh if we start in a friend chat
      if (socket && friendsList.length > 0 && !hasInitializedFriendChatRef.current) {
        const friend = friendsList.find(f => f.id === activeFriendId);
        if (friend) {
          socket.emit('start_friend_chat', { friendId: friend.id, friendName: friend.nickname });
          hasInitializedFriendChatRef.current = true;
        }
      }
    } else {
      sessionStorage.removeItem('activeFriendId');
      hasInitializedFriendChatRef.current = false;
    }
  }, [activeFriendId, socket, friendsList]);

  const handleSettingsChange = (next) => {
    setAppSettings(next);
  };

  useEffect(() => {
    // Use sessionStorage for both deviceId and sessionId. 
    // This ensures that opening a NEW TAB creates a totally new user for testing, 
    // but REFRESHING the same tab keeps you logged into the same user.
    let deviceId = sessionStorage.getItem('userId');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('userId', deviceId);
    }

    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substr(2, 12);
      sessionStorage.setItem('sessionId', sessionId);
    }
    const backendHost = window.location.hostname;
    const backendUrl = API_BASE_URL;
    // Send sessionId as userId (unique per tab) AND deviceId for profile persistence
    const newSocket = io(backendUrl, { query: { userId: sessionId, deviceId } });
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      // Refresh friends list and badges on every (re)connect
      newSocket.emit('get_friends');
    });

    newSocket.on('profile_info', (data) => {
      setNickname(data.nickname || 'Stranger');
      setGender(data.gender || '');
      setAvatarSeed(data.avatarSeed || '');
      setEditNickname(data.nickname || 'Stranger');
      setEditGender(data.gender || '');

      const dismissed = localStorage.getItem('profilePromptDismissed') === 'true';
      if (!dismissed && currentViewRef.current !== 'admin_seo' && (data.nickname === 'Stranger' || !data.gender)) {
        setShowProfileModal(true);
      }

      if (data.allowSearch !== undefined || data.autoFriendAccept !== undefined) {
        setAppSettings(prev => ({ ...prev, allowSearch: data.allowSearch, autoFriendAccept: data.autoFriendAccept }));
      }
    });

    newSocket.on('waiting', (data) => {
      setStatus('waiting');
      statusRef.current = 'waiting';
      setMessages([]);
    });

    newSocket.on('chat_started', (data) => {
      setStatus('connected');
      statusRef.current = 'connected';
      setPartnerName(data.partnerName || 'Shadow Wolf');
      setPartnerAvatar(data.partnerAvatar || null);
      setPartnerGender(data.partnerGender || 'Other');
      setPartnerId(data.partnerId || null);
      setPartnerLastSeen(data.lastSeen || null);
      partnerNameRef.current = data.partnerName || 'Shadow Wolf';

      if (data.isFriendChat && data.friendId) {
        setMessages([]);
        newSocket.emit('get_chat_history', { friendId: data.friendId });
        newSocket.emit('mark_messages_read', { friendId: data.friendId });
      } else {
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
        setMessages([
          { type: 'system', text: `Stranger(🇮🇳 India) has entered.`, time: now },
          { type: 'notice', text: '[Notice] The following will be blocked.\n- Conversations related to crime.\n- Conversations related to prostitution.\n- Send offensive pictures and videos.\n- Conversation for advertising.', time: now },
          { type: 'link', text: 'The random chat web version has been launched.', time: now }
        ]);
      }
    });

    newSocket.on('receive_message', (data) => {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();

      // Case 1: We are actively viewing this friend's chat
      const isActiveFriendChat =
        activeFriendIdRef.current &&
        Number(data.senderId) === Number(activeFriendIdRef.current) &&
        currentViewRef.current === 'chat';

      // Case 2: We are in stranger chat and this is a stranger message (not from a friend)
      const isActiveStrangerChat =
        !activeFriendIdRef.current &&
        data.isFriendMessage !== true &&
        currentViewRef.current === 'chat' &&
        statusRef.current === 'connected';

      if (isActiveFriendChat) {
        setMessages((prev) => [...prev, { type: 'stranger', text: data.message, msgType: data.type, senderId: data.senderId, readAt: data.read_at, time: now }]);
        // Mark as read immediately since we are viewing this chat
        newSocket.emit('mark_messages_read', { friendId: activeFriendIdRef.current });
      } else if (isActiveStrangerChat) {
        setMessages((prev) => [...prev, { type: 'stranger', text: data.message, msgType: data.type, senderId: data.senderId, readAt: data.read_at, time: now }]);
      } else {
        // Friend message but not currently viewing — update badge only
        newSocket.emit('get_friends');
      }
    });

    newSocket.on('messages_read', (data) => {
      // Mark our sent messages as read — only messages sent to this specific friend
      // data.byFriendId = the friend who just read our messages
      setMessages((prev) =>
        prev.map(msg =>
          msg.type === 'me' && !msg.readAt
            ? { ...msg, readAt: new Date().toISOString() }
            : msg
        )
      );
      // Refresh friends list so double-tick and unread badge sync
      newSocket.emit('get_friends');
    });

    newSocket.on('friend_requests_list', (data) => {
      setFriendRequests(data);
    });

    newSocket.on('friend_request_received', (data) => {
      newSocket.emit('get_friends');

      // ── Global toast notification (any screen) ──
      clearTimeout(toastTimerRef.current);
      setFriendRequestToast({
        senderId: data.senderId,
        senderName: data.senderName || 'Stranger',
        senderAvatar: data.senderAvatar || null,
        senderGender: data.senderGender || 'Other',
      });
      toastTimerRef.current = setTimeout(() => setFriendRequestToast(null), 10000);

      // ── Inline chat card (when in active chat) ──
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
      setMessages((prev) => [...prev, {
        type: 'friend_request_incoming',
        senderId: data.senderId,
        senderName: data.senderName || 'Stranger',
        senderAvatar: data.senderAvatar || null,
        senderGender: data.senderGender || 'Other',
        time: now,
        accepted: false,
        rejected: false
      }]);
    });

    newSocket.on('friend_request_accepted', (data) => {
      newSocket.emit('get_friends');
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();

      setMessages((prev) => {
        // Check if this acceptance is relevant to the current chat:
        // i.e., there's a friend_request_sent or friend_request_incoming in this conversation
        // that matches the acceptor/sender IDs from the event.
        const relevantIds = new Set([data.acceptorId, data.senderId].filter(Boolean));
        const hasMatchingRequest = prev.some(msg =>
          (msg.type === 'friend_request_sent' && relevantIds.size > 0) ||
          (msg.type === 'friend_request_incoming' && relevantIds.has(msg.senderId))
        );

        // Always update double tick on any sent request in this chat
        let updated = prev.map(msg =>
          msg.type === 'friend_request_sent' && !msg.readAt
            ? { ...msg, readAt: new Date().toISOString() }
            : msg
        );

        // Only append the "You are now friends!" system message if
        // this chat actually had the friend request exchange
        if (hasMatchingRequest) {
          updated = [...updated, { type: 'system', text: data.message || 'You are now friends! 🎉', time: now }];
        }

        return updated;
      });
    });

    newSocket.on('partner_typing', (data) => {
      if (data && data.senderId && activeFriendIdRef.current) {
        if (Number(data.senderId) !== Number(activeFriendIdRef.current)) return;
      }
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
          setCallState('active');
        } catch (e) {
          console.error('Error setting remote description:', e);
        }
      }
    });

    newSocket.on('ice_candidate', async (data) => {
      const pc = peerConnection.current;
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data));
        } catch (e) {
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
      const total = data.reduce((sum, f) => sum + (parseInt(f.unread_count) || 0), 0);
      setTotalUnread(total);
    });

    newSocket.on('chat_history', (data) => {
      const { messages: history, myDbId } = data;
      const formatted = history.map(msg => ({
        type: msg.sender_id === myDbId ? 'me' : 'stranger',
        text: msg.message,
        msgType: msg.type,
        readAt: msg.read_at,
        senderId: msg.sender_id,
        time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
      }));
      setMessages(formatted);
    });

    newSocket.on('search_results', (data) => {
      setSearchResults(data);
    });

    newSocket.on('chat_ended', (data) => {
      setStatus('disconnected');
      statusRef.current = 'disconnected';
      // Only clear activeFriendId if this was a stranger chat (friend chats don't fire chat_ended)
      setActiveFriendId(prev => (prev ? prev : null));
      setPartnerTyping(false);  // Always clear typing indicator
      clearTimeout(typingTimeout.current);
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
      setMessages((prev) => [
        ...prev,
        { type: 'link', text: `Send a mail to ${data?.partnerName || partnerNameRef.current || 'Stranger'}`, time: now },
        { type: 'system', text: 'Stranger was sent off.', time: now }
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
    if (!editGender) {
      alert("Please select your gender to continue.");
      return;
    }
    if (socket) {
      socket.emit('update_profile', { nickname: editNickname, gender: editGender, avatarSeed });
      setNickname(editNickname);
      setGender(editGender);
    }
    localStorage.setItem('profilePromptDismissed', 'true');
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
      statusRef.current = 'disconnected';
      setPartnerTyping(false);
      clearTimeout(typingTimeout.current);
      // Only reset activeFriendId if this was a stranger chat (it would be null for stranger chats)
      if (!activeFriendIdRef.current) {
        // stranger chat — nothing extra needed
      } else {
        // Friend chat end — keep activeFriendId so history stays visible
      }
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
      setMessages((prev) => [
        ...prev,
        { type: 'link', text: `Send a mail to ${partnerName}`, time: now },
        { type: 'system', text: 'Chat ended.', time: now }
      ]);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    if (socket) {
      socket.emit('send_message', { message: inputValue.trim(), type: 'text' });
    }
    setMessages((prev) => [...prev, { type: 'me', text: inputValue.trim(), msgType: 'text', readAt: null, time: now }]);
    setInputValue('');
  };

  const handleTyping = (e) => {
    setInputValue(e.target.value);
    if (socket && status === 'connected') socket.emit('typing');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !socket || status !== 'connected') return;
    // Reset input so same file can be re-selected
    e.target.value = '';

    const MAX_SIZE = 800; // max width/height in px
    const QUALITY = 0.72; // JPEG quality (0-1)

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      // Calculate scaled dimensions
      let { width, height } = img;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) { height = Math.round(height * MAX_SIZE / width); width = MAX_SIZE; }
        else { width = Math.round(width * MAX_SIZE / height); height = MAX_SIZE; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const base64Str = canvas.toDataURL('image/jpeg', QUALITY);
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
      socket.emit('send_message', { message: base64Str, type: 'image' });
      setMessages((prev) => [...prev, { type: 'me', msgType: 'image', text: base64Str, readAt: null, time: now }]);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); alert('Could not read image file.'); };
    img.src = objectUrl;
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
    } catch (e) {
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

  return (
    <div className="app-container">

      {/* ── Global Friend Request Toast ───────────────────────── */}
      {friendRequestToast && (
        <div style={{
          position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 3000, width: 'calc(100% - 32px)', maxWidth: '420px',
          background: 'white', borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          padding: '0.9rem 1rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          border: '1.5px solid #ffb3c1',
          animation: 'slideDownFade 0.35s cubic-bezier(0.34,1.56,0.64,1)'
        }}>
          {/* Avatar */}
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${friendRequestToast.senderAvatar || friendRequestToast.senderName}&backgroundColor=c0aede`}
            style={{ width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0, border: '2px solid #ff2d55' }}
            alt="avatar"
          />
          {/* Info */}
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ff2d55', letterSpacing: '0.5px', textTransform: 'uppercase' }}>New Friend Request</span>
              <span style={{ fontSize: '0.8rem' }}>🤝</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {friendRequestToast.senderName}
              <span style={{ fontSize: '0.82rem', marginLeft: '5px', color: friendRequestToast.senderGender === 'F' ? '#e51e3a' : '#007bff' }}>
                {friendRequestToast.senderGender === 'M' ? '♂' : friendRequestToast.senderGender === 'F' ? '♀' : '⚧'}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#888' }}>wants to be your friend</div>
          </div>
          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexShrink: 0 }}>
            <button
              onClick={() => {
                if (socket) socket.emit('accept_friend_request', { senderId: friendRequestToast.senderId });
                setFriendRequests(prev => prev.filter(r => r.id !== friendRequestToast.senderId));
                setTimeout(() => socket && socket.emit('get_friends'), 400);
                // Mark inline chat card as accepted too
                setMessages(prev => prev.map(m =>
                  m.type === 'friend_request_incoming' && m.senderId === friendRequestToast.senderId
                    ? { ...m, accepted: true } : m
                ));
                clearTimeout(toastTimerRef.current);
                setFriendRequestToast(null);
              }}
              style={{ background: '#ff2d55', color: 'white', border: 'none', padding: '0.35rem 0.85rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            >Accept</button>
            <button
              onClick={() => {
                if (socket) socket.emit('reject_friend_request', { senderId: friendRequestToast.senderId });
                setFriendRequests(prev => prev.filter(r => r.id !== friendRequestToast.senderId));
                setMessages(prev => prev.map(m =>
                  m.type === 'friend_request_incoming' && m.senderId === friendRequestToast.senderId
                    ? { ...m, rejected: true } : m
                ));
                clearTimeout(toastTimerRef.current);
                setFriendRequestToast(null);
              }}
              style={{ background: '#f0f0f0', color: '#555', border: '1px solid #ddd', padding: '0.35rem 0.85rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            >Decline</button>
          </div>
          {/* Dismiss X */}
          <button
            onClick={() => { clearTimeout(toastTimerRef.current); setFriendRequestToast(null); }}
            style={{ background: 'none', border: 'none', color: '#bbb', fontSize: '1.1rem', cursor: 'pointer', padding: '0', flexShrink: 0, lineHeight: 1 }}
          >✕</button>
        </div>
      )}

      <header className="header">
        <div className="header-left">
          {currentView === 'friends' || currentView === 'find_friend' ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" onClick={() => {
              setCurrentView('chat');
              if (activeFriendIdRef.current) {
                // Wait, if they go back to chat, we shouldn't necessarily reload history here unless we need to.
                // For now, just set view.
              }
            }} style={{ cursor: 'pointer' }}>
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          ) : (
            <div className="menu-icon" onClick={() => setIsNavOpen(true)}>
              <span></span>
              <span></span>
              <span></span>
              <div className="notification-dot"></div>
            </div>
          )}
          <div className="logo-text">
            {currentView === 'friends' ? 'Friend List' : 
             currentView === 'find_friend' ? 'Find friends' : 
             currentView === 'nearby' ? 'Nearby Friends' : 
             currentView === 'settings' ? 'Settings' : 
             currentView === 'admin_seo' ? 'Admin Panel' : 'Randomchat'}
          </div>
        </div>
        <div className="header-right">
          {currentView === 'chat' && status === 'connected' && (
            <div style={{ display: 'flex', gap: '1rem', marginRight: '1rem' }}>
              <span onClick={() => startCall('audio')} style={{ fontSize: '1.2rem', cursor: 'pointer' }} title="Audio Call">📞</span>
              <span onClick={() => startCall('video')} style={{ fontSize: '1.2rem', cursor: 'pointer' }} title="Video Call">🎥</span>
            </div>
          )}
          {(currentView === 'chat' || currentView === 'nearby') && (
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" onClick={() => {
              if (status === 'connected') {
                setShowPartnerModal(true);
              } else {
                setShowProfileModal(true);
              }
            }} style={{ cursor: 'pointer' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          )}
        </div>
      </header>

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
      ) : currentView === 'admin_seo' ? (
        <AdminDashboard onBack={() => setCurrentView('chat')} />
      ) : currentView === 'nearby' ? (
        <NearbyFriends
          socket={socket}
          onBack={() => setCurrentView('chat')}
          onStartChat={(user) => {
            if (socket) socket.emit('start_friend_chat', { friendId: user.id, friendName: user.nickname });
            setCurrentView('chat');
          }}
        />
      ) : currentView === 'dating_cards' ? (
        <DatingCards
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

          {/* ── Persistent Friend Request Notification Bar ── */}
          {friendRequests.length > 0 && (
            <div
              onClick={() => { setCurrentView('friends'); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '10px', padding: '0.55rem 1rem',
                background: 'linear-gradient(90deg, #ff2d55, #ff6b6b)',
                color: 'white', cursor: 'pointer', flexShrink: 0,
                animation: 'pulse-bar 2s ease-in-out infinite',
                position: 'relative', zIndex: 10,
              }}
            >
              {/* Pulsing ring icon */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <span style={{ fontSize: '1.2rem' }}>🤝</span>
                <span style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  background: 'white', color: '#ff2d55',
                  borderRadius: '50%', width: '16px', height: '16px',
                  fontSize: '0.65rem', fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 0 2px #ff2d55',
                  animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite'
                }}>{friendRequests.length}</span>
              </div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.2 }}>
                  {friendRequests.length === 1
                    ? `${friendRequests[0].nickname || 'Someone'} sent you a friend request!`
                    : `${friendRequests.length} new friend requests!`}
                </div>
                <div style={{ fontSize: '0.72rem', opacity: 0.88 }}>Tap to view → Friend List</div>
              </div>
              <span style={{ fontSize: '1rem', opacity: 0.8 }}>›</span>
            </div>
          )}

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
              } else if (msg.type === 'friend_request_sent') {
                // SENDER side — centered prominent card
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '1rem 0', gap: '4px' }}>
                    <div style={{
                      width: '100%', maxWidth: '320px',
                      background: 'linear-gradient(135deg, #fff5f7, #ffe4ec)',
                      border: '1.5px solid #ff2d55',
                      borderRadius: '16px',
                      padding: '0.9rem 1.1rem',
                      boxShadow: '0 2px 12px rgba(255,45,85,0.15)',
                      animation: 'slideDownFade 0.3s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '1.6rem' }}>🤝</span>
                        <div style={{ flexGrow: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#c0003a', letterSpacing: '0.3px' }}>FRIEND REQUEST SENT</div>
                          <div style={{ fontSize: '0.82rem', color: '#555', marginTop: '2px' }}>To <strong>{msg.targetName}</strong></div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', color: msg.readAt ? '#34c759' : '#bbb', fontWeight: 700, flexShrink: 0 }}>
                          {msg.time || ''}
                          <span style={{ fontSize: '1rem' }}>{msg.readAt ? '✓✓' : '✓'}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#aaa', textAlign: 'center', borderTop: '1px solid #ffd0dc', paddingTop: '6px', marginTop: '4px' }}>
                        Waiting for {msg.targetName} to accept...
                      </div>
                    </div>
                  </div>
                );
              } else if (msg.type === 'friend_request_incoming') {
                // RECEIVER side — centered prominent card with Accept/Decline
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '1rem 0', gap: '4px' }}>
                    <div style={{
                      width: '100%', maxWidth: '320px',
                      background: 'linear-gradient(135deg, #f0f9ff, #e0f0ff)',
                      border: '1.5px solid #007bff',
                      borderRadius: '16px',
                      padding: '0.9rem 1.1rem',
                      boxShadow: '0 2px 12px rgba(0,123,255,0.15)',
                      animation: 'slideDownFade 0.3s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderAvatar || msg.senderName}&backgroundColor=c0aede`}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #007bff', flexShrink: 0 }}
                          alt="avatar"
                        />
                        <div style={{ flexGrow: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#0057b8', letterSpacing: '0.3px', textTransform: 'uppercase' }}>New Friend Request 🤝</div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111', marginTop: '1px' }}>
                            {msg.senderName}
                            <span style={{ marginLeft: '5px', fontSize: '0.82rem', color: msg.senderGender === 'F' ? '#e51e3a' : '#007bff' }}>
                              {msg.senderGender === 'M' ? '♂' : msg.senderGender === 'F' ? '♀' : '⚧'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.77rem', color: '#666' }}>wants to be your friend</div>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#aaa', flexShrink: 0 }}>{msg.time || ''}</div>
                      </div>
                      {msg.accepted ? (
                        <div style={{ textAlign: 'center', color: '#34c759', fontWeight: 700, fontSize: '0.88rem', padding: '4px 0', borderTop: '1px solid #cce5ff' }}>
                          ✅ You are now friends!
                        </div>
                      ) : msg.rejected ? (
                        <div style={{ textAlign: 'center', color: '#aaa', fontSize: '0.85rem', padding: '4px 0', borderTop: '1px solid #cce5ff' }}>
                          ❌ Request Declined
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #cce5ff', paddingTop: '8px' }}>
                          <button
                            onClick={() => {
                              if (socket) socket.emit('accept_friend_request', { senderId: msg.senderId });
                              setFriendRequests(prev => prev.filter(r => r.id !== msg.senderId));
                              setTimeout(() => socket && socket.emit('get_friends'), 400);
                              setMessages(prev => prev.map((m, i) =>
                                i === idx ? { ...m, accepted: true } : m
                              ));
                              // Also dismiss toast if it's the same sender
                              if (friendRequestToast && friendRequestToast.senderId === msg.senderId) {
                                clearTimeout(toastTimerRef.current);
                                setFriendRequestToast(null);
                              }
                            }}
                            style={{ flex: 1, background: '#007bff', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                          >✔ Accept</button>
                          <button
                            onClick={() => {
                              if (socket) socket.emit('reject_friend_request', { senderId: msg.senderId });
                              setFriendRequests(prev => prev.filter(r => r.id !== msg.senderId));
                              setMessages(prev => prev.map((m, i) =>
                                i === idx ? { ...m, rejected: true } : m
                              ));
                              if (friendRequestToast && friendRequestToast.senderId === msg.senderId) {
                                clearTimeout(toastTimerRef.current);
                                setFriendRequestToast(null);
                              }
                            }}
                            style={{ flex: 1, background: 'white', color: '#555', border: '1px solid #cce5ff', padding: '0.5rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                          >✖ Decline</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              } else if (msg.type === 'stranger') {
                return (
                  <div key={idx} className="msg-stranger-wrapper">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerAvatar || partnerName}&backgroundColor=c0aede`} className="stranger-avatar" alt="avatar" />
                    <div className="stranger-msg-content">
                      <div className="stranger-name">
                        {partnerName}
                        <span className={`gender-badge ${partnerGender}`}>
                          {partnerGender === 'M' ? '♂' : partnerGender === 'F' ? '♀' : '⚧'}
                        </span>
                      </div>
                      <div className="stranger-bubble-row">
                        <div className="msg-stranger-bubble">
                          {msg.msgType === 'image'
                            ? <img src={msg.text} onClick={() => setViewImage(msg.text)} style={{ maxWidth: '100%', borderRadius: '10px', cursor: 'zoom-in', display: 'block' }} alt="attachment" />
                            : msg.text}
                        </div>
                        <div className="msg-time">{msg.time || ''}</div>
                      </div>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={idx} className="msg-me-wrapper">
                    <div className="msg-time" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {msg.time || ''}
                      <span style={{ color: msg.readAt ? '#34c759' : '#ccc', fontSize: '0.9rem', fontWeight: 'bold' }}>
                        {msg.readAt ? '✓✓' : '✓'}
                      </span>
                    </div>
                    <div className="msg-me-bubble">
                      {msg.msgType === 'image'
                        ? <img src={msg.text} onClick={() => setViewImage(msg.text)} style={{ maxWidth: '100%', borderRadius: '10px', cursor: 'zoom-in', display: 'block' }} alt="attachment" />
                        : msg.text}
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
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                </svg>
              </button>
              <label htmlFor="image-upload" className="icon-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                  <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
                </svg>
              </label>
              <input type="file" id="image-upload" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              <div className="chat-input-pill">
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleTyping}
                  disabled={status !== 'connected' || isPendingChat}
                  placeholder={isPendingChat ? "Waiting for user to accept request..." : (status === 'waiting' ? "Searching..." : "")}
                />
                <span className="chat-sparkle">✨</span>
              </div>
              <button type="submit" className="send-btn-circle" disabled={status !== 'connected' || !inputValue.trim() || isPendingChat}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
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
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar_seed || user.nickname}&backgroundColor=c0aede`} style={{ width: '45px', height: '45px', borderRadius: '50%' }} alt="avatar" />
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#333' }}>{user.nickname}</div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#aaa', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {timeAgo(user.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      ) : currentView === 'faqs' ? (
        <main className="chat-messages-container" style={{ padding: 0 }}>
          <div className="header" style={{ position: 'sticky', top: 0 }}>
            <div className="header-left">
              <button onClick={() => setCurrentView('chat')} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>←</button>
              <div className="logo-text" style={{ fontSize: '1.2rem', marginLeft: '0.5rem' }}>FAQs</div>
            </div>
          </div>
          <div style={{ padding: '1rem', overflowY: 'auto' }}>
            <FAQList />
          </div>
        </main>
      ) : (
        <main className="friend-list-page" style={{ flexGrow: 1, background: '#f5f5f5', overflowY: 'auto', minHeight: 0 }}>
          {friendRequests.length > 0 && (
            <div style={{ padding: '1rem', background: '#fff9fa', borderBottom: '1px solid #ffccd5' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#e51e3a', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Pending Requests ({friendRequests.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {friendRequests.map((req, idx) => (
                  <div key={`req_${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'white', padding: '0.8rem', borderRadius: '10px', boxShadow: '0 2px 8px rgba(229, 30, 58, 0.1)' }}>
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.avatar_seed || req.nickname}&backgroundColor=c0aede`} style={{ width: '45px', height: '45px', borderRadius: '50%' }} alt="avatar" />
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#222' }}>{req.nickname}</div>
                      <div style={{ fontSize: '0.8rem', color: req.gender === 'F' ? '#e51e3a' : req.gender === 'M' ? '#007bff' : '#8e44ad' }}>
                        {req.gender === 'M' ? '♂ Male' : req.gender === 'F' ? '♀ Female' : '⚧ Other'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" onClick={() => {
                        if (socket) {
                          socket.emit('accept_friend_request', { senderId: req.id });
                          // Optimistic: remove from pending list immediately
                          setFriendRequests(prev => prev.filter(r => r.id !== req.id));
                          setTimeout(() => socket.emit('get_friends'), 400);
                        }
                      }} style={{ background: '#ff2d55', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>Accept</button>
                      <button type="button" onClick={() => {
                        if (socket) {
                          socket.emit('reject_friend_request', { senderId: req.id });
                          // Optimistic: remove from pending list immediately
                          setFriendRequests(prev => prev.filter(r => r.id !== req.id));
                          setTimeout(() => socket.emit('get_friends'), 400);
                        }
                      }} style={{ background: '#f5f5f5', color: '#555', border: '1px solid #ccc', padding: '0.4rem 0.8rem', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {friendsList.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#888', marginTop: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <p>No friends yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {friendsList.map((friend, idx) => {
                const unread = parseInt(friend.unread_count) || 0;
                const lastMsg = friend.last_message;
                const lastMsgType = friend.last_message_type;
                const lastTime = friend.last_message_time
                  ? timeAgo(friend.last_message_time)
                  : null;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem', borderBottom: '1px solid #eaeaea', background: 'white' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.avatar_seed || friend.nickname}&backgroundColor=c0aede`} style={{ width: '50px', height: '50px', borderRadius: '50%', display: 'block' }} alt="avatar" />
                      {/* Avatar unread badge removed to avoid duplication */}
                    </div>
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#222', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {friend.nickname}
                          {friend.status === 'pending' && (
                            <span style={{ fontSize: '0.65rem', background: '#eee', color: '#888', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Requested</span>
                          )}
                        </div>
                        {lastTime && <div style={{ fontSize: '0.72rem', color: '#aaa', flexShrink: 0 }}>{lastTime}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                        <div style={{ fontSize: '0.82rem', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                          {lastMsg ? (lastMsgType === 'image' ? '📷 Photo' : lastMsg) : (
                            <span style={{ color: friend.gender === 'F' ? '#ff2d55' : friend.gender === 'M' ? '#007bff' : '#8e44ad', fontSize: '0.8rem' }}>
                              {friend.gender === 'M' ? '♂ Male' : friend.gender === 'F' ? '♀ Female' : '⚧ Other'}
                            </span>
                          )}
                        </div>
                        {unread > 0 && (
                          <span style={{ background: '#ff2d55', color: 'white', borderRadius: '12px', minWidth: '20px', height: '20px', fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0, marginLeft: '6px' }}>{unread > 99 ? '99+' : unread}</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => {
                      setActiveFriendId(friend.id);
                      if (socket) {
                        socket.emit('start_friend_chat', { friendId: friend.id, friendName: friend.nickname });
                        setTimeout(() => socket.emit('get_friends'), 800);
                      }
                      setCurrentView('chat');
                    }} style={{ background: '#ff2d55', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', flexShrink: 0 }}>Chat</button>
                  </div>
                );
              })}
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
      {showProfileModal && currentView !== 'admin_seo' && (
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
                <option value="" disabled>Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => {
                  localStorage.setItem('profilePromptDismissed', 'true');
                  setShowProfileModal(false);
                }}
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
              {(availableAvatars.length > 0 ? availableAvatars : [
                { id: 1, seed_name: 'Felix' }, { id: 2, seed_name: 'Aneka' }, { id: 3, seed_name: 'Oliver' }, { id: 4, seed_name: 'Molly' }
              ]).map((avatar) => (
                <div key={avatar.id} onClick={() => selectAvatar(avatar.seed_name)} style={{ cursor: 'pointer', borderRadius: '10px', padding: '5px', background: avatarSeed === avatar.seed_name ? '#eaeaea' : 'transparent', border: avatarSeed === avatar.seed_name ? '2px solid #ff2d55' : '2px solid transparent' }}>
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatar.seed_name}&backgroundColor=c0aede`} style={{ width: '100%', aspectRatio: '1/1', borderRadius: '50%' }} alt="avatar" />
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
              <div className="profile-avatar" onClick={() => { setShowProfileModal(true); setIsNavOpen(false); }} style={{ cursor: 'pointer' }}>
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed || nickname}&backgroundColor=c0aede`} alt="avatar" />
                <div className="edit-icon">✎</div>
              </div>
              <div className="profile-info">
                <div className="profile-name">
                  {nickname || '...'}
                  <span style={{ fontSize: '0.9rem', marginLeft: '0.5rem', color: gender === 'F' ? '#e51e3a' : gender === 'M' ? '#007bff' : '#888' }}>
                    {gender === 'M' ? '♂' : gender === 'F' ? '♀' : '⚧'}
                  </span>
                  <span className="gear-icon" onClick={() => { setShowProfileModal(true); setIsNavOpen(false); }} style={{ cursor: 'pointer', marginLeft: '0.5rem' }}>⚙️</span>
                </div>
                <div className="profile-coins">
                  <div className="coin-icon">P</div> 0
                  <button className="btn-buy-voucher">Buy voucher</button>
                </div>
              </div>
            </div>

            <div className="nav-menu-card">
              <div className="nav-item" onClick={() => {
                setCurrentView('dating_cards');
                setIsNavOpen(false);
              }} style={{ cursor: 'pointer' }}>
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
                {(totalUnread > 0 || friendRequests.length > 0) && (
                  <span className="nav-badge" style={{ background: '#ff2d55', marginLeft: 'auto' }}>
                    {totalUnread + friendRequests.length > 99 ? '99+' : totalUnread + friendRequests.length}
                  </span>
                )}
              </div>
              <div className="nav-item" onClick={() => {
                setCurrentView('nearby');
                setIsNavOpen(false);
              }} style={{ cursor: 'pointer' }}>
                <span className="nav-icon">🌍</span>
                <span className="nav-text">Nearby friends</span>
              </div>
              <div className="nav-item" onClick={() => {
                setCurrentView('faqs');
                setIsNavOpen(false);
              }} style={{ cursor: 'pointer' }}>
                <span className="nav-icon">❓</span>
                <span className="nav-text">FAQs</span>
              </div>
              <div className="nav-item" onClick={() => { setCurrentView('settings'); setIsNavOpen(false); }} style={{ cursor: 'pointer' }}>
                <span className="nav-icon">⚙️</span>
                <span className="nav-text">Settings</span>
              </div>
            </div>

            {/* Admin Section */}
            <div className="nav-menu-card" style={{ marginTop: '1rem', border: '1px solid #ffb3c1', background: 'linear-gradient(135deg, #fff0f3, #ffe4ec)' }}>
              <div className="nav-item" onClick={() => { setCurrentView('admin_seo'); setIsNavOpen(false); }} style={{ cursor: 'pointer' }}>
                <span className="nav-icon">📈</span>
                <span className="nav-text" style={{ fontWeight: 'bold', color: '#ff2d55' }}>Admin Dashboard</span>
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
              <span>🔒 {selectedStranger ? selectedStranger.nickname : (status === 'connected' ? partnerName : strangerPopupName)}</span>
            </div>

            <div className="partner-map-area">
              <div className="partner-map-overlay">
                <p>📍 {selectedStranger ? '🇮🇳 India' : strangerPopupCity}</p>
                <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.25rem' }}>Please allow location permissions to view distance information.</p>
                <button className="btn-allow-location" onClick={() => {
                  if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition((position) => {
                      const { latitude, longitude } = position.coords;
                      if (socket) socket.emit('update_location', { lat: latitude, lng: longitude });
                      alert("Location updated!");
                    }, (error) => {
                      alert("Error getting location: " + error.message);
                    });
                  } else {
                    alert("Geolocation is not supported by this browser.");
                  }
                }}>ALLOW PERMISSIONS</button>
              </div>
            </div>

            <div className="partner-info-card">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedStranger ? (selectedStranger.avatarSeed || selectedStranger.nickname) : (partnerAvatar || partnerName)}&backgroundColor=c0aede`} className="stranger-avatar" alt="avatar" />
              <div className="partner-details">
                <div className="partner-country">{selectedStranger ? '🇮🇳 India' : strangerPopupCity}</div>
                <div className="partner-sub" style={{ color: selectedStranger ? (selectedStranger.gender === 'F' ? '#e51e3a' : selectedStranger.gender === 'M' ? '#007bff' : '#888') : '#007bff' }}>
                  {selectedStranger ? (selectedStranger.gender === 'M' ? '♂ Male' : selectedStranger.gender === 'F' ? '♀ Female' : '⚧ Other') : (partnerGender === 'F' ? '♀ Female' : partnerGender === 'M' ? '♂ Male' : '⚧ Other')} · {selectedStranger ? timeAgo(selectedStranger.last_seen) : (partnerLastSeen ? timeAgo(partnerLastSeen) : 'just now')}
                </div>
              </div>
              <div className="partner-heart">🤍</div>
            </div>

            <div className="partner-action-list">
              <div className="partner-action-item" onClick={() => {
                const targetName = selectedStranger ? selectedStranger.nickname : partnerName;
                if (socket) socket.emit('send_friend_request', { friendId: selectedStranger ? selectedStranger.id : null });
                setShowPartnerModal(false);
                const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
                setMessages((prev) => [...prev, {
                  type: 'friend_request_sent',
                  text: `Friend request sent to ${targetName}`,
                  targetName,
                  time: now,
                  readAt: null
                }]);
              }}>
                <span className="action-icon" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0', lineHeight: '1' }}>
                  <span style={{ fontSize: '1.1rem' }}>👤</span>
                  <span style={{ fontSize: '0.7rem', marginTop: '-4px', fontWeight: 'bold' }}>+</span>
                </span> Add friends
              </div>
              <div className="partner-action-item">
                <span className="action-icon">🎁</span> Give points
              </div>
              <div className="partner-action-item" onClick={() => {
                const targetId = selectedStranger ? selectedStranger.id : partnerId;
                if (!targetId) return;
                if (window.confirm("Are you sure you want to block this user?")) {
                  if (socket) socket.emit('block_user', { targetId });
                  setShowPartnerModal(false);
                }
              }}>
                <span className="action-icon">🚫</span> Block user
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Fullscreen Image Lightbox */}
      {viewImage && (
        <div
          onClick={() => setViewImage(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setViewImage(null)}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: '50%', width: '40px', height: '40px',
              color: 'white', fontSize: '1.3rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)'
            }}
          >✕</button>
          <img
            src={viewImage}
            alt="full"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '95vw', maxHeight: '90vh',
              borderRadius: '12px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              objectFit: 'contain',
              userSelect: 'none'
            }}
          />
        </div>
      )}

    </div>
  );
}

const FAQList = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/faqs`)
      .then(res => res.json())
      .then(data => {
        setFaqs(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  if (loading) return <p style={{ textAlign: 'center', padding: '2rem' }}>Loading FAQs...</p>;
  if (faqs.length === 0) return <p style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No FAQs available yet.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {faqs.map(faq => (
        <div key={faq.id} style={{ background: 'white', borderRadius: '12px', padding: '1.2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h4 style={{ color: '#ff2d55', marginBottom: '0.5rem', fontSize: '1.05rem' }}>{faq.question}</h4>
          <p style={{ color: '#555', fontSize: '0.95rem', lineHeight: '1.5' }}>{faq.answer}</p>
        </div>
      ))}
    </div>
  );
};

export default App;
