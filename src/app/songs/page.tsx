'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  created_at: string;
}

const GENRE_COLORS: Record<string, string> = {
  pop: 'bg-pink-100 text-pink-800',
  rock: 'bg-red-100 text-red-800',
  'hip-hop': 'bg-purple-100 text-purple-800',
  'r&b': 'bg-indigo-100 text-indigo-800',
  electronic: 'bg-cyan-100 text-cyan-800',
  country: 'bg-amber-100 text-amber-800',
  jazz: 'bg-yellow-100 text-yellow-800',
  classical: 'bg-emerald-100 text-emerald-800',
  indie: 'bg-teal-100 text-teal-800',
  latin: 'bg-orange-100 text-orange-800',
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    artist_name: '',
    album: '',
    release_year: '',
    genre: '',
    duration_seconds: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchSongs = useCallback(async () => {
    try {
      const res = await fetch('/api/songs');
      if (res.ok) {
        const json = await res.json();
        setSongs(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch songs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSongs();
    if (typeof window !== 'undefined' && sessionStorage.getItem('openNewSong')) {
      sessionStorage.removeItem('openNewSong');
      setModalOpen(true);
    }
  }, [fetchSongs]);

  const filtered = useMemo(() => {
    if (!search.trim()) return songs;
    const q = search.toLowerCase();
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist_name.toLowerCase().includes(q) ||
        (s.album && s.album.toLowerCase().includes(q))
    );
  }, [songs, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        title: formData.title,
        artist_name: formData.artist_name,
      };
      if (formData.album) payload.album = formData.album;
      if (formData.release_year) payload.release_year = parseInt(formData.release_year);
      if (formData.genre) payload.genre = formData.genre;
      if (formData.duration_seconds) payload.duration_seconds = parseInt(formData.duration_seconds);

      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setModalOpen(false);
        setFormData({ title: '', artist_name: '', album: '', release_year: '', genre: '', duration_seconds: '' });
        fetchSongs();
      }
    } catch (err) {
      console.error('Failed to create song:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const genreBadge = (genre: string | null) => {
    if (!genre) return null;
    const colorClass = GENRE_COLORS[genre.toLowerCase()] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}`}>
        {genre}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Song Library</h1>
            <p className="text-sm text-gray-500 mt-1">
              {filtered.length} song{filtered.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <span className="mr-1.5 text-lg leading-none">+</span> Add Song
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Search by title, artist, or album..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Card Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-gray-500">Loading songs...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-sm">No songs found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((song) => (
              <Link
                key={song.id}
                href={`/songs/${song.id}`}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all p-5 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  {song.duration_seconds && (
                    <span className="text-xs text-gray-400 font-mono">{formatDuration(song.duration_seconds)}</span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                  {song.title}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5 truncate">{song.artist_name}</p>
                <div className="flex items-center gap-2 mt-3">
                  {genreBadge(song.genre)}
                  {song.release_year && (
                    <span className="text-xs text-gray-400">{song.release_year}</span>
                  )}
                </div>
                {song.album && (
                  <p className="text-xs text-gray-400 mt-2 truncate">{song.album}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Add Song Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Add New Song</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Artist</label>
                <input type="text" required value={formData.artist_name} onChange={(e) => setFormData({ ...formData, artist_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Album</label>
                  <input type="text" value={formData.album} onChange={(e) => setFormData({ ...formData, album: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input type="number" value={formData.release_year} onChange={(e) => setFormData({ ...formData, release_year: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                  <input type="text" value={formData.genre} onChange={(e) => setFormData({ ...formData, genre: e.target.value })} placeholder="e.g. Pop, Rock, Hip-Hop" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (sec)</label>
                  <input type="number" value={formData.duration_seconds} onChange={(e) => setFormData({ ...formData, duration_seconds: e.target.value })} placeholder="e.g. 210" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">{submitting ? 'Saving...' : 'Add Song'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
