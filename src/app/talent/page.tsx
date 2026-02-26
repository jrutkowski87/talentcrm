'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DuplicateWarning from '../components/DuplicateWarning';

interface Talent {
  id: string;
  name: string;
  category: string;
  location: string;
  rate_range: string;
  social_handles: Record<string, string> | null;
  social_followers: Record<string, number> | null;
  rating: number | null;
  bio: string | null;
}

const CATEGORIES = [
  'All',
  'Actor',
  'Musician',
  'Athlete',
  'Influencer',
  'Model',
  'Creator',
  'Comedian',
  'Other',
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  actor: 'bg-blue-100 text-blue-800',
  musician: 'bg-purple-100 text-purple-800',
  athlete: 'bg-green-100 text-green-800',
  influencer: 'bg-pink-100 text-pink-800',
  model: 'bg-amber-100 text-amber-800',
  creator: 'bg-cyan-100 text-cyan-800',
  comedian: 'bg-orange-100 text-orange-800',
  other: 'bg-gray-100 text-gray-800',
};

function StarRating({ rating }: { rating: number | null }) {
  const filled = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= filled ? 'text-yellow-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function getTopFollowerCount(followers: Record<string, number> | null): string | null {
  if (!followers || typeof followers !== 'object') return null;
  let parsed = followers;
  if (typeof followers === 'string') { try { parsed = JSON.parse(followers); } catch { return null; } }
  const entries = Object.entries(parsed) as [string, number][];
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  const [platform, count] = entries[0];
  return `${platform}: ${formatFollowerCount(count)}`;
}

function formatFollowerCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

