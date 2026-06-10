import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const SUGGESTED_PROMPTS = [
  'What notes do I have about meetings?',
  'Summarize my recent notes',
  'Find anything related to tasks or todos',
  'What did I write about last week?',
];

export default function ChatBox({ secretKey }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessage = async (queryText) => {
    if (!queryText.trim() || loading) return;

    setError(null);
    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText.trim(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const headers = secretKey ? { 'x-secret-key': secretKey } : {};
      const { data } = await axios.post('/api/ask', {
        question: queryText.trim()
      }, { headers });

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.answer,
        sources: data.sources || [],
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Ask error:', err);
      setError('Failed to reach AI. Please check your backend.');
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: '⚠ Sorry, I couldn\'t generate a response right now. Please check your server connection.',
        sources: [],
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="chatbox">
      {/* Messages or Welcome */}
      <div className="chat-messages">
        {!hasMessages ? (
          <div className="chat-welcome">
            <div className="welcome-icon">🤖</div>
            <h2>Your AI Notes Assistant</h2>
            <p>Ask me anything. I'll search through your notes and give you intelligent answers.</p>
            <div className="welcome-chips">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  className="welcome-chip"
                  onClick={() => sendMessage(prompt)}
                  id={`welcome-chip-${i}`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`message-row ${message.sender}`}
            >
              {message.sender === 'ai' && (
                <div className="ai-label">
                  <div className="ai-avatar">🤖</div>
                  Notes AI
                </div>
              )}
              <div className="message-bubble">
                {message.text}
              </div>
              {/* Source citations */}
              {message.sender === 'ai' && message.sources && message.sources.length > 0 && (
                <div className="source-tags">
                  {message.sources.map((source, idx) => (
                    <span key={source.id || idx} className="source-tag">
                      📄 {source.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {/* Typing indicator */}
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
      <div className="chat-input-area">
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
          <button
            type="submit"
            className="btn-send"
            disabled={loading || !input.trim()}
            id="btn-send-message"
            title="Send message"
          >
            {loading ? (
              <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
            ) : '➤'}
          </button>
        </form>
        {error && <div className="chat-error">⚠ {error}</div>}
      </div>
    </div>
  );
}
