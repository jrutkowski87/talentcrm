'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DuplicateWarning from '../components/DuplicateWarning';
import { snakeToTitle, formatCurrency } from '@/lib/format';

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

// snakeToTitle and formatCurrency imported from @/lib/format

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

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Advanced Filters — consolidated into single object
  const defaultFilters = { search: '', stages: [] as string[], clientIds: [] as string[], feeMin: '', feeMax: '', dateFrom: '', dateTo: '' };
  const [filters, setFilters] = useState(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const updateFilter = <K extends keyof typeof defaultFilters>(key: K, value: typeof defaultFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setActiveViewId(null);
  };

  // Saved Views
  const [savedViews, setSavedViews] = useState<any[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [viewName, setViewName] = useState('');
  const [viewDescription, setViewDescription] = useState('');
  const [savingView, setSavingView] = useState(false);

  // Bulk selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    setSelectedDealIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkStatus = async (newStatus: string) => {
    if (!newStatus || selectedDealIds.size === 0) return;
    try {
      const res = await fetch('/api/deals/bulk-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_ids: Array.from(selectedDealIds), status: newStatus }),
      });
      if (res.ok) {
        setSelectedDealIds(new Set());
        setSelectionMode(false);
        await fetchDeals();
      }
    } catch (err) {
      alert('Failed to update deals');
    }
  };

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
    // Fetch templates
    fetch('/api/templates').then(r => r.json()).then(d => {
      if (d.success) setTemplates(d.data || []);
    }).catch(() => {});
    // Fetch saved views
    fetch('/api/views').then(r => r.json()).then(d => {
      if (d.success) setSavedViews(d.data || []);
    }).catch(() => {});
  }, [fetchDeals, fetchClients]);

  const activeFilterCount = [
    dealTypeFilter !== 'all',
    filters.stages.length > 0,
    filters.clientIds.length > 0,
    filters.feeMin !== '',
    filters.feeMax !== '',
    filters.dateFrom !== '',
    filters.dateTo !== '',
    filters.search !== '',
  ].filter(Boolean).length;

  const filteredDeals = deals.filter((d) => {
    // Deal type filter
    if (dealTypeFilter === 'talent' && d.deal_type !== 'talent' && d.deal_type !== 'talent_and_music') return false;
    if (dealTypeFilter === 'music' && d.deal_type !== 'music') return false;
    // Stage filter
    if (filters.stages.length > 0 && !filters.stages.includes(d.status)) return false;
    // Client filter
    if (filters.clientIds.length > 0 && !filters.clientIds.some(cid => {
      const client = clients.find(c => c.id === cid);
      return client && d.client_name === client.name;
    })) return false;
    // Fee range
    if (filters.feeMin !== '' && (d.fee_total == null || d.fee_total < Number(filters.feeMin))) return false;
    if (filters.feeMax !== '' && (d.fee_total == null || d.fee_total > Number(filters.feeMax))) return false;
    // Date range
    if (filters.dateFrom && d.updated_at < filters.dateFrom) return false;
    if (filters.dateTo && d.updated_at > filters.dateTo + 'T23:59:59') return false;
    // Search
    if (filters.search) {
      const s = filters.search.toLowerCase();
      if (!d.deal_name.toLowerCase().includes(s) && !d.campaign_name.toLowerCase().includes(s) && !(d.talent_name || '').toLowerCase().includes(s)) return false;
    }
    return true;
  });

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

  // --- Saved Views Helpers ---
  const getCurrentFilters = () => ({
    dealType: dealTypeFilter,
    stages: filters.stages,
    clientIds: filters.clientIds,
    feeMin: filters.feeMin ? Number(filters.feeMin) : null,
    feeMax: filters.feeMax ? Number(filters.feeMax) : null,
    dateFrom: filters.dateFrom || null,
    dateTo: filters.dateTo || null,
    search: filters.search,
  });

  const applyView = (view: any) => {
    const fd = typeof view.filter_data === 'string' ? JSON.parse(view.filter_data) : view.filter_data;
    setDealTypeFilter(fd.dealType || 'all');
    setFilters({
      stages: fd.stages || [],
      clientIds: fd.clientIds || [],
      feeMin: fd.feeMin != null ? String(fd.feeMin) : '',
      feeMax: fd.feeMax != null ? String(fd.feeMax) : '',
      dateFrom: fd.dateFrom || '',
      dateTo: fd.dateTo || '',
      search: fd.search || '',
    });
    setActiveViewId(view.id);
  };

  const handleSaveView = async () => {
    if (!viewName.trim()) return;
    setSavingView(true);
    try {
      const res = await fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: viewName.trim(),
          description: viewDescription.trim() || undefined,
          filter_data: getCurrentFilters(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSavedViews(prev => [...prev, json.data]);
        setActiveViewId(json.data.id);
        setShowSaveViewModal(false);
        setViewName('');
        setViewDescription('');
      }
    } catch {}
    setSavingView(false);
  };

  const handleDeleteView = async (viewId: string) => {
    try {
      await fetch(`/api/views/${viewId}`, { method: 'DELETE' });
      setSavedViews(prev => prev.filter(v => v.id !== viewId));
      if (activeViewId === viewId) setActiveViewId(null);
    } catch {}
  };

  const clearAllFilters = () => {
    setDealTypeFilter('all');
    setFilters(defaultFilters);
    setActiveViewId(null);
  };

  const toggleStageFilter = (stage: string) => {
    setFilters(prev => ({
      ...prev,
      stages: prev.stages.includes(stage) ? prev.stages.filter(s => s !== stage) : [...prev.stages, stage],
    }));
    setActiveViewId(null);
  };

  const toggleClientFilter = (clientId: string) => {
    setFilters(prev => ({
      ...prev,
      clientIds: prev.clientIds.includes(clientId) ? prev.clientIds.filter(c => c !== clientId) : [...prev.clientIds, clientId],
    }));
    setActiveViewId(null);
  };

  const allStages = Array.from(new Set([...TALENT_PIPELINE_STAGES, ...MUSIC_PIPELINE_STAGES]));

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deal_name.trim()) return;
    setFormSubmitting(true);
    try {
      // Merge template data if selected
      let payload: any = { ...formData };
      if (selectedTemplateId) {
        const tmpl = templates.find((t: any) => t.id === selectedTemplateId);
        if (tmpl) {
          const tmplData = typeof tmpl.template_data === 'string' ? JSON.parse(tmpl.template_data) : tmpl.template_data;
          payload = { ...tmplData, ...payload };
        }
      }
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create deal');
      setShowNewDealModal(false);
      setFormData({ deal_name: '', campaign_name: '', client_id: '', deal_type: 'talent', status: 'creative_brief' });
      setSelectedTemplateId('');
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSelectionMode(!selectionMode); setSelectedDealIds(new Set()); }}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectionMode
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {selectionMode ? 'Cancel' : 'Select'}
            </button>
            <button
              onClick={() => setShowNewDealModal(true)}
              className="btn-primary"
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Deal
            </button>
          </div>
        </div>
      </div>

      {/* Saved Views Bar */}
      {savedViews.length > 0 && (
        <div className="px-6 pt-3 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">Views:</span>
          {savedViews.map((view: any) => (
            <div key={view.id} className="group relative shrink-0">
              <button
                onClick={() => applyView(view)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  activeViewId === view.id
                    ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={view.description || view.name}
              >
                {view.name}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteView(view.id); }}
                className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gray-400 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                title="Delete view"
              >
                <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <div className="px-6 pt-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Deal Type Pills */}
          {(['all', 'talent', 'music'] as DealTypeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => { setDealTypeFilter(f); setActiveViewId(null); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                dealTypeFilter === f
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'All Deals' : f === 'talent' ? 'Talent' : 'Music'}
            </button>
          ))}

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Search */}
          <div className="relative">
            <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Search deals..."
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-44"
            />
          </div>

          {/* Toggle Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Save View */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => setShowSaveViewModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
              title="Save current filters as a view"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Save View
            </button>
          )}

          {/* Clear All */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear all
            </button>
          )}

          {/* Filter Count Badge */}
          <span className="ml-auto text-xs text-gray-400">
            {filteredDeals.length} deal{filteredDeals.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Advanced Filter Panel */}
        {showFilters && (
          <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stage Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Stage</label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {allStages.map((stage) => (
                  <label key={stage} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer hover:text-indigo-600">
                    <input
                      type="checkbox"
                      checked={filters.stages.includes(stage)}
                      onChange={() => toggleStageFilter(stage)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {snakeToTitle(stage)}
                  </label>
                ))}
              </div>
            </div>

            {/* Client Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Client</label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {clients.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No clients</p>
                ) : (
                  clients.map((client) => (
                    <label key={client.id} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer hover:text-indigo-600">
                      <input
                        type="checkbox"
                        checked={filters.clientIds.includes(client.id)}
                        onChange={() => toggleClientFilter(client.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      {client.name}
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Fee Range */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Fee Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={filters.feeMin}
                  onChange={(e) => updateFilter('feeMin', e.target.value)}
                  placeholder="Min"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <span className="text-gray-400 text-xs">–</span>
                <input
                  type="number"
                  value={filters.feeMax}
                  onChange={(e) => updateFilter('feeMax', e.target.value)}
                  placeholder="Max"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Updated Date Range</label>
              <div className="space-y-1.5">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save View Modal */}
      {showSaveViewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowSaveViewModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Save Current Filters as View</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">View Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  placeholder="e.g., High-value music deals"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <input
                  type="text"
                  value={viewDescription}
                  onChange={(e) => setViewDescription(e.target.value)}
                  placeholder="Optional description..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowSaveViewModal(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={handleSaveView}
                disabled={!viewName.trim() || savingView}
                className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingView ? 'Saving...' : 'Save View'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                      {snakeToTitle(stage)}
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
                  {stageDeals.map((deal) => {
                    const typeStripe = deal.deal_type === 'talent_and_music'
                      ? 'deal-card-both'
                      : deal.deal_type === 'music'
                        ? 'border-l-4 border-l-purple-500'
                        : 'border-l-4 border-l-blue-500';
                    const isSelected = selectedDealIds.has(deal.id);

                    const cardContent = (
                      <div className={`bg-white rounded-lg shadow-sm p-3 transition-all duration-200 border border-gray-100 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${typeStripe} ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          {selectionMode && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelection(deal.id)}
                              className="w-4 h-4 mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
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
                    );

                    if (selectionMode) {
                      return (
                        <div key={deal.id} onClick={() => toggleSelection(deal.id)}>
                          {cardContent}
                        </div>
                      );
                    }

                    return (
                      <Link key={deal.id} href={`/deals/${deal.id}`} className="block">
                        {cardContent}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedDealIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4 z-40">
          <span className="text-sm font-medium">{selectedDealIds.size} deal{selectedDealIds.size > 1 ? 's' : ''} selected</span>
          <select
            onChange={(e) => handleBulkStatus(e.target.value)}
            className="bg-gray-800 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-700 focus:ring-1 focus:ring-indigo-500 outline-none"
            defaultValue=""
          >
            <option value="" disabled>Move to...</option>
            {(dealTypeFilter === 'music' ? MUSIC_PIPELINE_STAGES : TALENT_PIPELINE_STAGES).map(stage => (
              <option key={stage} value={stage}>{snakeToTitle(stage)}</option>
            ))}
            <option disabled>──────────</option>
            <option value="archived">Archive</option>
            <option value="dead">Dead</option>
          </select>
          <button
            onClick={() => { setSelectedDealIds(new Set()); setSelectionMode(false); }}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

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
              {/* Template Selector */}
              {templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                      Use Template
                    </span>
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      setSelectedTemplateId(e.target.value);
                      const tmpl = templates.find((t: any) => t.id === e.target.value);
                      if (tmpl) {
                        try {
                          const data = typeof tmpl.template_data === 'string' ? JSON.parse(tmpl.template_data) : tmpl.template_data;
                          setFormData(prev => ({
                            ...prev,
                            deal_type: data.deal_type || prev.deal_type,
                            status: data.deal_type === 'music' ? 'music_brief' : 'creative_brief',
                          }));
                        } catch {}
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="">Start from scratch</option>
                    {templates.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.deal_type === 'talent' ? 'Talent' : t.deal_type === 'music' ? 'Music' : 'Both'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                <DuplicateWarning entityType="deal" name={formData.deal_name} />
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
                    <DuplicateWarning entityType="client" name={inlineClientForm.name} />
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
                      {snakeToTitle(stage)}
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
