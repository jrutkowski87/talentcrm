'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type DealType = 'talent' | 'music' | 'talent_and_music';

interface Deal {
  id: string;
  deal_name: string;
  campaign_name: string;
  status: string;
  deal_type: DealType;
  client_name: string;
  talent_name: string | null;
  fee_total: number | null;
  fee_per_side: number | null;
  updated_at: string;
}

interface Client {
  id: string;
  name: string;
}

const TALENT_PIPELINE_STAGES = [
  'creative_brief', 'outreach', 'shortlist', 'approval_to_offer',
  'negotiation', 'talent_buyin', 'contract_drafting', 'admin_logistics',
  'fulfillment', 'complete',
] as const;

const MUSIC_PIPELINE_STAGES = [
  'music_brief', 'song_pitching', 'song_selection', 'rights_negotiation',
  'license_drafting', 'music_admin', 'delivery', 'complete',
] as const;

type DealTypeFilter = 'all' | 'talent' | 'music';

const DEAL_TYPE_LABELS: Record<string, string> = {
  talent: 'Talent',
  music: 'Music',
  talent_and_music: 'Both',
};

const DEAL_TYPE_COLORS: Record<string, string> = {
  talent: 'bg-blue-100 text-blue-700',
  music: 'bg-purple-100 text-purple-700',
  talent_and_music: 'bg-indigo-100 text-indigo-700',
};

