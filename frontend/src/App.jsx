import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import ChatBox from './components/ChatBox';
import NoteEditor from './components/NoteEditor';
import NotesList from './components/NotesList';
import SecretKeyModal from './components/SecretKeyModal';

const STORAGE_KEY = 'notes_ai_secret_key';
const MOBILE_STORAGE_KEY = 'notes_ai_mobile_number';

export default function App() {
  // ----- Auth state -----
  const [secretKey, setSecretKey] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [mobileNumber, setMobileNumber] = useState(() => localStorage.getItem(MOBILE_STORAGE_KEY) || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);

  // ----- Theme state -----
  const [theme, setTheme] = useState(() => localStorage.getItem('notes_ai_theme') || 'dark');

  // ----- Notes panel state -----
  const [notesOpen, setNotesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'add' | 'list'

  // ----- Notes data -----
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('notes_ai_theme', theme);
  }, [theme]);

  // -------------------------------------------------------
  // Auto-validate stored credentials on mount
  // -------------------------------------------------------
  useEffect(() => {
    const storedKey = localStorage.getItem(STORAGE_KEY);
    const storedMobile = localStorage.getItem(MOBILE_STORAGE_KEY);
    if (storedKey && storedMobile) {
      validateCredentials(storedMobile, storedKey, true).then(valid => {
        if (!valid) {
          setShowKeyModal(true);
        }
      });
    } else {
      // Force user to set/enter details if none are stored
      setShowKeyModal(true);
    }
  }, []);

  const validateCredentials = async (mobile, key, email, silent = false) => {
    let realEmail = email;
    let isSilent = silent;
    if (typeof email === 'boolean') {
      isSilent = email;
      realEmail = undefined;
    }
    try {
      await axios.post('/api/auth/validate', { mobileNumber: mobile, secretKey: key, email: realEmail });
      setSecretKey(key);
      setMobileNumber(mobile);
      localStorage.setItem(STORAGE_KEY, key);
      localStorage.setItem(MOBILE_STORAGE_KEY, mobile);
      setIsAuthenticated(true);
      setShowKeyModal(false);
      return true;
    } catch (err) {
      if (!isSilent) throw err;
      return false;
    }
  };

  // -------------------------------------------------------
  // Fetch notes (only when authenticated)
  // -------------------------------------------------------
  const fetchNotes = useCallback(async () => {
    if (!secretKey) return;
    setNotesLoading(true);
    setNotesError(null);
    try {
      const { data } = await axios.get('/api/notes', {
        headers: { 'x-secret-key': secretKey }
      });
      setNotes(data);
    } catch (err) {
      console.error('Error fetching notes:', err);
      setNotesError('Failed to load notes.');
    } finally {
      setNotesLoading(false);
    }
  }, [secretKey]);

  useEffect(() => {
    if (isAuthenticated) fetchNotes();
  }, [isAuthenticated, fetchNotes]);

  // -------------------------------------------------------
  // Notes CRUD handlers
  // -------------------------------------------------------
  const handleNoteAdded = (newNote) => {
    setNotes(prev => [newNote, ...prev]);
    setActiveTab('list');
  };

  const handleNoteUpdated = (updated) => {
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
    setSelectedNote(null);
    setActiveTab('list');
  };

  const handleNoteDeleted = (id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedNote?.id === id) setSelectedNote(null);
  };

  const handleEditNote = (note) => {
    setSelectedNote(note);
    setActiveTab('add');
  };

  // -------------------------------------------------------
  // Open notes panel: prompt for key if not authenticated
  // -------------------------------------------------------
  const handleOpenNotes = () => {
    if (!isAuthenticated) {
      setShowKeyModal(true);
    } else {
      setNotesOpen(prev => !prev);
    }
  };

  // -------------------------------------------------------
  // Logout
  // -------------------------------------------------------
  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(MOBILE_STORAGE_KEY);
    setSecretKey('');
    setMobileNumber('');
    setIsAuthenticated(false);
    setNotesOpen(false);
    setNotes([]);
    setSelectedNote(null);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="app-shell">
      {/* ============ SECRET KEY MODAL ============ */}
      {showKeyModal && (
        <SecretKeyModal
          onSuccess={(mobile, key, email) => {
            validateCredentials(mobile, key, email).then(() => {
              // Optionally do not auto-open the notes slide-out panel, just log them in
              setNotesOpen(false);
            }).catch(() => {});
          }}
          // If not authenticated, do not allow closing the modal
          onClose={isAuthenticated ? () => setShowKeyModal(false) : null}
        />
      )}

      {/* ============ HEADER ============ */}
      <header className="app-header">
        <div className="app-header-brand">
          <div className="app-header-logo">🤖</div>
          <span className="app-header-title">Notes AI</span>
        </div>

        <div className="header-actions">
          {/* Theme Toggle Button */}
          <button
            className="btn-theme-toggle"
            onClick={toggleTheme}
            id="btn-theme-toggle"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>

          {isAuthenticated && (
            <span className="user-key-tag">
              🔑 {secretKey.length > 10 ? secretKey.substring(0, 10) + '…' : secretKey}
            </span>
          )}
          <button
            className="btn-notes-toggle"
            onClick={handleOpenNotes}
            id="btn-toggle-notes"
            title={isAuthenticated ? 'Toggle Notes Panel' : 'Unlock Notes with Secret Key'}
          >
            {isAuthenticated ? (notesOpen ? '✕ Close Notes' : '📝 My Notes') : '🔒 Notes'}
          </button>
          {isAuthenticated && (
            <button className="btn-logout" onClick={handleLogout} id="btn-logout">
              Logout
            </button>
          )}
        </div>
      </header>

      {/* ============ MAIN ============ */}
      <main className="app-main">
        {/* Render chat panel and notes ONLY if authenticated */}
        {isAuthenticated ? (
          <>
            <div className="chat-panel">
              <ChatBox secretKey={secretKey} />
            </div>

            <aside className={`notes-panel ${notesOpen ? 'open' : ''}`}>
              <div className="notes-panel-inner">
                <div className="notes-panel-header">
                  <h2>
                    <span>📝</span> My Notes
                  </h2>
                  <button
                    className="btn-close-panel"
                    onClick={() => setNotesOpen(false)}
                    id="btn-close-notes-panel"
                    title="Close Notes"
                  >
                    ✕
                  </button>
                </div>

                <div className="notes-tabs">
                  <button
                    className={`notes-tab ${activeTab === 'list' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('list'); setSelectedNote(null); }}
                    id="tab-my-notes"
                  >
                    My Notes
                  </button>
                  <button
                    className={`notes-tab ${activeTab === 'add' ? 'active' : ''}`}
                    onClick={() => setActiveTab('add')}
                    id="tab-add-note"
                  >
                    {selectedNote ? '✏️ Edit Note' : '+ Add Note'}
                  </button>
                </div>

                <div className="notes-tab-content">
                  {activeTab === 'list' ? (
                    <NotesList
                      notes={notes}
                      loading={notesLoading}
                      error={notesError}
                      selectedNoteId={selectedNote?.id}
                      onEditNote={handleEditNote}
                      onNoteDeleted={handleNoteDeleted}
                      secretKey={secretKey}
                    />
                  ) : (
                    <NoteEditor
                      selectedNote={selectedNote}
                      onNoteAdded={handleNoteAdded}
                      onNoteUpdated={handleNoteUpdated}
                      onCancelEdit={() => { setSelectedNote(null); setActiveTab('list'); }}
                      secretKey={secretKey}
                    />
                  )}
                </div>
              </div>
            </aside>
          </>
        ) : (
          <div className="unauthenticated-welcome" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 20, textAlign: 'center', minHeight: '60vh', zIndex: 1 }}>
            <div style={{ fontSize: 60, marginBottom: 20, animation: 'orbFloat 4s ease-in-out infinite' }}>🔒</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>Access Gated</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 400, fontSize: 14, marginBottom: 10 }}>
              Please enter your secret key in the onboarding modal to unlock your private personal AI notes assistant and chatbot.
            </p>
            <button 
              className="btn-primary btn-glow" 
              onClick={() => setShowKeyModal(true)}
              style={{ marginTop: 20, padding: '12px 28px', fontSize: '15px', borderRadius: 'var(--r-md)', cursor: 'pointer', border: 'none', fontWeight: 600 }}
            >
              🔑 Enter Secret Key
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
