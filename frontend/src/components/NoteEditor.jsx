import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function NoteEditor({ selectedNote, onNoteAdded, onNoteUpdated, onCancelEdit }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Load note values when selectedNote changes
  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title || '');
      setContent(selectedNote.content || '');
      setError(null);
      setSuccess(false);
    } else {
      setTitle('');
      setContent('');
    }
  }, [selectedNote]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (selectedNote) {
        // Update mode
        const response = await axios.put(`/api/notes/${selectedNote.id}`, {
          title: title.trim(),
          content: content.trim()
        });

        setSuccess(true);
        onNoteUpdated(response.data);
      } else {
        // Create mode
        const response = await axios.post('/api/notes', {
          title: title.trim(),
          content: content.trim()
        });

        setSuccess(true);
        setTitle('');
        setContent('');
        onNoteAdded(response.data);
      }

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving note:', err);
      setError(err.response?.data?.error || 'Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span className="text-purple-600">✍️</span> {selectedNote ? 'Edit Note' : 'New Note'}
        </h2>
        {selectedNote && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs text-purple-600 hover:text-purple-800 font-semibold transition"
          >
            Cancel Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Title Field */}
        <div>
          <label htmlFor="title-input" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Title
          </label>
          <input
            id="title-input"
            type="text"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            placeholder="Give your note a title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={saving}
          />
        </div>

        {/* Content Field */}
        <div>
          <label htmlFor="content-input" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Content
          </label>
          <textarea
            id="content-input"
            rows={4}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            placeholder="Write your note contents here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            disabled={saving}
          />
        </div>

        {/* Status Alerts */}
        {success && (
          <div className="text-xs bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg border border-emerald-100 animate-fade-in">
            ✓ Note successfully saved and vectorized!
          </div>
        )}
        {error && (
          <div className="text-xs bg-rose-50 text-rose-700 px-3 py-2 rounded-lg border border-rose-100">
            ⚠ {error}
          </div>
        )}

        {/* Submit Action */}
        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:bg-purple-300 disabled:cursor-not-allowed"
          disabled={saving || !title.trim() || !content.trim()}
        >
          {saving ? (
            <>
              {/* Spinner */}
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {selectedNote ? 'Updating Note...' : 'Saving Note...'}
            </>
          ) : (
            selectedNote ? 'Update Note' : 'Save Note'
          )}
        </button>
      </form>
    </div>
  );
}
