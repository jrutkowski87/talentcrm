'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';

interface RightsHolder {
  id: string;
  name: string;
  type: string;
  parent_company: string | null;
  pro_affiliation: string | null;
  email: string | null;
  phone: string | null;
  contact_name: string | null;
  avg_response_days: number | null;
  deals_offered: number;
  deals_closed: number;
}

const TYPES = ['All', 'Label', 'Publisher', 'Administrator', 'Songwriter', 'Other'] as const;

const TYPE_COLORS: Record<string, string> = {
  label: 'bg-red-100 text-red-800',
  publisher: 'bg-blue-100 text-blue-800',
  administrator: 'bg-purple-100 text-purple-800',
  songwriter: 'bg-amber-100 text-amber-800',
  other: 'bg-gray-100 text-gray-800',
};

type SortKey = 'name' | 'type' | 'parent_company' | 'pro_affiliation' | 'deals_offered';
type SortDir = 'asc' | 'desc';

export default function RightsHoldersPage() {
  const [holders, setHolders] = useState<RightsHolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'publisher',
    parent_company: '',
    pro_affiliation: '',
    email: '',
    phone: '',
    contact_name: '',
    contact_title: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchHolders = useCallback(async () => {
    try {
      const res = await fetch('/api/rights-holders');
      if (res.ok) {
        const json = await res.json();
        setHolders(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch rights holders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHolders();
    if (typeof window !== 'undefined' && sessionStorage.getItem('openNewRightsHolder')) {
      sessionStorage.removeItem('openNewRightsHolder');
      setModalOpen(true);
    }
  }, [fetchHolders]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...holders];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.parent_company && r.parent_company.toLowerCase().includes(q)) ||
          (r.contact_name && r.contact_name.toLowerCase().includes(q))
      );
    }
    if (typeFilter !== 'All') {
      result = result.filter((r) => r.type.toLowerCase() === typeFilter.toLowerCase());
    }
    result.sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? '';
      const bVal = (b as any)[sortKey] ?? '';
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    return result;
  }, [holders, search, typeFilter, sortKey, sortDir]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = { name: formData.name, type: formData.type };
      if (formData.parent_company) payload.parent_company = formData.parent_company;
      if (formData.pro_affiliation) payload.pro_affiliation = formData.pro_affiliation;
      if (formData.email) payload.email = formData.email;
      if (formData.phone) payload.phone = formData.phone;
      if (formData.contact_name) payload.contact_name = formData.contact_name;
      if (formData.contact_title) payload.contact_title = formData.contact_title;

      const res = await fetch('/api/rights-holders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setModalOpen(false);
        setFormData({ name: '', type: 'publisher', parent_company: '', pro_affiliation: '', email: '', phone: '', contact_name: '', contact_title: '' });
        fetchHolders();
      }
    } catch (err) {
      console.error('Failed to create rights holder:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const typeBadge = (type: string) => {
    const colorClass = TYPE_COLORS[type.toLowerCase()] || TYPE_COLORS.other;
    return (
      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}`}>
        {type}
      </span>
    );
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className="ml-1 text-gray-300">&#8597;</span>;
    return <span className="ml-1 text-gray-600">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rights Holders</h1>
            <p className="text-sm text-gray-500 mt-1">
              {filteredAndSorted.length} rights holder{filteredAndSorted.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <span className="mr-1.5 text-lg leading-none">+</span> Add Rights Holder
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by name, parent company, or contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex gap-2 flex-wrap">
            {TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                  typeFilter === type
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-gray-500">Loading rights holders...</span>
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-sm">No rights holders found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {[
                      { key: 'name' as SortKey, label: 'Name' },
                      { key: 'type' as SortKey, label: 'Type' },
                      { key: 'parent_company' as SortKey, label: 'Parent Company' },
                      { key: 'pro_affiliation' as SortKey, label: 'PRO' },
                      { key: 'deals_offered' as SortKey, label: 'Deals' },
                    ].map((col) => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                      >
                        {col.label}
                        <SortIcon column={col.key} />
                      </th>
                    ))}
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAndSorted.map((rh) => (
                    <tr key={rh.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <Link href={`/rights-holders/${rh.id}`} className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline">
                          {rh.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4">{typeBadge(rh.type)}</td>
                      <td className="px-5 py-4 text-gray-700">{rh.parent_company || '--'}</td>
                      <td className="px-5 py-4 text-gray-700">{rh.pro_affiliation || '--'}</td>
                      <td className="px-5 py-4 text-gray-700">
                        {rh.deals_offered}
                        <span className="text-gray-400 mx-0.5">/</span>
                        {rh.deals_closed}
                      </td>
                      <td className="px-5 py-4 text-gray-600">{rh.contact_name || '--'}</td>
                      <td className="px-5 py-4 text-gray-600">{rh.email || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Rights Holder Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Add Rights Holder</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
                  <option value="label">Label</option>
                  <option value="publisher">Publisher</option>
                  <option value="administrator">Administrator</option>
                  <option value="songwriter">Songwriter</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent Company</label>
                  <input type="text" value={formData.parent_company} onChange={(e) => setFormData({ ...formData, parent_company: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PRO Affiliation</label>
                  <input type="text" value={formData.pro_affiliation} onChange={(e) => setFormData({ ...formData, pro_affiliation: e.target.value })} placeholder="ASCAP, BMI, SESAC..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input type="text" value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Title</label>
                  <input type="text" value={formData.contact_title} onChange={(e) => setFormData({ ...formData, contact_title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">{submitting ? 'Saving...' : 'Add Rights Holder'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
