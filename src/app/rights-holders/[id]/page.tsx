'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface RightsHolder {
  id: string;
  name: string;
  type: string;
  parent_company: string | null;
  pro_affiliation: string | null;
  ipi_number: string | null;
  email: string | null;
  phone: string | null;
  contact_name: string | null;
  contact_title: string | null;
  address: string | null;
  notes: string | null;
  avg_response_days: number | null;
  deals_offered: number;
  deals_closed: number;
  songs: {
    id: string;
    song_id: string;
    song_title: string;
    artist_name: string;
    side: string;
    share_percentage: number;
    role: string;
  }[];
}

const TYPE_COLORS: Record<string, string> = {
  label: 'bg-red-100 text-red-800',
  publisher: 'bg-blue-100 text-blue-800',
  administrator: 'bg-purple-100 text-purple-800',
  songwriter: 'bg-amber-100 text-amber-800',
  other: 'bg-gray-100 text-gray-800',
};

const SIDE_COLORS: Record<string, string> = {
  master: 'bg-red-50 text-red-700',
  publishing: 'bg-blue-50 text-blue-700',
};

export default function RightsHolderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const holderId = params.id as string;

  const [holder, setHolder] = useState<RightsHolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const fetchHolder = useCallback(async () => {
    try {
      const res = await fetch(`/api/rights-holders/${holderId}`);
      if (res.ok) {
        const json = await res.json();
        setHolder(json.data);
        setEditData({
          name: json.data.name || '',
          type: json.data.type || 'publisher',
          parent_company: json.data.parent_company || '',
          pro_affiliation: json.data.pro_affiliation || '',
          ipi_number: json.data.ipi_number || '',
          email: json.data.email || '',
          phone: json.data.phone || '',
          contact_name: json.data.contact_name || '',
          contact_title: json.data.contact_title || '',
          address: json.data.address || '',
          notes: json.data.notes || '',
        });
      }
    } catch (err) {
      console.error('Failed to fetch rights holder:', err);
    } finally {
      setLoading(false);
    }
  }, [holderId]);

  useEffect(() => { fetchHolder(); }, [fetchHolder]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = { ...editData };
      for (const key of ['parent_company', 'pro_affiliation', 'ipi_number', 'email', 'phone', 'contact_name', 'contact_title', 'address', 'notes']) {
        if (!payload[key]) payload[key] = null;
      }
      const res = await fetch(`/api/rights-holders/${holderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditing(false);
        fetchHolder();
      }
    } catch (err) {
      console.error('Failed to update:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this rights holder?')) return;
    try {
      const res = await fetch(`/api/rights-holders/${holderId}`, { method: 'DELETE' });
      if (res.ok) router.push('/rights-holders');
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!holder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Rights holder not found.</p>
      </div>
    );
  }

  const typeBadge = (type: string) => {
    const colorClass = TYPE_COLORS[type.toLowerCase()] || TYPE_COLORS.other;
    return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}`}>{type}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/rights-holders" className="text-sm text-indigo-600 hover:text-indigo-800 mb-2 inline-block">&larr; Back to Rights Holders</Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{holder.name}</h1>
                {typeBadge(holder.type)}
              </div>
              {holder.parent_company && <p className="text-gray-500 mt-0.5">{holder.parent_company}</p>}
            </div>
            <div className="flex gap-2">
              {!editing ? (
                <>
                  <button onClick={() => setEditing(true)} className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Edit</button>
                  <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50">Delete</button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Contact Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Contact Information</h2>
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Name', key: 'name', required: true },
                { label: 'Parent Company', key: 'parent_company' },
                { label: 'PRO Affiliation', key: 'pro_affiliation' },
                { label: 'IPI Number', key: 'ipi_number' },
                { label: 'Contact Name', key: 'contact_name' },
                { label: 'Contact Title', key: 'contact_title' },
                { label: 'Email', key: 'email' },
                { label: 'Phone', key: 'phone' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <input
                    type="text"
                    required={field.required}
                    value={editData[field.key] || ''}
                    onChange={(e) => setEditData({ ...editData, [field.key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={editData.type} onChange={(e) => setEditData({ ...editData, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="label">Label</option>
                  <option value="publisher">Publisher</option>
                  <option value="administrator">Administrator</option>
                  <option value="songwriter">Songwriter</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea value={editData.address || ''} onChange={(e) => setEditData({ ...editData, address: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={editData.notes || ''} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Contact', value: holder.contact_name },
                { label: 'Title', value: holder.contact_title },
                { label: 'Email', value: holder.email },
                { label: 'Phone', value: holder.phone },
                { label: 'PRO', value: holder.pro_affiliation },
                { label: 'IPI', value: holder.ipi_number },
                { label: 'Avg Response', value: holder.avg_response_days ? `${holder.avg_response_days}d` : null },
                { label: 'Deals', value: `${holder.deals_offered} / ${holder.deals_closed}` },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-gray-400 uppercase font-medium">{item.label}</p>
                  <p className="text-sm text-gray-900 mt-0.5">{item.value || '--'}</p>
                </div>
              ))}
              {holder.address && (
                <div className="col-span-2 md:col-span-4">
                  <p className="text-xs text-gray-400 uppercase font-medium">Address</p>
                  <p className="text-sm text-gray-700 mt-0.5">{holder.address}</p>
                </div>
              )}
              {holder.notes && (
                <div className="col-span-2 md:col-span-4">
                  <p className="text-xs text-gray-400 uppercase font-medium">Notes</p>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{holder.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Songs List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Songs ({holder.songs.length})</h2>
          </div>
          {holder.songs.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No songs linked to this rights holder.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Song</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Artist</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Side</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {holder.songs.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <Link href={`/songs/${s.song_id}`} className="font-medium text-indigo-600 hover:underline">{s.song_title}</Link>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{s.artist_name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${SIDE_COLORS[s.side] || 'bg-gray-50 text-gray-700'}`}>{s.side}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-700 capitalize">{s.role}</td>
                    <td className="px-5 py-3 font-mono text-gray-900">{s.share_percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
