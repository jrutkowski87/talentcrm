'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Deal {
  id: string;
  deal_name: string;
  campaign_name: string;
  status: string;
  deal_type: 'talent' | 'music' | 'talent_and_music';
  client_name: string;
  talent_name: string;
  fee_total: number;
  fee_per_side: number | null;
  updated_at: string;
}

interface Song {
  id: string;
  [key: string]: unknown;
}

interface RightsHolder {
  id: string;
  [key: string]: unknown;
}

interface Talent {
  id: string;
  [key: string]: unknown;
}

interface Client {
  id: string;
  name: string;
  [key: string]: unknown;
}

const TALENT_PIPELINE_STAGES = [
  'creative_brief',
  'outreach',
  'shortlist',
  'approval_to_offer',
  'negotiation',
  'talent_buyin',
  'contract_drafting',
  'admin_logistics',
  'fulfillment',
  'complete',
] as const;

const MUSIC_PIPELINE_STAGES = [
  'music_brief',
  'song_pitching',
  'song_selection',
  'rights_negotiation',
  'license_drafting',
  'music_admin',
  'delivery',
  'complete',
] as const;

type DealType = 'talent' | 'music' | 'talent_and_music';

const DEAL_TYPE_OPTIONS: { value: DealType; label: string }[] = [
  { value: 'talent', label: 'Talent' },
  { value: 'music', label: 'Music' },
  { value: 'talent_and_music', label: 'Both' },
];

function getInitialStages(dealType: DealType) {
  if (dealType === 'music') return MUSIC_PIPELINE_STAGES;
  return TALENT_PIPELINE_STAGES; // talent and talent_and_music use talent pipeline as primary
}

function getDefaultStage(dealType: DealType) {
  return dealType === 'music' ? 'music_brief' : 'creative_brief';
}

const STATUS_GROUPS: Record<string, string[]> = {
  Active: [
    'creative_brief',
    'outreach',
    'shortlist',
    'approval_to_offer',
    'negotiation',
    'talent_buyin',
    'music_brief',
    'song_pitching',
    'song_selection',
    'rights_negotiation',
  ],
  Contracting: ['contract_drafting', 'admin_logistics', 'license_drafting', 'music_admin'],
  Fulfillment: ['fulfillment', 'delivery'],
  Complete: ['complete'],
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  creative_brief:    'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
  outreach:          'bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-600/20',
  shortlist:         'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20',
  approval_to_offer: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  negotiation:       'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20',
  talent_buyin:      'bg-pink-50 text-pink-700 ring-1 ring-inset ring-pink-600/20',
  contract_drafting: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20',
  admin_logistics:   'bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/20',
  fulfillment:       'bg-lime-50 text-lime-700 ring-1 ring-inset ring-lime-600/20',
  complete:          'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
  archived:          'bg-gray-50 text-gray-500 ring-1 ring-inset ring-gray-500/20',
  dead:              'bg-red-50 text-red-600 ring-1 ring-inset ring-red-500/20',
  // Music pipeline
  music_brief:       'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
  song_pitching:     'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/20',
  song_selection:    'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-inset ring-fuchsia-600/20',
  rights_negotiation:'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  license_drafting:  'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20',
  music_admin:       'bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/20',
  delivery:          'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
};

const STATUS_DOT_COLORS: Record<string, string> = {
  creative_brief: 'bg-blue-500', outreach: 'bg-cyan-500', shortlist: 'bg-purple-500',
  approval_to_offer: 'bg-amber-500', negotiation: 'bg-orange-500', talent_buyin: 'bg-pink-500',
  contract_drafting: 'bg-indigo-500', admin_logistics: 'bg-teal-500', fulfillment: 'bg-lime-500',
  complete: 'bg-green-500', archived: 'bg-gray-400', dead: 'bg-red-500',
  music_brief: 'bg-blue-500', song_pitching: 'bg-violet-500', song_selection: 'bg-fuchsia-500',
  rights_negotiation: 'bg-amber-500', license_drafting: 'bg-indigo-500', music_admin: 'bg-teal-500',
  delivery: 'bg-emerald-500',
};

