'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Rep {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  agency: string | null;
  role: string;
  is_primary: number | boolean;
  relationship_type?: string;
}

interface Talent {
  id: string;
  name: string;
  category: string;
  location: string;
  rate_range: string;
  bio: string | null;
  notes: string | null;
  social_handles: Record<string, string> | null;
  social_followers: Record<string, number> | null;
  rating: number | null;
  reps: Rep[];
  created_at: string;
  updated_at: string;
}

interface Deal {
  id: string;
  deal_name: string;
  campaign_name: string | null;
  status: string;
  client_id: string;
  talent_id: string | null;
  fee_total: number | null;
  fee_currency: string;
  created_at: string;
}

interface RepOption {
  id: string;
  name: string;
  agency: string | null;
  role: string;
}

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

const STATUS_COLORS: Record<string, string> = {
  creative_brief: 'bg-gray-100 text-gray-700',
  outreach: 'bg-blue-100 text-blue-700',
  shortlist: 'bg-indigo-100 text-indigo-700',
  approval_to_offer: 'bg-violet-100 text-violet-700',
  negotiation: 'bg-yellow-100 text-yellow-700',
  talent_buyin: 'bg-amber-100 text-amber-700',
  contract_drafting: 'bg-orange-100 text-orange-700',
  admin_logistics: 'bg-teal-100 text-teal-700',
  fulfillment: 'bg-emerald-100 text-emerald-700',
  complete: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
  dead: 'bg-red-100 text-red-700',
};

const PLATFORM_ICONS: Record<string, string> = {
  instagram: 'IG',
  tiktok: 'TT',
  x: 'X',
  youtube: 'YT',
  twitter: 'X',
  facebook: 'FB',
  snapchat: 'SC',
  linkedin: 'LI',
};

