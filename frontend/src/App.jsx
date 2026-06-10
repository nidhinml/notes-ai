import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import ChatBox from './components/ChatBox';
import NoteEditor from './components/NoteEditor';
import NotesList from './components/NotesList';
import SecretKeyModal from './components/SecretKeyModal';

const STORAGE_KEY = 'notes_ai_secret_key';

export default function App() {
  // ----- Auth state -----
  const [secretKey, setSecretKey] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);

  // ----- Notes panel state -----
  const [notesOpen, setNotesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'add' | 'list'

  // ----- Notes data -----
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);

  // -------------------------------------------------------
  // Auto-validate stored key on mount
  // -------------------------------------------------------
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      validateKey(stored, true);
    }
  }, []);

  const validateKey = async (key, silent = false) => {
    try {
      await axios.post('/api/auth/validate', { secretKey: key });
      setSecretKey(key);
      localStorage.setItem(STORAGE_KEY, key);
      setIsAuthenticated(true);
      setShowKeyModal(false);
      return true;
    } catch (err) {
      if (!silent) throw err;
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
    setSecretKey('');
    setIsAuthenticated(false);
    setNotesOpen(false);
    setNotes([]);
    setSelectedNote(null);
  };

  return (
    <div className="app-shell">
      {/* ============ SECRET KEY MODAL ============ */}
      {showKeyModal && (
        <SecretKeyModal
          onSuccess={(key) => {
            validateKey(key).then(() => {
              setNotesOpen(true);
            }).catch(() => {});
          }}
          onClose={() => setShowKeyModal(false)}
        />
      )}

      {/* ============ HEADER ============ */}
      <header className="app-header">
        <div className="app-header-brand">
          <div className="app-header-logo">🤖</div>
          <span className="app-header-title">Notes AI</span>
        </div>

        <div className="header-actions">
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
        {/* Chat Panel — always visible */}
        <div className="chat-panel">
          <ChatBox secretKey={secretKey} />
        </div>

        {/* Notes Panel — slides in when open */}
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

            {/* Tabs */}
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

            {/* Tab Content */}
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
      </main>
    </div>
  );
}
