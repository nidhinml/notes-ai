import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function ChatBox() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hi! Ask me anything about your notes.',
      sources: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const queryText = input.trim();
    setInput('');
    setError(null);

    // Append User Message to conversation list
    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText,
      sources: []
    };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await axios.post('/api/ask', {
        question: queryText
      });

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: response.data.answer,
        sources: response.data.sources || []
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Error in ask query:', err);
      setError('Failed to reach AI server. Please verify connections.');
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'Sorry, I failed to generate an answer due to server connection issues. Check backend config.',
        sources: []
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-t md:border-t-0 border-slate-200">
      {/* Panel Title */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <span>🤖</span> AI Chat Assistant
        </h2>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex flex-col max-w-[80%] ${
              message.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
            }`}
          >
            {/* Bubble */}
            <div
              className={`rounded-2xl px-4 py-3 text-sm shadow-sm whitespace-pre-wrap leading-relaxed ${
                message.sender === 'user'
                  ? 'bg-purple-600 text-white rounded-br-none'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
              }`}
            >
              {message.text}
            </div>

            {/* Citations/Sources Taglist */}
            {message.sender === 'ai' && message.sources && message.sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                {message.sources.map((source, idx) => (
                  <span
                    key={source.id || idx}
                    className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 font-semibold px-2 py-0.5 rounded flex items-center gap-1"
                    title="Retrieved context chunk used as RAG reference"
                  >
                    📄 {source.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Loading Bubble */}
        {loading && (
          <div className="self-start max-w-[80%] flex items-center gap-2 text-slate-400 text-xs italic ml-1 animate-pulse">
            <span className="text-sm">🤖</span> Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Action Footer Input Form */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition disabled:bg-slate-100 disabled:cursor-not-allowed"
            placeholder="Ask a question about your saved notes..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            required
          />
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition active:scale-95 disabled:bg-purple-300 disabled:cursor-not-allowed flex items-center gap-1.5"
            disabled={loading || !input.trim()}
          >
            Ask
          </button>
        </form>
        {error && (
          <p className="text-[10px] text-rose-500 mt-1.5 ml-1">
            ⚠ {error}
          </p>
        )}
      </div>
    </div>
  );
}
