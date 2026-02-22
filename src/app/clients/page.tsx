'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Client {
  id: string;
  name: string;
  dba_name: string | null;
  agency: string;
  sub_brand_count: number;
  deal_count: number;
}

interface ClientFormData {
  name: string;
  dba_name: string;
  legal_entity: string;
  agency: string;
}

const emptyForm: ClientFormData = {
  name: '',
  dba_name: '',
  legal_entity: '',
  agency: '',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error('Failed to fetch clients');
      const json = await res.json();
      setClients(json.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
    // Check if dashboard sent us here to open the modal
    if (typeof window !== 'undefined' && sessionStorage.getItem('openNewClient')) {
      sessionStorage.removeItem('openNewClient');
      setShowModal(true);
    }
  }, [fetchClients]);

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to create client');
      setFormData(emptyForm);
      setShowModal(false);
      await fetchClients();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your client roster and relationships
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary text-sm px-4 py-2.5"
          >
            <svg
              className="w-4 h-4 mr-2"
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
            Add Client
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
              placeholder="Search clients by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 form-input"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredClients.length === 0 && (
          <div className="text-center py-20">
            <svg
              className="mx-auto w-12 h-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0v-2M5 21H3m2 0v-2m0-12h14"
              />
            </svg>
            <p className="mt-4 text-sm text-gray-500">
              {search ? 'No clients match your search.' : 'No clients yet. Add your first client to get started.'}
            </p>
          </div>
        )}

        {/* Client Grid */}
        {!loading && !error && filteredClients.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 card-hover"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-base font-semibold text-gray-900 hover:text-indigo-600 transition-colors block truncate"
                    >
                      {client.name}
                    </Link>
                    {client.dba_name && (
                      <p className="text-sm text-gray-500 mt-0.5 truncate">
                        DBA: {client.dba_name}
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4">{client.agency}</p>

                <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
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
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    {client.sub_brand_count} Sub-Brand{client.sub_brand_count !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    {client.deal_count} Deal{client.deal_count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-900/50 transition-opacity"
              onClick={() => setShowModal(false)}
            />
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Add Client</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Create a new client in your roster
                </p>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="e.g. Acme Corporation"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      DBA Name
                    </label>
                    <input
                      type="text"
                      name="dba_name"
                      value={formData.dba_name}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Doing business as..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Legal Entity
                    </label>
                    <input
                      type="text"
                      name="legal_entity"
                      value={formData.legal_entity}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="e.g. Acme Corp LLC"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Agency <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="agency"
                      value={formData.agency}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="e.g. WME, CAA, UTA"
                    />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setFormData(emptyForm);
                    }}
                    className="btn-secondary text-sm px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Creating...' : 'Create Client'}
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
