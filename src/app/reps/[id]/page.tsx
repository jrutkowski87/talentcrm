'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Rep {
  id: number;
  name: string;
  email: string;
  phone: string;
  agency: string;
  role: string;
  avg_response_days: number;
  deals_offered: number;
  deals_closed: number;
  talent_count: number;
  notes: string;
}

interface Talent {
  id: number;
  name: string;
  category: string;
  rate_range: string;
  rep_id?: number;
}

const ROLE_COLORS: Record<string, string> = {
  agent: 'bg-blue-100 text-blue-800',
  manager: 'bg-purple-100 text-purple-800',
  publicist: 'bg-amber-100 text-amber-800',
  lawyer: 'bg-emerald-100 text-emerald-800',
  other: 'bg-gray-100 text-gray-800',
};

export default function RepDetailPage() {
  const params = useParams();
  const router = useRouter();
  const repId = params.id as string;

  const [rep, setRep] = useState<Rep | null>(null);
  const [talent, setTalent] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    email: '',
    phone: '',
    agency: '',
    role: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchRep = useCallback(async () => {
    try {
      const res = await fetch(`/api/reps/${repId}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setRep(data);
        setEditData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          agency: data.agency || '',
          role: data.role || '',
          notes: data.notes || '',
        });
        setNotesValue(data.notes || '');
      }
    } catch (err) {
      console.error('Failed to fetch rep:', err);
    }
  }, [repId]);

  const fetchTalent = useCallback(async () => {
    try {
      const res = await fetch('/api/talent');
      if (res.ok) {
        const json = await res.json();
        const allTalent: Talent[] = json.data || [];
        setTalent(allTalent.filter((t) => t.rep_id === Number(repId)));
      }
    } catch (err) {
      console.error('Failed to fetch talent:', err);
    }
  }, [repId]);

  useEffect(() => {
    Promise.all([fetchRep(), fetchTalent()]).finally(() => setLoading(false));
  }, [fetchRep, fetchTalent]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/reps/${repId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        await fetchRep();
        setEditing(false);
      }
    } catch (err) {
      console.error('Failed to update rep:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/reps/${repId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesValue }),
      });
      if (res.ok) {
        await fetchRep();
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const cancelEdit = () => {
    if (rep) {
      setEditData({
        name: rep.name,
        email: rep.email,
        phone: rep.phone,
        agency: rep.agency,
        role: rep.role,
        notes: rep.notes || '',
      });
    }
    setEditing(false);
  };

  const closeRate =
    rep && rep.deals_offered > 0
      ? Math.round((rep.deals_closed / rep.deals_offered) * 100)
      : 0;

  const roleBadge = (role: string) => {
    const colorClass = ROLE_COLORS[role.toLowerCase()] || ROLE_COLORS.other;
    return (
      <span
        className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${colorClass}`}
      >
        {role}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading rep details...</span>
        </div>
      </div>
    );
  }

  if (!rep) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Rep not found.</p>
          <Link
            href="/reps"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Back to directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.push('/reps')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Reps
        </button>

        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) =>
                        setEditData({ ...editData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editData.email}
                        onChange={(e) =>
                          setEditData({ ...editData, email: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={editData.phone}
                        onChange={(e) =>
                          setEditData({ ...editData, phone: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Agency
                      </label>
                      <input
                        type="text"
                        value={editData.agency}
                        onChange={(e) =>
                          setEditData({ ...editData, agency: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Role
                      </label>
                      <select
                        value={editData.role}
                        onChange={(e) =>
                          setEditData({ ...editData, role: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      >
                        <option value="agent">Agent</option>
                        <option value="manager">Manager</option>
                        <option value="publicist">Publicist</option>
                        <option value="lawyer">Lawyer</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {rep.name}
                    </h1>
                    {roleBadge(rep.role)}
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{rep.agency}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <a
                      href={`mailto:${rep.email}`}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {rep.email}
                    </a>
                    <a
                      href={`tel:${rep.phone}`}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {rep.phone}
                    </a>
                  </div>
                </>
              )}
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Avg Response
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {rep.avg_response_days}
              <span className="text-sm font-normal text-gray-400 ml-1">days</span>
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Deals Offered
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {rep.deals_offered}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Deals Closed
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {rep.deals_closed}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Close Rate
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {closeRate}
              <span className="text-sm font-normal text-gray-400 ml-0.5">%</span>
            </p>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes || notesValue === (rep.notes || '')}
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40"
            >
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
          <textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            rows={5}
            placeholder="Add notes about this rep..."
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
          />
        </div>

        {/* Talent Roster */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Talent Roster
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({talent.length})
              </span>
            </h2>
          </div>
          {talent.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">
              No talent associated with this rep.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {talent.map((t) => (
                <div
                  key={t.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <h3 className="font-medium text-gray-900 mb-1">{t.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{t.category}</p>
                  <p className="text-sm font-medium text-indigo-600">
                    {t.rate_range}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