function StarRating({ rating }: { rating: number | null }) {
  const filled = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-5 h-5 ${star <= filled ? 'text-yellow-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function formatFollowerCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export default function TalentDetailPage() {
  const params = useParams();
  const talentId = params.id as string;

  const [talent, setTalent] = useState<Talent | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    category: '',
    location: '',
    rate_range: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);

  // Link Rep state
  const [showLinkRep, setShowLinkRep] = useState(false);
  const [repOptions, setRepOptions] = useState<RepOption[]>([]);
  const [linkRepData, setLinkRepData] = useState({
    rep_id: '',
    relationship_type: 'agent',
    is_primary: false,
  });
  const [linkingRep, setLinkingRep] = useState(false);

  // Inline new rep in Link Rep modal
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
      const res = await fetch(`/api/talent/${talentId}`);
      const json = await res.json();
      if (json.success) {
        const data = json.data;
        // Parse JSON strings if needed
        if (typeof data.social_handles === 'string') {
          try { data.social_handles = JSON.parse(data.social_handles); } catch { data.social_handles = null; }
        }
        if (typeof data.social_followers === 'string') {
          try { data.social_followers = JSON.parse(data.social_followers); } catch { data.social_followers = null; }
        }
        setTalent(data);
        setEditData({
          name: data.name || '',
          category: data.category || 'other',
          location: data.location || '',
          rate_range: data.rate_range || '',
          bio: data.bio || '',
        });
      } else {
        setError(json.error || 'Talent not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load talent');
    }
  }, [talentId]);

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch('/api/deals');
      const json = await res.json();
      if (json.success) {
        const matched = (json.data || []).filter(
          (d: Deal) => d.talent_id === talentId
        );
        setDeals(matched);
      }
    } catch {
      // Non-critical: deals section just shows empty
    }
  }, [talentId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchTalent(), fetchDeals()]);
      setLoading(false);
    }
    load();
  }, [fetchTalent, fetchDeals]);

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/talent/${talentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      const json = await res.json();
      if (json.success) {
        setEditing(false);
        fetchTalent();
      } else {
        alert(json.error || 'Failed to update talent');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update talent');
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenLinkRep() {
    setShowLinkRep(true);
    try {
      const res = await fetch('/api/reps');
      const json = await res.json();
      if (json.success) {
        setRepOptions(json.data || []);
        if (json.data && json.data.length > 0) {
          setLinkRepData((prev) => ({ ...prev, rep_id: json.data[0].id }));
        }
      }
    } catch {
      // fail silently
    }
  }

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
        setLinkRepData((prev) => ({ ...prev, rep_id: json.data.id, relationship_type: inlineRepForm.role || 'agent' }));
      }
      setShowInlineRep(false);
      setInlineRepForm({ name: '', email: '', phone: '', agency: '', role: 'agent' });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating rep');
    } finally {
      setInlineRepSubmitting(false);
    }
  }

  async function handleLinkRep(e: React.FormEvent) {
    e.preventDefault();
    if (!linkRepData.rep_id) return;
    setLinkingRep(true);
    try {
      const res = await fetch(`/api/talent/${talentId}/reps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkRepData),
      });
      const json = await res.json();
      if (json.success) {
        setShowLinkRep(false);
        setShowInlineRep(false);
        setLinkRepData({ rep_id: '', relationship_type: 'agent', is_primary: false });
        fetchTalent();
      } else {
        alert(json.error || 'Failed to link rep');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to link rep');
    } finally {
      setLinkingRep(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="mt-4 text-sm text-gray-500">Loading talent profile...</p>
        </div>
      </div>
    );
  }

  if (error || !talent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error || 'Talent not found'}</p>
          <Link href="/talent" className="mt-4 inline-block text-indigo-600 hover:text-indigo-800 font-medium text-sm">
            Back to Talent Directory
          </Link>
        </div>
      </div>
    );
  }

  const socialHandles = talent.social_handles && typeof talent.social_handles === 'object' ? talent.social_handles : {};
  const socialFollowers = talent.social_followers && typeof talent.social_followers === 'object' ? talent.social_followers : {};
  const socialEntries = Object.keys({ ...socialHandles, ...socialFollowers });
  const catColor = CATEGORY_COLORS[talent.category] || CATEGORY_COLORS.other;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link
            href="/talent"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Directory
          </Link>
          <button
            onClick={() => setEditing(!editing)}
            className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              editing
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {editing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {editing ? (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={editData.category}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="actor">Actor</option>
                    <option value="musician">Musician</option>
                    <option value="athlete">Athlete</option>
                    <option value="influencer">Influencer</option>
                    <option value="model">Model</option>
                    <option value="creator">Creator</option>
                    <option value="comedian">Comedian</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={editData.location}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate Range</label>
                  <input
                    type="text"
                    value={editData.rate_range}
                    onChange={(e) => setEditData({ ...editData, rate_range: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  value={editData.bio}
                  onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">{talent.name}</h1>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${catColor}`}>
                      {talent.category}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    {talent.location && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {talent.location}
                      </span>
                    )}
                    {talent.rate_range && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {talent.rate_range}
                      </span>
                    )}
                  </div>
                </div>
                <StarRating rating={talent.rating} />
              </div>
              {talent.bio && (
                <p className="mt-4 text-sm text-gray-600 leading-relaxed">{talent.bio}</p>
              )}
            </div>
          )}
        </div>

        {/* Social Handles */}
        {socialEntries.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Social Media</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {socialEntries.map((platform) => {
                const handle = socialHandles[platform] || null;
                const followers = socialFollowers[platform] || null;
                const icon = PLATFORM_ICONS[platform.toLowerCase()] || platform.slice(0, 2).toUpperCase();

                return (
                  <div
                    key={platform}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 capitalize">{platform}</p>
                      {handle && (
                        <p className="text-xs text-gray-500 truncate">@{handle.replace(/^@/, '')}</p>
                      )}
                      {followers !== null && (
                        <p className="text-xs text-gray-500">{formatFollowerCount(followers)} followers</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reps Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Representatives</h2>
            <button
              onClick={handleOpenLinkRep}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Link Rep
            </button>
          </div>

          {talent.reps && talent.reps.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Agency</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {talent.reps.map((rep) => (
                    <tr key={rep.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-gray-900">{rep.name}</td>
                      <td className="py-2.5 px-3 text-gray-600">{rep.agency || '-'}</td>
                      <td className="py-2.5 px-3">
                        <span className="capitalize text-gray-600">{rep.relationship_type || rep.role}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        {rep.email ? (
                          <a href={`mailto:${rep.email}`} className="text-indigo-600 hover:text-indigo-800">
                            {rep.email}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">{rep.phone || '-'}</td>
                      <td className="py-2.5 px-3">
                        {(rep.is_primary === 1 || rep.is_primary === true) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Primary
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4 text-center">No representatives linked yet.</p>
          )}
        </div>

        {/* Deal History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Deal History</h2>

          {deals.length > 0 ? (
            <div className="space-y-3">
              {deals.map((deal) => {
                const statusColor = STATUS_COLORS[deal.status] || STATUS_COLORS.creative_brief;
                return (
                  <div
                    key={deal.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{deal.deal_name}</p>
                      {deal.campaign_name && (
                        <p className="text-xs text-gray-500 mt-0.5">{deal.campaign_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {deal.fee_total !== null && (
                        <span className="text-sm font-medium text-gray-700">
                          {formatCurrency(deal.fee_total, deal.fee_currency)}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                        {formatStatus(deal.status)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4 text-center">No deals associated with this talent yet.</p>
          )}
        </div>
      </div>

      {/* Link Rep Modal */}
      {showLinkRep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowLinkRep(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Link Representative</h2>
              <button
                onClick={() => setShowLinkRep(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleLinkRep} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Representative <span className="text-red-500">*</span>
                </label>

                {!showInlineRep ? (
                  <select
                    value={linkRepData.rep_id}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setShowInlineRep(true);
                      } else {
                        setLinkRepData({ ...linkRepData, rep_id: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select a rep...</option>
                    {repOptions.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.name}{rep.agency ? ` (${rep.agency})` : ''} — {rep.role}
                      </option>
                    ))}
                    <option value="__new__">+ Add New Rep</option>
                  </select>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      placeholder="Rep name"
                      autoFocus
                    />
                    <input
                      type="email"
                      value={inlineRepForm.email}
                      onChange={(e) => setInlineRepForm((p) => ({ ...p, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      placeholder="Email"
                    />
                    <input
                      type="text"
                      value={inlineRepForm.phone}
                      onChange={(e) => setInlineRepForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      placeholder="Phone"
                    />
                    <input
                      type="text"
                      value={inlineRepForm.agency}
                      onChange={(e) => setInlineRepForm((p) => ({ ...p, agency: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      placeholder="Agency (e.g. WME, CAA, UTA)"
                    />
                    <select
                      value={inlineRepForm.role}
                      onChange={(e) => setInlineRepForm((p) => ({ ...p, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
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

              {linkRepData.rep_id && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Relationship Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={linkRepData.relationship_type}
                      onChange={(e) => setLinkRepData({ ...linkRepData, relationship_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      <option value="agent">Agent</option>
                      <option value="manager">Manager</option>
                      <option value="publicist">Publicist</option>
                      <option value="lawyer">Lawyer</option>
                      <option value="business_manager">Business Manager</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkRepData.is_primary}
                      onChange={(e) => setLinkRepData({ ...linkRepData, is_primary: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Set as primary representative
                  </label>
                </>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowLinkRep(false); setShowInlineRep(false); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linkingRep || !linkRepData.rep_id}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {linkingRep ? 'Linking...' : 'Link Rep'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
