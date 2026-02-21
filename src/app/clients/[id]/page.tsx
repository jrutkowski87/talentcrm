'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

/* ------------------------------------------------------------------ */
/*  Type definitions                                                   */
/* ------------------------------------------------------------------ */

interface CastingFramework {
  lens_name: string;
  pillars: string[];
  demographics: Record<string, string>;
  tier_system: string[];
  north_star_references: string[];
}

interface SubBrand {
  id: string;
  name: string;
  positioning_statement: string;
  brand_idea: string;
  casting_framework: CastingFramework | null;
}

interface KeyContact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
}

interface Client {
  id: string;
  name: string;
  dba_name: string | null;
  legal_entity: string | null;
  agency: string;
  confidentiality_level: 'standard' | 'proprietary_confidential';
  key_contacts: KeyContact[];
  sub_brands: SubBrand[];
}

interface Deal {
  id: string;
  name: string;
  client_id: string;
  status: string;
  value: number;
}

interface SubBrandFormData {
  name: string;
  positioning_statement: string;
  brand_idea: string;
}

interface ClientFormData {
  name: string;
  dba_name: string;
  legal_entity: string;
  agency: string;
  confidentiality_level: 'standard' | 'proprietary_confidential';
}

interface CastingFrameworkFormData {
  lens_name: string;
  pillars: string;
  demographics: string;
  tier_system: string;
  north_star_references: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const [showSubBrandModal, setShowSubBrandModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFrameworkModal, setShowFrameworkModal] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [subBrandForm, setSubBrandForm] = useState<SubBrandFormData>({
    name: '',
    positioning_statement: '',
    brand_idea: '',
  });
  const [editForm, setEditForm] = useState<ClientFormData>({
    name: '',
    dba_name: '',
    legal_entity: '',
    agency: '',
    confidentiality_level: 'standard',
  });
  const [frameworkForm, setFrameworkForm] = useState<CastingFrameworkFormData>({
    lens_name: '',
    pillars: '',
    demographics: '',
    tier_system: '',
    north_star_references: '',
  });

