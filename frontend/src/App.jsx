import React, { useState, useEffect } from 'react';
import axios from 'axios';
import NoteEditor from './components/NoteEditor';
import NotesList from './components/NotesList';
import ChatBox from './components/ChatBox';

export default function App() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all notes from API on mount
  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/notes');
      setNotes(response.data);
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError('Failed to fetch notes. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleNoteAdded = (newNote) => {
    // Insert new note at the beginning (since sorted by created_at DESC)
    setNotes((prevNotes) => [newNote, ...prevNotes]);
  };

  const handleNoteDeleted = (deletedNoteId) => {
    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== deletedNoteId));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center shadow-sm z-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label="notes">📝</span>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Notes AI Assistant
          </h1>
        </div>
      </header>

      {/* Main Layout Area */}
      <main className="flex-1 flex flex-col md:flex-row max-h-[calc(100vh-73px)] overflow-hidden">
        {/* Left Column (40% width on Desktop, full width on Mobile) */}
        <section className="w-full md:w-[40%] border-r border-slate-200 bg-white flex flex-col overflow-y-auto p-6 gap-6">
          <NoteEditor onNoteAdded={handleNoteAdded} />
          
          <NotesList 
            notes={notes} 
            loading={loading} 
            error={error} 
            onNoteDeleted={handleNoteDeleted} 
          />
        </section>

        {/* Right Column (60% width on Desktop, full width on Mobile) */}
        <section className="w-full md:w-[60%] bg-slate-50 flex flex-col h-full overflow-hidden">
          <ChatBox />
        </section>
      </main>
    </div>
  );
}
