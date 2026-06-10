import React, { useState } from 'react';
import axios from 'axios';

export default function NotesList({ notes, loading, error, selectedNoteId, onEditNote, onNoteDeleted, secretKey }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const headers = { 'x-secret-key': secretKey || '' };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this note? This cannot be undone.')) return;

    setDeletingId(id);
    try {
      await axios.delete(`/api/notes/${id}`, { headers });
      onNoteDeleted(id);
    } catch (err) {
      console.error('Error deleting note:', err);
      alert(err.response?.data?.error || 'Failed to delete note. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (e, note) => {
    e.stopPropagation();
    onEditNote(note);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const truncate = (text, max) =>
    text && text.length > max ? text.substring(0, max) + '…' : text;

  const filteredNotes = notes.filter(note =>
    note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header with count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="form-label" style={{ margin: 0 }}>All Notes</span>
        <span className="notes-count-badge">{notes.length}</span>
      </div>

      {/* Search */}
      <div className="notes-search">
        <span className="notes-search-icon">🔍</span>
        <input
          id="notes-search-input"
          type="text"
          className="notes-search-input"
          placeholder="Search by title or keyword…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="skeleton" style={{ height: '13px', width: '45%' }} />
              <div className="skeleton" style={{ height: '11px', width: '90%' }} />
              <div className="skeleton" style={{ height: '11px', width: '70%' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="status-alert error">{error}</div>
      ) : filteredNotes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{searchQuery ? '🔎' : '📝'}</div>
          <p>{searchQuery ? 'No notes match your search.' : 'No notes yet. Go to "Add Note" to create your first!'}</p>
        </div>
      ) : (
        <div className="notes-list">
          {filteredNotes.map(note => (
            <div
              key={note.id}
              className={`note-card ${note.id === selectedNoteId ? 'selected' : ''}`}
              onClick={() => onEditNote(note)}
            >
              <div className="note-card-title">{note.title || 'Untitled Note'}</div>
              <div className="note-card-content">{truncate(note.content, 110)}</div>
              <div className="note-card-footer">
                <span className="note-card-date">{formatDate(note.created_at)}</span>
                <div className="note-card-actions">
                  <button
                    className="btn-icon edit"
                    title="Edit note"
                    onClick={(e) => handleEdit(e, note)}
                    id={`btn-edit-note-${note.id}`}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon delete"
                    title="Delete note"
                    onClick={(e) => handleDelete(e, note.id)}
                    disabled={deletingId === note.id}
                    id={`btn-delete-note-${note.id}`}
                  >
                    {deletingId === note.id ? '…' : '🗑'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
