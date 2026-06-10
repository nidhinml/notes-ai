import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const SUGGESTED_PROMPTS = [
  'What notes do I have about meetings?',
  'Summarize my recent notes',
  'Find anything related to tasks or todos',
  'What did I write about last week?',
];

// Floating orb config — positions, sizes, colors, animation durations
const ORBS = [
  { size: 320, top: '8%',  left: '10%',  color: 'rgba(124,92,252,0.13)', dur: 14, delay: 0   },
  { size: 220, top: '55%', left: '70%',  color: 'rgba(6,182,212,0.10)',  dur: 18, delay: -5  },
  { size: 160, top: '25%', left: '60%',  color: 'rgba(240,171,252,0.08)',dur: 11, delay: -3  },
  { size: 260, top: '70%', left: '5%',   color: 'rgba(99,102,241,0.10)', dur: 20, delay: -8  },
  { size: 120, top: '40%', left: '40%',  color: 'rgba(6,182,212,0.07)',  dur: 16, delay: -11 },
];

// Light floating cards — decorative glassmorphism panels in background
const LIGHT_CARDS = [
  { top: '12%', right: '8%',  w: 120, h: 70,  rot: '12deg',  dur: 18, delay: 0   },
  { top: '60%', left: '6%',   w: 90,  h: 55,  rot: '-8deg',  dur: 22, delay: -7  },
  { top: '35%', right: '15%', w: 70,  h: 44,  rot: '20deg',  dur: 15, delay: -4  },
  { top: '80%', right: '20%', w: 100, h: 60,  rot: '-14deg', dur: 19, delay: -12 },
];

export default function ChatBox({ secretKey }) {
  // Use a user-specific key so chat history is kept separate per key profile
  const storageKey = `chat_history_${secretKey || 'default'}`;

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // Persist chat history changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (err) {
      console.error('Failed to save chat history to localStorage:', err);
    }
  }, [messages, storageKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (queryText) => {
    if (!queryText.trim() || loading) return;

    setError(null);
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: queryText.trim() }]);
    setInput('');
    setLoading(true);

    try {
      const headers = secretKey ? { 'x-secret-key': secretKey } : {};
      const { data } = await axios.post('/api/ask', { question: queryText.trim() }, { headers });
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.answer,
        sources: data.sources || [],
      }]);
    } catch (err) {
      console.error('Ask error:', err);
      setError('Failed to reach AI. Please check your backend.');
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: "⚠ Sorry, I couldn't generate a response. Please check your server connection.",
        sources: [],
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear your conversation history?")) {
      setMessages([]);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(input); };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="chatbox" style={{ position: 'relative', overflow: 'hidden' }}>

      {/* Clear Chat Button */}
      {hasMessages && (
        <button 
          className="btn-clear-chat" 
          onClick={clearChat}
          id="btn-clear-chat"
          title="Clear Conversation History"
        >
          🧹 Clear Chat
        </button>
      )}

      {/* ══════ 3D BACKGROUND LAYER ══════ */}
      <div className="chat-bg-layer" aria-hidden="true">

        {/* Floating gradient orbs */}
        {ORBS.map((orb, i) => (
          <div key={i} className="chat-bg-orb" style={{
            width:  orb.size,
            height: orb.size,
            top:    orb.top,
            left:   orb.left,
            background: `radial-gradient(circle, ${orb.color}, transparent 65%)`,
            animationDuration: `${orb.dur}s`,
            animationDelay:    `${orb.delay}s`,
          }} />
        ))}

        {/* Light glass floating cards */}
        {LIGHT_CARDS.map((card, i) => (
          <div key={i} className="chat-bg-card" style={{
            width:  card.w,
            height: card.h,
            top:    card.top,
            left:   card.left,
            right:  card.right,
            transform: `rotate(${card.rot})`,
            animationDuration: `${card.dur}s`,
            animationDelay:    `${card.delay}s`,
          }} />
        ))}

        {/* Subtle dot grid */}
        <div className="chat-bg-dots" />

        {/* 🚀 Flying AI Drone / Orbs flying over the chat window */}
        <div className="chat-flying-ai-drone drone-1" aria-hidden="true">🤖</div>
        <div className="chat-flying-ai-drone drone-2" aria-hidden="true">🛸</div>
        <div className="chat-flying-ai-drone drone-3" aria-hidden="true">✨</div>
        <div className="chat-flying-ai-drone drone-4" aria-hidden="true">💫</div>
      </div>
      {/* ══════ END BACKGROUND LAYER ══════ */}

      {/* Messages Area */}
      <div className="chat-messages" style={{ position: 'relative', zIndex: 1 }}>
        {!hasMessages ? (
          <div className="chat-welcome">
            <div className="welcome-icon">🤖</div>
            <h2>Your AI Notes Assistant</h2>
            <p>Ask me anything. I'll search through your notes and give you intelligent answers.</p>
            <div className="welcome-chips">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button key={i} className="welcome-chip"
                  onClick={() => sendMessage(prompt)} id={`welcome-chip-${i}`}>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(message => (
            <div key={message.id} className={`message-row ${message.sender}`}>
              {message.sender === 'ai' && (
                <div className="ai-label">
                  <div className="ai-avatar">🤖</div>
                  Notes AI
                </div>
              )}
              <div className="message-bubble">{message.text}</div>
              {message.sender === 'ai' && message.sources?.length > 0 && (
                <div className="source-tags">
                  {message.sources.map((source, idx) => (
                    <span key={source.id || idx} className="source-tag">📄 {source.title}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="typing-indicator">
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="chat-input-area" style={{ position: 'relative', zIndex: 1 }}>
        <form className="chat-input-form" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            id="chat-input"
            className="chat-input-field"
            placeholder="Ask about your notes… (Shift+Enter for newline)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={1}
          />
          <button type="submit" className="btn-send"
            disabled={loading || !input.trim()} id="btn-send-message" title="Send">
            {loading
              ? <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} />
              : '➤'}
          </button>
        </form>
        {error && <div className="chat-error">⚠ {error}</div>}
      </div>
    </div>
  );
}
