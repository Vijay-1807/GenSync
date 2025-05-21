import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { format } from 'date-fns';
import './Chat.css';
import { getGeminiReply } from '../gemini';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const navigate = useNavigate();

  // Initial message setup (remains local)
  useEffect(() => {
    const initialMessage = {
      id: 'initial_gemini_greeting',
      text: "Hi! I\u2019m Gemini, your AI assistant. How can I help you today?",
      sender: 'Gemini',
      senderName: 'Gemini AI',
      avatar: '/images/gemini-logo.png',
      timestamp: new Date(), // Use current date for local display
      type: 'bot'
    };
    setMessages([initialMessage]);
  }, []);

  // Authentication check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
      } else {
        setIsLoading(false);
        // We don't explicitly call getInitialGeminiMessage here anymore
        // as it's handled by the initial useEffect and the Firestore listener
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Firestore messages listener
  useEffect(() => {
    if (isLoading) return;

    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Merge initial greeting with Firestore messages, ensuring greeting is first
      setMessages(prev => {
        const initialGreeting = prev.find(msg => msg.id === 'initial_gemini_greeting');
        const combinedMessages = initialGreeting ? [initialGreeting, ...firestoreMessages] : firestoreMessages;
        
        // Remove duplicate greeting if it somehow got into Firestore
        const uniqueMessages = [];
        const messageIds = new Set();
        for (const msg of combinedMessages) {
            if (!messageIds.has(msg.id)) {
                uniqueMessages.push(msg);
                messageIds.add(msg.id);
            }
        }
        return uniqueMessages;
      });
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [isLoading]); // Depend on isLoading to start listening after auth

  useEffect(() => {
    const userStatusRef = doc(db, "status", auth.currentUser?.email || 'Anonymous');
    const typingRef = doc(db, "typing", auth.currentUser?.email || 'Anonymous');

    const updateOnlineStatus = async (status) => {
      await setDoc(userStatusRef, {
        state: status,
        lastChanged: serverTimestamp(),
      });
    };

    const initializeTypingStatus = async () => {
      await setDoc(typingRef, {
        isTyping: false,
        timestamp: serverTimestamp()
      });
    };

    updateOnlineStatus('online');
    initializeTypingStatus();

    const typingUnsubscribe = onSnapshot(collection(db, "typing"), (snapshot) => {
      const typingStatus = {};
      snapshot.forEach(doc => {
        if (doc.id !== auth.currentUser?.email) {
          typingStatus[doc.id] = doc.data().isTyping;
        } else {
           // Optional: handle self typing status if needed
        }
      });
      setTypingUsers(typingStatus);
    });

    return () => {
      typingUnsubscribe();
      updateOnlineStatus('offline');
       // Also set typing status to false on unmount
      setDoc(doc(db, "typing", auth.currentUser?.email || 'Anonymous'), {
        isTyping: false,
        timestamp: serverTimestamp()
      });
    };
  }, [auth.currentUser?.email]); // Depend on user email

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const user = auth.currentUser;
    if (!user) return;

    const userMessageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately

    // Add user message to Firestore first
    await addDoc(collection(db, 'messages'), {
      text: userMessageText,
      sender: user.email,
      senderName: user.displayName || user.email.split('@')[0],
      timestamp: serverTimestamp(),
      avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=4285F4&color=fff`,
      type: 'user'
    });

    try {
      // Prepare history for Gemini (exclude the initial local greeting)
      const historyForGemini = messages
                                .filter(msg => msg.id !== 'initial_gemini_greeting')
                                .map(msg => ({ role: msg.type === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));

      // Get Gemini's response, passing the relevant history
      const botReplyText = await getGeminiReply(userMessageText, historyForGemini);
      
      if (botReplyText) {
        // Add bot message to Firestore
        await addDoc(collection(db, 'messages'), {
          text: botReplyText,
          sender: 'Gemini',
          senderName: 'Gemini AI',
          avatar: '/images/gemini-logo.png',
          timestamp: serverTimestamp(), // Use server timestamp for correct ordering
          type: 'bot'
        });
        // The onSnapshot listener will pick this up and update state
      }
    } catch (error) {
      console.error('Error sending message or getting Gemini reply:', error);
       // Optional: Add a system message to Firestore indicating the bot failed
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
       // Optionally clear local messages and history on logout
      setMessages([]);
       // resetConversation(); // If using internal history in gemini.js
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

   const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      setDoc(doc(db, "typing", auth.currentUser?.email || 'Anonymous'), {
        isTyping: true,
        timestamp: serverTimestamp()
      }, { merge: true }); // Use merge to update without overwriting other fields
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
       setDoc(doc(db, "typing", auth.currentUser?.email || 'Anonymous'), {
        isTyping: false,
        timestamp: serverTimestamp()
      }, { merge: true });
    }, 2000); // Stop typing indicator after 2 seconds of no typing
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
     // Check if the timestamp is a Firebase Timestamp object
    const date = timestamp.toDate && typeof timestamp.toDate === 'function' ? timestamp.toDate() : timestamp;
    return format(date, 'MMM d, h:mm a'); // Include date and time
  };

   // getInitialGeminiMessage is no longer needed as a separate function call after auth
  // It's handled by the initial useState and the Firestore listener merge logic

  if (isLoading) {
    return (
      <div className="chat-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>
          <div className="chat-header-icon">
           🤖
          </div>
          Gemini Chat
        </h2>
        <div className="header-controls">
           {/* Placeholder for Profile Dropdown */}
          <div className="profile-dropdown-placeholder">
            {/* User Avatar or Icon */}
            {auth.currentUser?.displayName || auth.currentUser?.email.split('@')[0]}
          </div>
          <div className="online-status">
            <div className="status-dot"></div>
            <span>Online</span>
          </div>
          {/* Moved Sign Out into profile dropdown or keep separate? Keeping separate for now. */}
           <button onClick={handleLogout} className="logout-button">
            Sign Out
          </button>
        </div>
      </div>
      
      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${
              message.sender === auth.currentUser?.email ? 'message-sent' : 'message-received'
            } ${message.type === 'bot' ? 'message-bot' : ''}`}
          >
            <div className="message-avatar-container">
               {/* Use Font Awesome or other icon here, e.g., <i className="fas fa-user-circle"></i> */}
               {/* For Gemini AI, use a different icon/avatar */}
              {message.avatar ? (
                <img src={message.avatar} alt="avatar" className="message-avatar" />
              ) : (
                // Fallback to first letter if no avatar
                message.senderName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="message-content-area">
              <div className="sender-name">{message.senderName}</div>
              <div className="message-text">{message.text}</div>
              <div className="message-timestamp">
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
            {/* Optional: Copy button for bot messages */}
            {message.sender !== auth.currentUser?.email && (
                <button className="copy-button">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
            )}
          </div>
        ))}
        {/* Message Loading Indicator for Bot */}
         {/* You would typically control when this shows based on the bot's response status */}
         {/* Example conditional rendering: {isBotResponding && (<div className="message-loading-indicator">...</div>)}*/}
        {Object.entries(typingUsers).map(([user, isTyping]) => 
          isTyping && auth.currentUser?.email !== user && ( // Check if user is not the current user
            <div key={user} className="typing-indicator">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="typing-text">{user.split('@')[0]} is typing...</span>
            </div>
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="input-container">
        <div className="input-field-area">
          {/* Optional: Attach Icon - e.g., <i className="fas fa-paperclip input-icon"></i> */}
           {/* Optional: Emoji Icon - e.g., <i className="far fa-smile input-icon"></i> */}
        <input
          type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
          placeholder="Type your message..."
            className="message-input"
        />
      </div>
        <button type="submit" className="send-button" disabled={!newMessage.trim()}>
          {/* Send Icon - e.g., <i className="fas fa-arrow-up"></i> */}
          <svg className="send-icon" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default Chat;
