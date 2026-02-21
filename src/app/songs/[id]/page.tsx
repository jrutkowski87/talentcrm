'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Song {
  id: string;
  title: string;
  artist_name: string;
  album: string | null;
  release_year: number | null;
  genre: string | null;
  duration_seconds: number | null;
  isrc: string | null;
  spotify_url: string | null;
  apple_music_url: string | null;
  notes: string | null;
  rights_holders: RightsEntry[];
}

interface RightsEntry {
  id: string;
  rights_holder_id: string;
  rights_holder_name: string;
  rights_holder_type: string;
  side: string;
  share_percentage: number;
  role: string;
  controlled_by_id: string | null;
  territory: string | null;
  notes: string | null;
}

interface RightsHolder {
  id: string;
  name: string;
  type: string;
}

interface Validation {
  master: { valid: boolean; total: number };
  publishing: { valid: boolean; total: number };
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const ROLE_OPTIONS = ['label', 'publisher', 'songwriter', 'administrator', 'sub_publisher', 'other'];

export default function SongDetailPage() {
  const params = useParams();
  const router = useRouter();
  const songId = params.id as string;

  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState<Validation | null>(null);

  // Rights holder add form
  const [allRightsHolders, setAllRightsHolders] = useState<RightsHolder[]>([]);
  const [addingSide, setAddingSide] = useState<'master' | 'publishing' | null>(null);
  const [addForm, setAddForm] = useState({
    rights_holder_id: '',
    share_percentage: '',
    role: 'other',
    territory: 'Worldwide',
  });
  const [addingRH, setAddingRH] = useState(false);

  // Inline create rights holder state
  const [showInlineRH, setShowInlineRH] = useState(false);
  const [inlineRHForm, setInlineRHForm] = useState({ name: '', type: 'label', contact_name: '', contact_email: '' });
  const [inlineRHSubmitting, setInlineRHSubmitting] = useState(false);

  const fetchSong = useCallback(async () => {
    try {
      const res = await fetch(`/api/songs/${songId}`);
      if (res.ok) {
        const json = await res.json();
        setSong(json.data);
        setEditData({
          title: json.data.title || '',
          artist_name: json.data.artist_name || '',
          album: json.data.album || '',
          release_year: json.data.release_year?.toString() || '',
          genre: json.data.genre || '',
          duration_seconds: json.data.duration_seconds?.toString() || '',
          isrc: json.data.isrc || '',
          spotify_url: json.data.spotify_url || '',
          apple_music_url: json.data.apple_music_url || '',
          notes: json.data.notes || '',
        });
      }
    } catch (err) {
      console.error('Failed to fetch song:', err);
    } finally {
      setLoading(false);
    }
  }, [songId]);

  const fetchValidation = useCallback(async () => {
    try {
      const res = await fetch(`/api/songs/${songId}/rights`);
      if (res.ok) {
        const json = await res.json();
        setValidation(json.validation);
      }
    } catch {}
  }, [songId]);

  const fetchAllRightsHolders = useCallback(async () => {
    try {
      const res = await fetch('/api/rights-holders');
      if (res.ok) {
        const json = await res.json();
        setAllRightsHolders(json.data || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchSong();
    fetchValidation();
    fetchAllRightsHolders();
  }, [fetchSong, fetchValidation, fetchAllRightsHolders]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = { ...editData };
      if (payload.release_year) payload.release_year = parseInt(payload.release_year);
      else payload.release_year = null;
      if (payload.duration_seconds) payload.duration_seconds = parseInt(payload.duration_seconds);
      else payload.duration_seconds = null;
      if (!payload.album) payload.album = null;
      if (!payload.genre) payload.genre = null;
      if (!payload.isrc) payload.isrc = null;
      if (!payload.spotify_url) payload.spotify_url = null;
      if (!payload.apple_music_url) payload.apple_music_url = null;
      if (!payload.notes) payload.notes = null;

      const res = await fetch(`/api/songs/${songId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditing(false);
        fetchSong();
      }
    } catch (err) {
      console.error('Failed to update song:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this song? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/songs/${songId}`, { method: 'DELETE' });
      if (res.ok) router.push('/songs');
    } catch (err) {
      console.error('Failed to delete song:', err);
    }
  };

  const handleAddRightsHolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingSide) return;
    setAddingRH(true);
    try {
      const res = await fetch(`/api/songs/${songId}/rights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rights_holder_id: addForm.rights_holder_id,
          side: addingSide,
          share_percentage: parseFloat(addForm.share_percentage),
          role: addForm.role,
          territory: addForm.territory || null,
        }),
      });
      if (res.ok) {
        setAddingSide(null);
        setAddForm({ rights_holder_id: '', share_percentage: '', role: 'other', territory: 'Worldwide' });
        fetchSong();
        fetchValidation();
      }
    } catch (err) {
      console.error('Failed to add rights holder:', err);
    } finally {
      setAddingRH(false);
    }
  };

  const handleRemoveRightsEntry = async (entryId: string) => {
    try {
      await fetch(`/api/songs/${songId}/rights/${entryId}`, { method: 'DELETE' });
      fetchSong();
      fetchValidation();
    } catch {}
  };

  const handleInlineRHCreate = async () => {
    if (!inlineRHForm.name.trim()) return;
    setInlineRHSubmitting(true);
    try {
      const res = await fetch('/api/rights-holders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inlineRHForm),
      });
      if (!res.ok) throw new Error('Failed to create rights holder');
      const json = await res.json();
      if (json.data?.id) {
        setAllRightsHolders((prev) => [...prev, json.data]);
        setAddForm({ ...addForm, rights_holder_id: json.data.id });
        setShowInlineRH(false);
        setInlineRHForm({ name: '', type: 'label', contact_name: '', contact_email: '' });
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating rights holder');
    } finally { setInlineRHSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Song not found.</p>
      </div>
    );
  }

  const masterEntries = song.rights_holders.filter((r) => r.side === 'master');
  const publishingEntries = song.rights_holders.filter((r) => r.side === 'publishing');

  const ShareBar = ({ total, valid }: { total: number; valid: boolean }) => (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            valid ? 'bg-green-500' : total > 100 ? 'bg-red-500' : 'bg-yellow-500'
          }`}
          style={{ width: `${Math.min(total, 100)}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${valid ? 'text-green-600' : total > 100 ? 'text-red-600' : 'text-yellow-600'}`}>
        {total}%
      </span>
    </div>
  );

  const RightsTable = ({ entries, side }: { entries: RightsEntry[]; side: 'master' | 'publishing' }) => {
    const sideValidation = validation?.[side];
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 capitalize">{side} Side</h3>
            {sideValidation && <ShareBar total={sideValidation.total} valid={sideValidation.valid} />}
          </div>
          <button
            onClick={() => { setAddingSide(side); setAddForm({ rights_holder_id: '', share_percentage: '', role: side === 'master' ? 'label' : 'publisher', territory: 'Worldwide' }); }}
            className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium transition-colors"
          >
            + Add Rights Holder
          </button>
        </div>
        {entries.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No rights holders assigned.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Share %</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Territory</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <Link href={`/rights-holders/${entry.rights_holder_id}`} className="font-medium text-indigo-600 hover:underline">
                      {entry.rights_holder_name}
                    </Link>
                    <span className="ml-2 text-xs text-gray-400 capitalize">{entry.rights_holder_type}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-700 capitalize">{entry.role}</td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-gray-900">{entry.share_percentage}%</span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{entry.territory || '--'}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleRemoveRightsEntry(entry.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/songs" className="text-sm text-indigo-600 hover:text-indigo-800 mb-2 inline-block">&larr; Back to Songs</Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{song.title}</h1>
              <p className="text-gray-500 mt-0.5">{song.artist_name}</p>
            </div>
            <div className="flex gap-2">
              {!editing ? (
                <>
                  <button onClick={() => setEditing(true)} className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Edit</button>
                  <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors">Delete</button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Song Metadata */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Song Details</h2>
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Title', key: 'title', type: 'text', required: true },
                { label: 'Artist', key: 'artist_name', type: 'text', required: true },
                { label: 'Album', key: 'album', type: 'text' },
                { label: 'Release Year', key: 'release_year', type: 'number' },
                { label: 'Genre', key: 'genre', type: 'text' },
                { label: 'Duration (sec)', key: 'duration_seconds', type: 'number' },
                { label: 'ISRC', key: 'isrc', type: 'text' },
                { label: 'Spotify URL', key: 'spotify_url', type: 'url' },
                { label: 'Apple Music URL', key: 'apple_music_url', type: 'url' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    required={field.required}
                    value={editData[field.key] || ''}
                    onChange={(e) => setEditData({ ...editData, [field.key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editData.notes || ''}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Album', value: song.album },
                { label: 'Year', value: song.release_year },
                { label: 'Genre', value: song.genre },
                { label: 'Duration', value: formatDuration(song.duration_seconds) },
                { label: 'ISRC', value: song.isrc },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-gray-400 uppercase font-medium">{item.label}</p>
                  <p className="text-sm text-gray-900 mt-0.5">{item.value || '--'}</p>
                </div>
              ))}
              {song.spotify_url && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-medium">Spotify</p>
                  <a href={song.spotify_url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline truncate block mt-0.5">Link</a>
                </div>
              )}
              {song.apple_music_url && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-medium">Apple Music</p>
                  <a href={song.apple_music_url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline truncate block mt-0.5">Link</a>
                </div>
              )}
              {song.notes && (
                <div className="col-span-2 md:col-span-4">
                  <p className="text-xs text-gray-400 uppercase font-medium">Notes</p>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{song.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rights Breakdown */}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Rights Breakdown</h2>
        <div className="space-y-4 mb-6">
          <RightsTable entries={masterEntries} side="master" />
          <RightsTable entries={publishingEntries} side="publishing" />
        </div>

        {/* Add Rights Holder Modal */}
        {addingSide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => { setAddingSide(null); setShowInlineRH(false); }} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 capitalize">Add {addingSide} Rights Holder</h2>
                <button onClick={() => { setAddingSide(null); setShowInlineRH(false); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>

              {!showInlineRH ? (
                <form onSubmit={handleAddRightsHolder} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rights Holder</label>
                    <select
                      required
                      value={addForm.rights_holder_id}
                      onChange={(e) => setAddForm({ ...addForm, rights_holder_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">Select a rights holder...</option>
                      {allRightsHolders.map((rh) => (
                        <option key={rh.id} value={rh.id}>{rh.name} ({rh.type})</option>
                      ))}
                    </select>
                  </div>

                  {/* Create New Rights Holder Link */}
                  <button
                    type="button"
                    onClick={() => setShowInlineRH(true)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Create New Rights Holder
                  </button>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Share %</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="100"
                        step="0.01"
                        value={addForm.share_percentage}
                        onChange={(e) => setAddForm({ ...addForm, share_percentage: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <select
                        value={addForm.role}
                        onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1).replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Territory</label>
                    <input
                      type="text"
                      value={addForm.territory}
                      onChange={(e) => setAddForm({ ...addForm, territory: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => { setAddingSide(null); setShowInlineRH(false); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                    <button type="submit" disabled={addingRH} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{addingRH ? 'Adding...' : 'Add'}</button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Inline Create Rights Holder Form */}
                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 space-y-3 mb-4">
                    <p className="text-sm font-medium text-purple-800">Create New Rights Holder</p>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                      <input
                        type="text"
                        value={inlineRHForm.name}
                        onChange={(e) => setInlineRHForm({ ...inlineRHForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="e.g., Sony Music Publishing"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                      <select
                        value={inlineRHForm.type}
                        onChange={(e) => setInlineRHForm({ ...inlineRHForm, type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                      >
                        <option value="label">Label</option>
                        <option value="publisher">Publisher</option>
                        <option value="artist">Artist</option>
                        <option value="writer">Writer</option>
                        <option value="producer">Producer</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Contact Name</label>
                      <input
                        type="text"
                        value={inlineRHForm.contact_name}
                        onChange={(e) => setInlineRHForm({ ...inlineRHForm, contact_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={inlineRHForm.contact_email}
                        onChange={(e) => setInlineRHForm({ ...inlineRHForm, contact_email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => { setShowInlineRH(false); setInlineRHForm({ name: '', type: 'label', contact_name: '', contact_email: '' }); }} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Back</button>
                    <button
                      onClick={handleInlineRHCreate}
                      disabled={!inlineRHForm.name.trim() || inlineRHSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {inlineRHSubmitting ? 'Creating...' : 'Create & Select'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
