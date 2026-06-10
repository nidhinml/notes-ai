import React from 'react';
import axios from 'axios';

export default function NotesList({ notes, loading, error, selectedNoteId, onSelectNote, onNoteDeleted }) {
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      await axios.delete(`/api/notes/${id}`);
      onNoteDeleted(id);
    } catch (err) {
      console.error('Error deleting note:', err);
      alert(err.response?.data?.error || 'Failed to delete note. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Title with count badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-md font-bold text-slate-700 uppercase tracking-wider">
          My Notes
        </h2>
        <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
          {notes.length}
        </span>
      </div>

      {/* Main List */}
      <div className="max-h-[400px] overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col divide-y divide-slate-100">
        {loading ? (
          /* Loading Skeletons */
          <div className="p-4 flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex flex-col gap-2">
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                <div className="h-3 bg-slate-100 rounded w-full"></div>
                <div className="h-3 bg-slate-100 rounded w-5/6"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-rose-500">
            ⚠ {error}
          </div>
        ) : notes.length === 0 ? (
          /* Empty State */
          <div className="p-8 text-center text-slate-400 text-sm">
            No notes yet. Add your first note above!
          </div>
        ) : (
          /* Note Cards */
          notes.map((note) => (
            <div
              key={note.id}
              onClick={() => onSelectNote(note)}
              className={`p-4 cursor-pointer transition flex justify-between items-start gap-4 group ${
                note.id === selectedNoteId 
                  ? 'bg-purple-50/70 border-l-4 border-l-purple-600' 
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-800 truncate mb-1">
                  {note.title || 'Untitled Note'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-2 break-words">
                  {truncateText(note.content, 120)}
                </p>
                <span className="text-[10px] text-slate-400 font-medium">
                  {formatDate(note.created_at)}
                </span>
              </div>

              {/* Unicode Cross Delete Button */}
              <button
                onClick={(e) => handleDelete(e, note.id)}
                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-lg font-bold w-6 h-6 flex items-center justify-center rounded transition md:opacity-0 group-hover:opacity-100"
                title="Delete note"
              >
                &times;
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