function snakeCaseToTitleCase(str: string): string {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewDealModal, setShowNewDealModal] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [dealTypeFilter, setDealTypeFilter] = useState<DealTypeFilter>('all');
  const [formData, setFormData] = useState({
    deal_name: '',
    campaign_name: '',
    client_id: '',
    deal_type: 'talent' as DealType,
    status: 'creative_brief',
  });

  // Inline "Add New Client" within deal modal
  const [showInlineClient, setShowInlineClient] = useState(false);
  const [inlineClientForm, setInlineClientForm] = useState({
    name: '',
    agency: '',
  });
  const [inlineClientSubmitting, setInlineClientSubmitting] = useState(false);

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch('/api/deals');
      if (!res.ok) throw new Error('Failed to fetch deals');
      const json = await res.json();
      setDeals(json.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error('Failed to fetch clients');
      const json = await res.json();
      setClients(json.data || []);
    } catch {
      // Clients fetch is non-critical; modal will show empty dropdown
    }
  }, []);

  useEffect(() => {
    fetchDeals();
    fetchClients();
  }, [fetchDeals, fetchClients]);

  const filteredDeals = dealTypeFilter === 'all'
    ? deals
    : dealTypeFilter === 'talent'
      ? deals.filter((d) => d.deal_type === 'talent' || d.deal_type === 'talent_and_music')
      : deals.filter((d) => d.deal_type === 'music' || d.deal_type === 'talent_and_music');

  const activePipeline = dealTypeFilter === 'music'
    ? MUSIC_PIPELINE_STAGES
    : TALENT_PIPELINE_STAGES;

  const dealsByStage = activePipeline.reduce(
    (acc, stage) => {
      acc[stage] = filteredDeals.filter((d) => d.status === stage);
      return acc;
    },
    {} as Record<string, Deal[]>
  );

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deal_name.trim()) return;
    setFormSubmitting(true);
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to create deal');
      setShowNewDealModal(false);
      setFormData({ deal_name: '', campaign_name: '', client_id: '', deal_type: 'talent', status: 'creative_brief' });
      await fetchDeals();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating deal');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleInlineClientCreate = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!inlineClientForm.name.trim()) return;
    setInlineClientSubmitting(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inlineClientForm),
      });
      if (!res.ok) throw new Error('Failed to create client');
      const json = await res.json();
      if (json.data?.id) {
        setClients((prev) => [...prev, json.data]);
        setFormData((prev) => ({ ...prev, client_id: json.data.id }));
      }
      setShowInlineClient(false);
      setInlineClientForm({ name: '', agency: '' });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating client');
    } finally {
      setInlineClientSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 text-lg">Loading deals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Deals Pipeline</h1>
            <p className="text-sm text-gray-500 mt-1">
              {filteredDeals.length} deal{filteredDeals.length !== 1 ? 's' : ''}
              {dealTypeFilter !== 'all' && ` (${dealTypeFilter})`}
            </p>
          </div>
          <button
            onClick={() => setShowNewDealModal(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
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
            New Deal
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-6 pt-4 flex gap-2">
        {(['all', 'talent', 'music'] as DealTypeFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setDealTypeFilter(f)}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              dealTypeFilter === f
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'All Deals' : f === 'talent' ? 'Talent' : 'Music'}
          </button>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="p-6 overflow-x-auto">
        <div className="flex gap-4" style={{ minWidth: activePipeline.length * 290 }}>
          {activePipeline.map((stage) => {
            const stageDeals = dealsByStage[stage] || [];
            return (
              <div
                key={stage}
                className="flex-shrink-0 w-72 bg-gray-100 rounded-lg flex flex-col max-h-[calc(100vh-180px)]"
              >
                {/* Column Header */}
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">
                      {snakeCaseToTitleCase(stage)}
                    </h3>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 text-xs font-medium text-gray-700">
                      {stageDeals.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="p-2 overflow-y-auto flex-1 space-y-2">
                  {stageDeals.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No deals</p>
                  )}
                  {stageDeals.map((deal) => (
                    <Link key={deal.id} href={`/deals/${deal.id}`} className="block">
                      <div className="bg-white rounded-lg shadow-sm p-3 hover:shadow-md transition-shadow border border-gray-100 cursor-pointer">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-gray-900 truncate flex-1">
                            {deal.deal_name}
                          </h4>
                          {deal.deal_type && deal.deal_type !== 'talent' && (
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${DEAL_TYPE_COLORS[deal.deal_type] || ''}`}>
                              {DEAL_TYPE_LABELS[deal.deal_type]}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {deal.client_name}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-600">
                            {deal.talent_name || 'TBD'}
                          </span>
                          <span className="text-xs font-semibold text-indigo-600">
                            {deal.deal_type === 'music' && deal.fee_per_side
                              ? `${formatCurrency(deal.fee_per_side)}/side`
                              : formatCurrency(deal.fee_total)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Deal Modal */}
      {showNewDealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowNewDealModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">New Deal</h2>
              <button
                onClick={() => setShowNewDealModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.deal_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, deal_name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="e.g., Nike Q4 Campaign"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={formData.campaign_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, campaign_name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="e.g., Holiday 2026"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                {!showInlineClient ? (
                  <select
                    value={formData.client_id}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setShowInlineClient(true);
                      } else {
                        setFormData((prev) => ({ ...prev, client_id: e.target.value }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="">Select a client...</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                    <option value="__new__">+ Add New Client</option>
                  </select>
                ) : (
                  <div className="border border-indigo-200 bg-indigo-50/50 rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-indigo-700">New Client</span>
                      <button
                        type="button"
                        onClick={() => setShowInlineClient(false)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                    <input
                      type="text"
                      value={inlineClientForm.name}
                      onChange={(e) => setInlineClientForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                      placeholder="Client name (e.g. Nike)"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={inlineClientForm.agency}
                      onChange={(e) => setInlineClientForm((prev) => ({ ...prev, agency: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                      placeholder="Agency (e.g. Wieden+Kennedy)"
                    />
                    <button
                      type="button"
                      disabled={!inlineClientForm.name.trim() || inlineClientSubmitting}
                      onClick={handleInlineClientCreate}
                      className="w-full px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {inlineClientSubmitting ? 'Creating...' : 'Create Client & Select'}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deal Type
                </label>
                <div className="flex gap-2">
                  {(['talent', 'music', 'talent_and_music'] as DealType[]).map((dt) => (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => {
                        const firstStage = dt === 'music' ? 'music_brief' : 'creative_brief';
                        setFormData((prev) => ({ ...prev, deal_type: dt, status: firstStage }));
                      }}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        formData.deal_type === dt
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {DEAL_TYPE_LABELS[dt]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Stage
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  {(formData.deal_type === 'music' ? MUSIC_PIPELINE_STAGES : TALENT_PIPELINE_STAGES).map((stage) => (
                    <option key={stage} value={stage}>
                      {snakeCaseToTitleCase(stage)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewDealModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {formSubmitting ? 'Creating...' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