const ACTIVITY_DOT_COLORS: Record<string, string> = {
  status_change: 'bg-blue-500', stage_change: 'bg-blue-500', field_change: 'bg-gray-400',
  talent_added: 'bg-teal-500', talent_selected: 'bg-teal-500',
  document_generated: 'bg-indigo-500', document_uploaded: 'bg-indigo-500', document_signed: 'bg-green-500',
  song_pitched: 'bg-violet-500', song_selected: 'bg-violet-500',
  license_status_change: 'bg-purple-500', license_sent: 'bg-purple-500', license_signed: 'bg-green-500',
  payment_made: 'bg-emerald-500', note_added: 'bg-amber-500',
  approval_granted: 'bg-green-500', offer_accepted: 'bg-green-500',
  fee_recalculated: 'bg-orange-500',
};

const GROUP_COLORS: Record<string, string> = {
  Active: 'bg-blue-500',
  Contracting: 'bg-indigo-500',
  Fulfillment: 'bg-purple-500',
  Complete: 'bg-green-500',
};

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function relativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
}

function snakeCaseToTitleCase(str: string): string {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function DashboardPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [talent, setTalent] = useState<Talent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [rightsHolders, setRightsHolders] = useState<RightsHolder[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Deal modal state
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [dealForm, setDealForm] = useState({
    deal_name: '',
    campaign_name: '',
    client_id: '',
    deal_type: 'talent' as DealType,
    status: 'creative_brief' as string,
  });
  const [dealSubmitting, setDealSubmitting] = useState(false);

  // Inline "Add New Client" state within the New Deal modal
  const [showInlineClient, setShowInlineClient] = useState(false);
  const [inlineClientForm, setInlineClientForm] = useState({
    name: '',
    agency: '',
  });
  const [inlineClientSubmitting, setInlineClientSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [dealsRes, talentRes, clientsRes, songsRes, rhRes] = await Promise.all([
        fetch('/api/deals'),
        fetch('/api/talent'),
        fetch('/api/clients'),
        fetch('/api/songs'),
        fetch('/api/rights-holders'),
      ]);

      const [dealsData, talentData, clientsData, songsData, rhData] = await Promise.all([
        dealsRes.ok ? dealsRes.json() : { data: [] },
        talentRes.ok ? talentRes.json() : { data: [] },
        clientsRes.ok ? clientsRes.json() : { data: [] },
        songsRes.ok ? songsRes.json() : { data: [] },
        rhRes.ok ? rhRes.json() : { data: [] },
      ]);

      setDeals(Array.isArray(dealsData?.data) ? dealsData.data : []);
      setTalent(Array.isArray(talentData?.data) ? talentData.data : []);
      setClients(Array.isArray(clientsData?.data) ? clientsData.data : []);
      setSongs(Array.isArray(songsData?.data) ? songsData.data : []);
      setRightsHolders(Array.isArray(rhData?.data) ? rhData.data : []);

      // Fetch activity feed
      try {
        const activityRes = await fetch('/api/activity?limit=15');
        const activityData = activityRes.ok ? await activityRes.json() : { data: [] };
        setActivityFeed(Array.isArray(activityData?.data) ? activityData.data : []);
      } catch {}
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealForm.deal_name.trim()) return;
    setDealSubmitting(true);
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealForm),
      });
      if (!res.ok) throw new Error('Failed to create deal');
      const json = await res.json();
      setShowNewDeal(false);
      setDealForm({ deal_name: '', campaign_name: '', client_id: '', deal_type: 'talent', status: 'creative_brief' });
      // Navigate to the new deal
      if (json.data?.id) {
        router.push(`/deals/${json.data.id}`);
      } else {
        await fetchData();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating deal');
    } finally {
      setDealSubmitting(false);
    }
  };

  const handleInlineClientCreate = async (e: React.FormEvent) => {
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
        // Add to clients list and auto-select
        setClients((prev) => [...prev, json.data]);
        setDealForm((prev) => ({ ...prev, client_id: json.data.id }));
      }
      setShowInlineClient(false);
      setInlineClientForm({ name: '', agency: '' });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating client');
    } finally {
      setInlineClientSubmitting(false);
    }
  };

  const pipelineCounts = Object.entries(STATUS_GROUPS).map(([group, statuses]) => ({
    group,
    count: deals.filter((d) => statuses.includes(d.status)).length,
  }));

  const allActiveStatuses = [
    ...STATUS_GROUPS.Active,
    ...STATUS_GROUPS.Contracting,
    ...STATUS_GROUPS.Fulfillment,
  ];

  const recentActiveDeals = deals
    .filter((d) => allActiveStatuses.includes(d.status))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-500 text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        {/* Header with New Deal button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Overview of your talent &amp; music pipeline and activity.
            </p>
          </div>
          <button
            onClick={() => setShowNewDeal(true)}
            className="inline-flex items-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Deal
          </button>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowNewDeal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Deal
            </button>
            <Link
              href="/clients"
              onClick={(e) => {
                e.preventDefault();
                // Store flag so clients page opens with modal
                sessionStorage.setItem('openNewClient', '1');
                router.push('/clients');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-100 transition-colors border border-orange-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Client
            </Link>
            <Link
              href="/talent"
              onClick={(e) => {
                e.preventDefault();
                sessionStorage.setItem('openNewTalent', '1');
                router.push('/talent');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 text-sm font-medium rounded-lg hover:bg-teal-100 transition-colors border border-teal-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Talent
            </Link>
            <Link
              href="/reps"
              onClick={(e) => {
                e.preventDefault();
                sessionStorage.setItem('openNewRep', '1');
                router.push('/reps');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 transition-colors border border-purple-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Rep
            </Link>
            <Link
              href="/songs"
              onClick={(e) => {
                e.preventDefault();
                sessionStorage.setItem('openNewSong', '1');
                router.push('/songs');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 text-sm font-medium rounded-lg hover:bg-rose-100 transition-colors border border-rose-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Song
            </Link>
            <Link
              href="/rights-holders"
              onClick={(e) => {
                e.preventDefault();
                sessionStorage.setItem('openNewRightsHolder', '1');
                router.push('/rights-holders');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-100 transition-colors border border-amber-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Rights Holder
            </Link>
          </div>
        </div>

        {/* Pipeline Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {pipelineCounts.map(({ group, count }) => (
            <div
              key={group}
              className="card-hover p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{group}</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">{count}</p>
                </div>
                <div
                  className={`w-10 h-10 rounded-lg ${GROUP_COLORS[group]} flex items-center justify-center`}
                >
                  <span className="text-white text-lg font-bold">
                    {group.charAt(0)}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                {count === 1 ? '1 deal' : `${count} deals`}
              </p>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <Link href="/deals" className="card-hover p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Deals</p>
                <p className="text-2xl font-semibold text-gray-900">{deals.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {deals.filter(d => d.deal_type === 'talent').length}T / {deals.filter(d => d.deal_type === 'music').length}M / {deals.filter(d => d.deal_type === 'talent_and_music').length}B
                </p>
              </div>
            </div>
          </Link>
          <Link href="/talent" className="card-hover p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Talent</p>
                <p className="text-2xl font-semibold text-gray-900">{talent.length}</p>
              </div>
            </div>
          </Link>
          <Link href="/clients" className="card-hover p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Clients</p>
                <p className="text-2xl font-semibold text-gray-900">{clients.length}</p>
              </div>
            </div>
          </Link>
          <Link href="/songs" className="card-hover p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Songs</p>
                <p className="text-2xl font-semibold text-gray-900">{songs.length}</p>
              </div>
            </div>
          </Link>
          <Link href="/rights-holders" className="card-hover p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Rights Holders</p>
                <p className="text-2xl font-semibold text-gray-900">{rightsHolders.length}</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Active Deals Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent Active Deals</h2>
              <p className="text-sm text-gray-500">
                Latest activity across your pipeline.
              </p>
            </div>
            <Link
              href="/deals"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              View all
            </Link>
          </div>

          {recentActiveDeals.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
              </svg>
              <p className="text-gray-500 mb-4">No active deals yet.</p>
              <button
                onClick={() => setShowNewDeal(true)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create your first deal
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deal Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Talent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fee
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentActiveDeals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/deals/${deal.id}`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          {deal.deal_name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          deal.deal_type === 'music' ? 'bg-rose-50 text-rose-700' :
                          deal.deal_type === 'talent_and_music' ? 'bg-violet-50 text-violet-700' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {deal.deal_type === 'talent' ? 'Talent' : deal.deal_type === 'music' ? 'Music' : 'Both'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {deal.client_name || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {deal.talent_name || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_BADGE_COLORS[deal.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[deal.status] || 'bg-gray-400'}`} />
                          {formatStatus(deal.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {deal.fee_total != null ? formatCurrency(deal.fee_total) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        {relativeTime(deal.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        {activityFeed.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <p className="text-xs text-gray-500 mt-0.5">Latest actions across all deals</p>
            </div>
            <div className="divide-y divide-gray-50">
              {activityFeed.map((entry: any) => (
                <div key={entry.id} className="px-6 py-3 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${ACTIVITY_DOT_COLORS[entry.event_type] || 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">
                      <Link href={`/deals/${entry.deal_id}`} className="font-medium text-indigo-600 hover:text-indigo-800">
                        {entry.deal_name || 'Deal'}
                      </Link>
                      {' '}
                      <span className="text-gray-500">
                        {entry.event_type === 'status_change' || entry.event_type === 'stage_change'
                          ? `moved to ${formatStatus(entry.new_value || '')}`
                          : entry.event_type === 'note_added' ? 'received a note'
                          : entry.event_type === 'talent_added' ? 'had talent added'
                          : entry.event_type === 'talent_selected' ? 'selected talent'
                          : entry.event_type === 'document_generated' ? 'generated a document'
                          : entry.event_type === 'offer_accepted' ? 'had offer accepted'
                          : entry.event_type === 'approval_granted' ? 'received approval'
                          : entry.event_type === 'payment_made' ? 'had a payment logged'
                          : snakeCaseToTitleCase(entry.event_type).toLowerCase()
                        }
                      </span>
                    </p>
                    {entry.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{entry.description}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{relativeTime(entry.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New Deal Modal */}
      {showNewDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowNewDeal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">New Deal</h2>
              <button
                onClick={() => setShowNewDeal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                  value={dealForm.deal_name}
                  onChange={(e) => setDealForm((prev) => ({ ...prev, deal_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="e.g., Nike Q4 Campaign"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={dealForm.campaign_name}
                  onChange={(e) => setDealForm((prev) => ({ ...prev, campaign_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="e.g., Holiday 2026"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deal Type</label>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  {DEAL_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const newType = opt.value;
                        setDealForm((prev) => ({
                          ...prev,
                          deal_type: newType,
                          status: getDefaultStage(newType),
                        }));
                      }}
                      className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                        dealForm.deal_type === opt.value
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                {!showInlineClient ? (
                  <>
                    <select
                      value={dealForm.client_id}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          setShowInlineClient(true);
                        } else {
                          setDealForm((prev) => ({ ...prev, client_id: e.target.value }));
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
                  </>
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
                    <div>
                      <input
                        type="text"
                        value={inlineClientForm.name}
                        onChange={(e) => setInlineClientForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                        placeholder="Client name (e.g. Nike)"
                        autoFocus
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={inlineClientForm.agency}
                        onChange={(e) => setInlineClientForm((prev) => ({ ...prev, agency: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                        placeholder="Agency (e.g. Wieden+Kennedy)"
                      />
                    </div>
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
                  Initial Stage
                </label>
                <select
                  value={dealForm.status}
                  onChange={(e) => setDealForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  {getInitialStages(dealForm.deal_type).map((stage) => (
                    <option key={stage} value={stage}>
                      {snakeCaseToTitleCase(stage)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewDeal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dealSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {dealSubmitting ? 'Creating...' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
