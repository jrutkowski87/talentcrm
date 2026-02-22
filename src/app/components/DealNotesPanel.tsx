'use client';

import { useState, useEffect, useCallback } from 'react';

interface Note {
  id: string;
  deal_id: string;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function DealNotesPanel({ dealId }: { dealId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}/notes`);
      if (res.ok) {
        const json = await res.json();
        setNotes(json.data || []);
      }
    } catch {}
    setLoading(false);
  }, [dealId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleSubmit = async () => {
    if (!newNote.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote.trim() }),
      });
      if (res.ok) {
        setNewNote('');
        await fetchNotes();
      }
    } catch {}
    setSubmitting(false);
  };

  const handleEdit = async (noteId: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch(`/api/deals/${dealId}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      if (res.ok) {
        setEditingId(null);
        await fetchNotes();
      }
    } catch {}
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;
    try {
      const res = await fetch(`/api/deals/${dealId}/notes/${noteId}`, { method: 'DELETE' });
      if (res.ok) await fetchNotes();
    } catch {}
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Add Note */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Add Note</h3>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write a note..."
          rows={3}
          className="form-textarea mb-3"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
        />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-400">Cmd+Enter to submit</p>
          <button
            onClick={handleSubmit}
            disabled={!newNote.trim() || submitting}
            className="btn-primary text-xs px-3 py-1.5"
          >
            {submitting ? 'Saving...' : 'Add Note'}
          </button>
        </div>
      </div>

      {/* Notes List */}
      {loading && (
        <div className="text-center py-8 text-sm text-gray-400">Loading notes...</div>
      )}

      {!loading && notes.length === 0 && (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No notes yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your first note above.</p>
        </div>
      )}

      {!loading && notes.map((note) => (
        <div key={note.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 group">
          {editingId === note.id ? (
            <div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="form-textarea mb-3"
                autoFocus
              />
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => setEditingId(null)} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
                <button onClick={() => handleEdit(note.id)} className="btn-primary text-xs px-3 py-1.5">Save</button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{note.content}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{relativeTime(note.created_at)}</span>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                    className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