export default function TalentDirectoryPage() {
  const [talent, setTalent] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'actor',
    location: '',
    rate_range: '',
    bio: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Rep linking state
  interface RepOption { id: string; name: string; agency: string | null; }
  const [repOptions, setRepOptions] = useState<RepOption[]>([]);
  const [repLoading, setRepLoading] = useState(false);
  const [selectedRepId, setSelectedRepId] = useState('');
  const [repRelationship, setRepRelationship] = useState('agent');
  const [showInlineRep, setShowInlineRep] = useState(false);
  const [inlineRepForm, setInlineRepForm] = useState({
    name: '',
    email: '',
    phone: '',
    agency: '',
    role: 'agent',
  });
  const [inlineRepSubmitting, setInlineRepSubmitting] = useState(false);

  const fetchTalent = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/talent');
      const json = await res.json();
      if (json.success) {
        setTalent(json.data);
      } else {
        setError(json.error || 'Failed to load talent');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load talent');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTalent();
    // Check if dashboard sent us here to open the modal
    if (typeof window !== 'undefined' && sessionStorage.getItem('openNewTalent')) {
      sessionStorage.removeItem('openNewTalent');
      setShowModal(true);
    }
  }, [fetchTalent]);

  // Fetch reps when modal opens
  useEffect(() => {
    if (!showModal) return;
    setRepLoading(true);
    fetch('/api/reps')
      .then((res) => res.json())
      .then((json) => setRepOptions(json.data || []))
      .catch(() => setRepOptions([]))
      .finally(() => setRepLoading(false));
  }, [showModal]);

  const filtered = talent.filter((t) => {
    const matchesSearch =
      search.trim() === '' ||
      t.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === 'All' ||
      t.category === activeCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  async function handleInlineRepCreate() {
    if (!inlineRepForm.name.trim()) return;
    setInlineRepSubmitting(true);
    try {
      const res = await fetch('/api/reps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inlineRepForm.name,
          email: inlineRepForm.email || null,
          phone: inlineRepForm.phone || null,
          agency: inlineRepForm.agency || null,
          role: inlineRepForm.role || 'agent',
        }),
      });
      if (!res.ok) throw new Error('Failed to create rep');
      const json = await res.json();
      if (json.data?.id) {
        setRepOptions((prev) => [...prev, json.data]);
        setSelectedRepId(json.data.id);
        setRepRelationship(inlineRepForm.role || 'agent');
      }
      setShowInlineRep(false);
      setInlineRepForm({ name: '', email: '', phone: '', agency: '', role: 'agent' });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating rep');
    } finally {
      setInlineRepSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/talent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        const newTalentId = json.data?.id;

        // Link rep to talent if one is selected
        if (newTalentId && selectedRepId) {
          await fetch(`/api/talent/${newTalentId}/reps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rep_id: selectedRepId,
              relationship_type: repRelationship || 'agent',
              is_primary: true,
            }),
          });
        }

        setShowModal(false);
        setFormData({ name: '', category: 'actor', location: '', rate_range: '', bio: '' });
        setSelectedRepId('');
        setRepRelationship('agent');
        setShowInlineRep(false);
        fetchTalent();
      } else {
        alert(json.error || 'Failed to create talent');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create talent');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Talent Directory</h1>
              <p className="mt-1 text-sm text-gray-500">
                {filtered.length} talent{filtered.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary text-sm px-4 py-2"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Talent
            </button>
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search talent by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 form-input"
              />
            </div>
          </div>

          {/* Category filter pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  activeCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="mt-4 text-sm text-gray-500">Loading talent...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchTalent}
              className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="mt-4 text-gray-500">No talent found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((t) => {
              const topFollower = getTopFollowerCount(t.social_followers);
              const catColor = CATEGORY_COLORS[t.category] || CATEGORY_COLORS.other;

              return (
                <div
                  key={t.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 card-hover"
                >
                  <div className="flex items-start justify-between mb-3">
                    <Link
                      href={`/talent/${t.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                    >
                      {t.name}
                    </Link>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${catColor}`}>
                      {t.category}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    {t.location && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{t.location}</span>
                      </div>
                    )}

                    {t.rate_range && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{t.rate_range}</span>
                      </div>
                    )}

                    {topFollower && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="capitalize">{topFollower}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <StarRating rating={t.rating} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Talent Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => { setShowModal(false); setFormData({ name: '', category: 'actor', location: '', rate_range: '', bio: '' }); setSelectedRepId(''); setRepRelationship('agent'); setShowInlineRep(false); setInlineRepForm({ name: '', email: '', phone: '', agency: '', role: 'agent' }); }}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Add Talent</h2>
              <button
                onClick={() => { setShowModal(false); setFormData({ name: '', category: 'actor', location: '', rate_range: '', bio: '' }); setSelectedRepId(''); setRepRelationship('agent'); setShowInlineRep(false); setInlineRepForm({ name: '', email: '', phone: '', agency: '', role: 'agent' }); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  placeholder="Enter talent name"
                />
                <DuplicateWarning entityType="talent" name={formData.name} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="form-input"
                >
                  <option value="actor">Actor</option>
                  <option value="musician">Musician</option>
                  <option value="athlete">Athlete</option>
                  <option value="influencer">Influencer</option>
                  <option value="model">Model</option>
                  <option value="creator">Creator</option>
                  <option value="comedian">Comedian</option>
                  <option value="chef">Chef</option>
                  <option value="photographer">Photographer</option>
                  <option value="artist">Artist</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="form-input"
                  placeholder="e.g. Los Angeles, CA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate Range</label>
                <input
                  type="text"
                  value={formData.rate_range}
                  onChange={(e) => setFormData({ ...formData, rate_range: e.target.value })}
                  className="form-input"
                  placeholder="e.g. $25K-$35K"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="form-textarea"
                  placeholder="Brief bio or notes about the talent"
                />
              </div>

              {/* Representative linking */}
              <div className="border-t border-gray-200 pt-4 mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Representative
                  <span className="ml-1 text-xs text-gray-400 font-normal">(optional)</span>
                </label>

                {repLoading ? (
                  <p className="text-sm text-gray-400">Loading reps...</p>
                ) : !showInlineRep ? (
                  <div className="space-y-3">
                    <select
                      value={selectedRepId}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          setShowInlineRep(true);
                        } else {
                          setSelectedRepId(e.target.value);
                        }
                      }}
                      className="form-select"
                    >
                      <option value="">No rep selected</option>
                      {repOptions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}{r.agency ? ` — ${r.agency}` : ''}
                        </option>
                      ))}
                      <option value="__new__">+ Add New Rep</option>
                    </select>
                    {selectedRepId && (
                      <select
                        value={repRelationship}
                        onChange={(e) => setRepRelationship(e.target.value)}
                        className="form-select"
                      >
                        <option value="agent">Agent</option>
                        <option value="manager">Manager</option>
                        <option value="lawyer">Lawyer</option>
                        <option value="publicist">Publicist</option>
                        <option value="business_manager">Business Manager</option>
                      </select>
                    )}
                  </div>
                ) : (
                  <div className="border border-indigo-200 bg-indigo-50/50 rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-indigo-700">New Representative</span>
                      <button
                        type="button"
                        onClick={() => setShowInlineRep(false)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                    <input
                      type="text"
                      value={inlineRepForm.name}
                      onChange={(e) => setInlineRepForm((p) => ({ ...p, name: e.target.value }))}
                      className="form-input"
                      placeholder="Rep name"
                      autoFocus
                    />
                    <input
                      type="email"
                      value={inlineRepForm.email}
                      onChange={(e) => setInlineRepForm((p) => ({ ...p, email: e.target.value }))}
                      className="form-input"
                      placeholder="Email"
                    />
                    <input
                      type="text"
                      value={inlineRepForm.phone}
                      onChange={(e) => setInlineRepForm((p) => ({ ...p, phone: e.target.value }))}
                      className="form-input"
                      placeholder="Phone"
                    />
                    <input
                      type="text"
                      value={inlineRepForm.agency}
                      onChange={(e) => setInlineRepForm((p) => ({ ...p, agency: e.target.value }))}
                      className="form-input"
                      placeholder="Agency (e.g. WME, CAA, UTA)"
                    />
                    <select
                      value={inlineRepForm.role}
                      onChange={(e) => setInlineRepForm((p) => ({ ...p, role: e.target.value }))}
                      className="form-input"
                    >
                      <option value="agent">Agent</option>
                      <option value="manager">Manager</option>
                      <option value="lawyer">Lawyer</option>
                      <option value="publicist">Publicist</option>
                      <option value="business_manager">Business Manager</option>
                    </select>
                    <button
                      type="button"
                      disabled={!inlineRepForm.name.trim() || inlineRepSubmitting}
                      onClick={handleInlineRepCreate}
                      className="w-full px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {inlineRepSubmitting ? 'Creating...' : 'Create Rep & Select'}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormData({ name: '', category: 'actor', location: '', rate_range: '', bio: '' }); setSelectedRepId(''); setRepRelationship('agent'); setShowInlineRep(false); setInlineRepForm({ name: '', email: '', phone: '', agency: '', role: 'agent' }); }}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Adding...' : 'Add Talent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