  /* ---- data fetching ---- */

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) throw new Error('Failed to fetch client');
      const json = await res.json();
      const data = json.data || json;
      setClient(data);
      setEditForm({
        name: data.name,
        dba_name: data.dba_name ?? '',
        legal_entity: data.legal_entity ?? '',
        agency: data.agency,
        confidentiality_level: data.confidentiality_level,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, [clientId]);

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch('/api/deals');
      if (!res.ok) return;
      const json = await res.json();
      const all: Deal[] = json.data || [];
      setDeals(all.filter((d) => d.client_id === clientId));
    } catch {
      // deals are supplementary; swallow errors
    }
  }, [clientId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchClient(), fetchDeals()]);
      setLoading(false);
    }
    load();
  }, [fetchClient, fetchDeals]);

  /* ---- actions ---- */

  const toggleBrand = (id: string) => {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Failed to update client');
      setShowEditModal(false);
      await fetchClient();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/sub-brands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subBrandForm),
      });
      if (!res.ok) throw new Error('Failed to create sub-brand');
      setShowSubBrandModal(false);
      setSubBrandForm({ name: '', positioning_statement: '', brand_idea: '' });
      await fetchClient();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFrameworkSubmit = async (e: React.FormEvent, subBrandId: string) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        lens_name: frameworkForm.lens_name,
        pillars: frameworkForm.pillars.split(',').map((s) => s.trim()).filter(Boolean),
        demographics: frameworkForm.demographics
          ? Object.fromEntries(
              frameworkForm.demographics.split(',').map((pair) => {
                const [k, ...v] = pair.split(':');
                return [k.trim(), v.join(':').trim()];
              })
            )
          : {},
        tier_system: frameworkForm.tier_system.split(',').map((s) => s.trim()).filter(Boolean),
        north_star_references: frameworkForm.north_star_references
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const res = await fetch(
        `/api/clients/${clientId}/sub-brands/${subBrandId}/casting-framework`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error('Failed to create casting framework');
      setShowFrameworkModal(null);
      setFrameworkForm({
        lens_name: '',
        pillars: '',
        demographics: '',
        tier_system: '',
        north_star_references: '',
      });
      await fetchClient();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- rendering helpers ---- */

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error ?? 'Client not found'}</p>
          <Link href="/clients" className="text-indigo-600 hover:underline text-sm">
            Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Clients
        </Link>

        {/* ====== Profile Header ====== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    client.confidentiality_level === 'proprietary_confidential'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {client.confidentiality_level === 'proprietary_confidential'
                    ? 'Confidential'
                    : 'Standard'}
                </span>
              </div>
              {client.dba_name && (
                <p className="text-sm text-gray-500 mt-1">DBA: {client.dba_name}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                {client.legal_entity && (
                  <span>
                    <span className="font-medium text-gray-700">Legal Entity:</span>{' '}
                    {client.legal_entity}
                  </span>
                )}
                <span>
                  <span className="font-medium text-gray-700">Agency:</span> {client.agency}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </button>
          </div>
        </div>

        {/* ====== Key Contacts ====== */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Key Contacts</h2>
          {client.key_contacts && client.key_contacts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {client.key_contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                >
                  <p className="font-medium text-gray-900">{contact.name}</p>
                  {contact.title && (
                    <p className="text-sm text-gray-500 mt-0.5">{contact.title}</p>
                  )}
                  <div className="mt-3 space-y-1 text-sm text-gray-600">
                    {contact.email && (
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-3.5 h-3.5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        {contact.email}
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-3.5 h-3.5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        {contact.phone}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-500">No key contacts listed.</p>
            </div>
          )}
        </section>

        {/* ====== Sub-Brands ====== */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Sub-Brands</h2>
            <button
              onClick={() => setShowSubBrandModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Sub-Brand
            </button>
          </div>

          {client.sub_brands && client.sub_brands.length > 0 ? (
            <div className="space-y-4">
              {client.sub_brands.map((sb) => {
                const isExpanded = expandedBrands.has(sb.id);
                return (
                  <div
                    key={sb.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                  >
                    {/* Header – always visible */}
                    <button
                      type="button"
                      onClick={() => toggleBrand(sb.id)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{sb.name}</p>
                        {sb.positioning_statement && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                            {sb.positioning_statement}
                          </p>
                        )}
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Expanded body */}
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                        {sb.positioning_statement && (
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                              Positioning Statement
                            </h4>
                            <p className="text-sm text-gray-700">{sb.positioning_statement}</p>
                          </div>
                        )}
                        {sb.brand_idea && (
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                              Brand Idea
                            </h4>
                            <p className="text-sm text-gray-700">{sb.brand_idea}</p>
                          </div>
                        )}

                        {/* Casting Framework */}
                        {sb.casting_framework ? (
                          <div className="mt-4 bg-gray-50 rounded-lg p-4 space-y-3">
                            <h4 className="text-sm font-semibold text-gray-900">
                              Casting Framework
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Lens Name:</span>{' '}
                                <span className="text-gray-600">
                                  {sb.casting_framework.lens_name}
                                </span>
                              </div>

                              {sb.casting_framework.pillars &&
                                sb.casting_framework.pillars.length > 0 && (
                                  <div className="sm:col-span-2">
                                    <span className="font-medium text-gray-700">Pillars:</span>
                                    <ul className="mt-1 list-disc list-inside text-gray-600">
                                      {sb.casting_framework.pillars.map((p, i) => (
                                        <li key={i}>{p}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                              {sb.casting_framework.demographics &&
                                Object.keys(sb.casting_framework.demographics).length > 0 && (
                                  <div className="sm:col-span-2">
                                    <span className="font-medium text-gray-700">
                                      Demographics:
                                    </span>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                      {Object.entries(sb.casting_framework.demographics).map(
                                        ([key, val]) => (
                                          <span
                                            key={key}
                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                                          >
                                            {key}: {val}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                              {sb.casting_framework.tier_system &&
                                sb.casting_framework.tier_system.length > 0 && (
                                  <div className="sm:col-span-2">
                                    <span className="font-medium text-gray-700">Tier System:</span>
                                    <ul className="mt-1 list-disc list-inside text-gray-600">
                                      {sb.casting_framework.tier_system.map((t, i) => (
                                        <li key={i}>{t}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                              {sb.casting_framework.north_star_references &&
                                sb.casting_framework.north_star_references.length > 0 && (
                                  <div className="sm:col-span-2">
                                    <span className="font-medium text-gray-700">
                                      North Star References:
                                    </span>
                                    <ul className="mt-1 list-disc list-inside text-gray-600">
                                      {sb.casting_framework.north_star_references.map((n, i) => (
                                        <li key={i}>{n}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setShowFrameworkModal(sb.id);
                              setFrameworkForm({
                                lens_name: '',
                                pillars: '',
                                demographics: '',
                                tier_system: '',
                                north_star_references: '',
                              });
                            }}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                            Add Casting Framework
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-500">No sub-brands yet.</p>
            </div>
          )}
        </section>

        {/* ====== Deals ====== */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Deals</h2>
          {deals.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm text-gray-900 font-medium">
                        {deal.name}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          {deal.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700 text-right">
                        {typeof deal.value === 'number'
                          ? `$${deal.value.toLocaleString()}`
                          : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-500">No deals associated with this client.</p>
            </div>
          )}
        </section>
      </div>

      {/* ============================================================ */}
      {/*  MODALS                                                       */}
      {/* ============================================================ */}

      {/* --- Edit Client Modal --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-900/50"
              onClick={() => setShowEditModal(false)}
            />
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Edit Client</h2>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      DBA Name
                    </label>
                    <input
                      type="text"
                      value={editForm.dba_name}
                      onChange={(e) => setEditForm((f) => ({ ...f, dba_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Legal Entity
                    </label>
                    <input
                      type="text"
                      value={editForm.legal_entity}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, legal_entity: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Agency <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.agency}
                      onChange={(e) => setEditForm((f) => ({ ...f, agency: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confidentiality Level
                    </label>
                    <select
                      value={editForm.confidentiality_level}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          confidentiality_level: e.target.value as ClientFormData['confidentiality_level'],
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="standard">Standard</option>
                      <option value="proprietary_confidential">Proprietary Confidential</option>
                    </select>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- Add Sub-Brand Modal --- */}
      {showSubBrandModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-900/50"
              onClick={() => setShowSubBrandModal(false)}
            />
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Add Sub-Brand</h2>
              </div>
              <form onSubmit={handleSubBrandSubmit}>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={subBrandForm.name}
                      onChange={(e) =>
                        setSubBrandForm((f) => ({ ...f, name: e.target.value }))
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Positioning Statement
                    </label>
                    <textarea
                      value={subBrandForm.positioning_statement}
                      onChange={(e) =>
                        setSubBrandForm((f) => ({
                          ...f,
                          positioning_statement: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand Idea
                    </label>
                    <textarea
                      value={subBrandForm.brand_idea}
                      onChange={(e) =>
                        setSubBrandForm((f) => ({ ...f, brand_idea: e.target.value }))
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSubBrandModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Sub-Brand'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- Add Casting Framework Modal --- */}
      {showFrameworkModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-900/50"
              onClick={() => setShowFrameworkModal(null)}
            />
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Add Casting Framework</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Separate multiple values with commas. For demographics use key:value pairs
                  separated by commas (e.g. age:18-35, gender:all).
                </p>
              </div>
              <form onSubmit={(e) => handleFrameworkSubmit(e, showFrameworkModal)}>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lens Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={frameworkForm.lens_name}
                      onChange={(e) =>
                        setFrameworkForm((f) => ({ ...f, lens_name: e.target.value }))
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g. Cultural Relevance"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pillars
                    </label>
                    <input
                      type="text"
                      value={frameworkForm.pillars}
                      onChange={(e) =>
                        setFrameworkForm((f) => ({ ...f, pillars: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Pillar 1, Pillar 2, Pillar 3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Demographics
                    </label>
                    <input
                      type="text"
                      value={frameworkForm.demographics}
                      onChange={(e) =>
                        setFrameworkForm((f) => ({ ...f, demographics: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="age:18-35, gender:all, region:US"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tier System
                    </label>
                    <input
                      type="text"
                      value={frameworkForm.tier_system}
                      onChange={(e) =>
                        setFrameworkForm((f) => ({ ...f, tier_system: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Tier 1, Tier 2, Tier 3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      North Star References
                    </label>
                    <input
                      type="text"
                      value={frameworkForm.north_star_references}
                      onChange={(e) =>
                        setFrameworkForm((f) => ({
                          ...f,
                          north_star_references: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Reference 1, Reference 2"
                    />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFrameworkModal(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Framework'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
