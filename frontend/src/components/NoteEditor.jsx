import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function NoteEditor({ selectedNote, onNoteAdded, onNoteUpdated, onCancelEdit, secretKey }) {
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

  const headers = { 'x-secret-key': secretKey || '' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (selectedNote) {
        const { data } = await axios.put(`/api/notes/${selectedNote.id}`, {
          title: title.trim(),
          content: content.trim()
        }, { headers });
        setSuccess(true);
        onNoteUpdated(data);
      } else {
        const { data } = await axios.post('/api/notes', {
          title: title.trim(),
          content: content.trim()
        }, { headers });
        setSuccess(true);
        setTitle('');
        setContent('');
        onNoteAdded(data);
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving note:', err);
      setError(err.response?.data?.error || 'Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="note-editor-form">
      <form onSubmit={handleSubmit}>
        {/* Title */}
        <div style={{ marginBottom: '12px' }}>
          <label htmlFor="note-title" className="form-label">Title</label>
          <input
            id="note-title"
            type="text"
            className="form-input"
            placeholder="Give your note a title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={saving}
          />
        </div>

        {/* Content */}
        <div style={{ marginBottom: '12px' }}>
          <label htmlFor="note-content" className="form-label">Content</label>
          <textarea
            id="note-content"
            rows={6}
            className="form-textarea"
            placeholder="Write your note contents here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            disabled={saving}
          />
        </div>

        {/* Alerts */}
        {success && (
          <div className="status-alert success" style={{ marginBottom: '12px' }}>
            ✓ Note saved and vectorized for AI search!
          </div>
        )}
        {error && (
          <div className="status-alert error" style={{ marginBottom: '12px' }}>
            ⚠ {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving || !title.trim() || !content.trim()}
            id={selectedNote ? 'btn-update-note' : 'btn-save-note'}
            style={{ flex: 1 }}
          >
            {saving ? (
              <>
                <span className="spinner" />
                {selectedNote ? 'Updating…' : 'Saving…'}
              </>
            ) : (
              selectedNote ? '✓ Update Note' : '+ Save Note'
            )}
          </button>
          {selectedNote && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancelEdit}
              id="btn-cancel-edit"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
