'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DealNotesPanel from '../../components/DealNotesPanel';
import DealTasksPanel from '../../components/DealTasksPanel';
import ContactPopover from '../../components/ContactPopover';
import { snakeToTitle, formatCurrency } from '@/lib/format';

// ---------------------------------------------------------------------------
// Types (matching actual API responses)
// ---------------------------------------------------------------------------

interface Deal {
  id: string;
  client_id: string;
  sub_brand_id: string | null;
  deal_name: string;
  campaign_name: string;
  status: string;
  talent_id: string | null;
  brief_raw_text: string | null;
  brief_parsed_data: unknown | null;
  effective_date: string | null;
  service_days: any[];
  social_posts: any;
  media_opportunities: any;
  ambassador_duties: any;
  approval_rights: any;
  image_rights: any;
  permitted_usage: any;
  post_term_rules: string | null;
  term_duration: string | null;
  term_duration_weeks: number | null;
  term_start_trigger: string | null;
  term_start_date: string | null;
  term_end_date: string | null;
  fee_total: number | null;
  fee_currency: string;
  fee_structure: string | null;
  fee_payments: unknown[];
  fee_net_terms: string | null;
  fee_mfn: boolean;
  fee_mfn_details: string | null;
  fee_revenue_share: any;
  fee_ancillary: string | null;
  exclusivity_category: string | null;
  exclusivity_brands: string[];
  exclusivity_duration: string | null;
  travel: any;
  hmu: any;
  talent_criteria: any;
  governing_law: string;
  non_union: boolean;
  confidential: boolean;
  lender_entity: string | null;
  lender_address: string | null;
  company_signatory: string | null;
  talent_signatory: string | null;
  notice_emails: string | null;
  termination_cure_days: number;
  morals_clause: boolean;
  morals_clause_details: string | null;
  pro_rata_formula: string | null;
  materials_stills_count: number | null;
  materials_videos: { count: number; length: string }[];
  materials_edits_versions: boolean;
  materials_alternate_assets: string | null;
  // Music licensing
  deal_type: string;
  music_status: string | null;
  song_id: string | null;
  license_type: string | null;
  usage_type: string[];
  territory: string | null;
  media: string[];
  fee_per_side: number | null;
  master_fee_override: number | null;
  usage_description: string | null;
  // Stage Gates
  approval_to_engage_at: string | null;
  approval_to_engage_by: string | null;
  approval_notes: string | null;
  // Offer Snapshot
  offer_snapshot: any;
  // Fulfillment
  usage_start_date: string | null;
  usage_end_date: string | null;
  deliverables_status: any[];
  // Admin
  admin_checklist: any[];
  w9_received: boolean;
  w9_received_date: string | null;
  invoice_received: boolean;
  invoice_received_date: string | null;
  // Versioning
  offer_sheet_version: number;
  longform_version: number;
  offer_accepted_at: string | null;
  contract_executed_at: string | null;
  created_at: string;
  updated_at: string;
  client_name: string;
  talent_name: string | null;
}

interface ShortlistEntry {
  id: string;
  talent_id: string;
  talent_name: string;
  talent_category: string;
  talent_location: string;
  talent_rate_range: string | null;
  rep_name: string | null;
  rep_agency: string | null;
  fit_score: number | null;
  status: string;
  estimated_rate: string | null;
  your_notes: string | null;
}

interface TalentOption {
  id: string;
  name: string;
  category: string;
}

interface UploadedDocument {
  id: string;
  deal_id: string;
  filename: string;
  original_name: string;
  file_type: string;
  doc_category: string;
  file_size: number;
  extracted_text: string | null;
  parsed_data: any;
  upload_status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface MusicLicenseEntry {
  license_id: string;
  rights_holder_name: string;
  share_percentage: number;
  fee_amount: number | null;
  license_status: string;
  data: unknown;
  text: string;
}

interface DocumentsResponse {
  deal_id: string;
  deal_name: string;
  offer_sheet: {
    version: number;
    data: unknown;
    text: string;
  } | null;
  long_form: {
    version: number;
    data: unknown;
    text: string;
  } | null;
  music_documents: {
    master_licenses: MusicLicenseEntry[];
    publishing_licenses: MusicLicenseEntry[];
  } | null;
  uploaded_documents: UploadedDocument[];
}

interface TimelineEntry {
  id: string;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  created_at: string;
}

interface SyncStatus {
  offerSheetVersion: number;
  longFormVersion: number;
  pendingChanges: number;
  lastSyncedAt: string;
  discrepancies: unknown[];
}

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const TALENT_STATUSES = [
  'creative_brief', 'outreach', 'shortlist', 'approval_to_offer',
  'negotiation', 'talent_buyin', 'contract_drafting', 'admin_logistics',
  'fulfillment', 'complete', 'archived', 'dead',
] as const;

const MUSIC_STATUSES = [
  'music_brief', 'song_pitching', 'song_selection', 'rights_negotiation',
  'license_drafting', 'music_admin', 'delivery', 'complete', 'archived', 'dead',
] as const;


const TALENT_TABS = ['Overview', 'Shortlist', 'Documents', 'Admin', 'Fulfillment', 'Tasks', 'Notes', 'Timeline'] as const;
const MUSIC_TABS = ['Overview', 'Song Pitchlist', 'Music Licenses', 'Documents', 'Admin', 'Tasks', 'Notes', 'Timeline'] as const;
const BOTH_TABS = ['Overview', 'Shortlist', 'Song Pitchlist', 'Music Licenses', 'Documents', 'Admin', 'Fulfillment', 'Tasks', 'Notes', 'Timeline'] as const;
type Tab = string;

// snakeToTitle and formatCurrency imported from @/lib/format

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  // Append T00:00:00 for date-only strings to avoid timezone off-by-one
  const d = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    creative_brief: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
    outreach: 'bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-600/20',
    shortlist: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20',
    approval_to_offer: 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20',
    negotiation: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20',
    talent_buyin: 'bg-pink-50 text-pink-700 ring-1 ring-inset ring-pink-600/20',
    contract_drafting: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20',
    admin_logistics: 'bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/20',
    fulfillment: 'bg-lime-50 text-lime-700 ring-1 ring-inset ring-lime-600/20',
    complete: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
    archived: 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/20',
    dead: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
    music_brief: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/20',
    song_pitching: 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-inset ring-fuchsia-600/20',
    song_selection: 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-inset ring-fuchsia-600/20',
    rights_negotiation: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
    license_drafting: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20',
    music_admin: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    delivery: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
  };
  return map[status] || 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-500/20';
}

const STATUS_DOT_COLORS: Record<string, string> = {
  creative_brief: 'bg-blue-500',
  outreach: 'bg-cyan-500',
  shortlist: 'bg-purple-500',
  approval_to_offer: 'bg-yellow-500',
  negotiation: 'bg-orange-500',
  talent_buyin: 'bg-pink-500',
  contract_drafting: 'bg-indigo-500',
  admin_logistics: 'bg-teal-500',
  fulfillment: 'bg-lime-500',
  complete: 'bg-green-500',
  archived: 'bg-gray-400',
  dead: 'bg-red-500',
  music_brief: 'bg-violet-500',
  song_pitching: 'bg-fuchsia-500',
  song_selection: 'bg-fuchsia-500',
  rights_negotiation: 'bg-amber-500',
  license_drafting: 'bg-sky-500',
  music_admin: 'bg-emerald-500',
  delivery: 'bg-green-500',
};

function eventTypeColor(eventType: string): string {
  const map: Record<string, string> = {
    stage_change: 'bg-blue-100 text-blue-800',
    field_change: 'bg-gray-100 text-gray-800',
    email_sent: 'bg-cyan-100 text-cyan-800',
    email_received: 'bg-teal-100 text-teal-800',
    document_generated: 'bg-indigo-100 text-indigo-800',
    document_signed: 'bg-green-100 text-green-800',
    talent_added: 'bg-purple-100 text-purple-800',
    talent_selected: 'bg-pink-100 text-pink-800',
    payment_made: 'bg-emerald-100 text-emerald-800',
    note_added: 'bg-yellow-100 text-yellow-800',
    discrepancy_flagged: 'bg-red-100 text-red-800',
    discrepancy_resolved: 'bg-lime-100 text-lime-800',
    status_change: 'bg-blue-100 text-blue-800',
    approval_granted: 'bg-green-100 text-green-800',
    offer_accepted: 'bg-emerald-100 text-emerald-800',
    document_uploaded: 'bg-indigo-100 text-indigo-800',
    deliverable_completed: 'bg-lime-100 text-lime-800',
    usage_expired: 'bg-orange-100 text-orange-800',
  };
  return map[eventType] || 'bg-gray-100 text-gray-700';
}

function renderStars(score: number | null): string {
  if (score == null) return '--';
  const filled = Math.round(Math.min(Math.max(score, 0), 5));
  return '\u2605'.repeat(filled) + '\u2606'.repeat(5 - filled);
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.id as string;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [gateModal, setGateModal] = useState<{
    gate: string;
    targetStatus: string;
    message: string;
  } | null>(null);
  const [approvalBy, setApprovalBy] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  // Tab data
  const [shortlist, setShortlist] = useState<ShortlistEntry[] | null>(null);
  const [shortlistLoading, setShortlistLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentsResponse | null>(null);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEntry[] | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [musicLicenses, setMusicLicenses] = useState<any[]>([]);

  // Save as Template modal state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showExportMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showExportMenu]);

  // -----------------------------------------------------------------------
  // Fetch deal
  // -----------------------------------------------------------------------
  const fetchDeal = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}`);
      if (!res.ok) throw new Error('Failed to fetch deal');
      const json = await res.json();
      setDeal(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load deal');
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    fetchDeal();
  }, [fetchDeal]);

  // -----------------------------------------------------------------------
  // Music Licenses (used by Overview + Music Licenses tab)
  // -----------------------------------------------------------------------
  const fetchMusicLicenses = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}/music-licenses`);
      if (res.ok) {
        const json = await res.json();
        setMusicLicenses(json.data || []);
      }
    } catch {}
  }, [dealId]);

  useEffect(() => {
    if (deal && (deal.deal_type === 'music' || deal.deal_type === 'talent_and_music')) {
      fetchMusicLicenses();
    }
  }, [deal?.deal_type, fetchMusicLicenses]);

  // -----------------------------------------------------------------------
  // Sync status (used by Overview + Documents)
  // -----------------------------------------------------------------------
  const fetchSync = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}/sync`);
      if (!res.ok) return;
      const json = await res.json();
      setSyncStatus(json);
    } catch {
      // non-critical
    }
  }, [dealId]);

  // -----------------------------------------------------------------------
  // Lazy tab data fetchers
  // -----------------------------------------------------------------------
  const fetchShortlist = useCallback(async () => {
    setShortlistLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/shortlist`);
      if (!res.ok) throw new Error('Failed to fetch shortlist');
      const json = await res.json();
      setShortlist(json.data || []);
    } catch {
      setShortlist([]);
    } finally {
      setShortlistLoading(false);
    }
  }, [dealId]);

  const fetchDocuments = useCallback(async () => {
    setDocumentsLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/documents`);
      if (!res.ok) throw new Error('Failed to fetch documents');
      const json = await res.json();
      setDocuments(json);
    } catch {
      setDocuments(null);
    } finally {
      setDocumentsLoading(false);
    }
  }, [dealId]);

  const fetchTimeline = useCallback(async () => {
    setTimelineLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/timeline`);
      if (!res.ok) throw new Error('Failed to fetch timeline');
      const json = await res.json();
      setTimeline(json.data || []);
    } catch {
      setTimeline([]);
    } finally {
      setTimelineLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    if (activeTab === 'Overview') fetchSync();
    if (activeTab === 'Shortlist') fetchShortlist();
    if (activeTab === 'Documents') {
      fetchDocuments();
      fetchSync();
    }
    if (activeTab === 'Timeline') fetchTimeline();
  }, [activeTab, fetchShortlist, fetchDocuments, fetchTimeline, fetchSync]);

  // -----------------------------------------------------------------------
  // Status change
  // -----------------------------------------------------------------------
  const handleStatusChange = async (newStatus: string, extra?: Record<string, string>) => {
    if (!deal || newStatus === deal.status) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...extra }),
      });
      const json = await res.json();

      if (!res.ok) {
        // Check for gate enforcement error
        if (json.gate) {
          setGateModal({
            gate: json.gate,
            targetStatus: newStatus,
            message: json.error,
          });
          return;
        }
        throw new Error(json.error || 'Failed to update status');
      }

      if (json.data) {
        setDeal(json.data);
      } else {
        setDeal((prev) => (prev ? { ...prev, status: newStatus } : prev));
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleGateApproval = async () => {
    if (!gateModal) return;
    if (gateModal.gate === 'approval_to_engage') {
      if (!approvalBy.trim()) {
        alert('Please enter who approved.');
        return;
      }
      setGateModal(null);
      setApprovalBy('');
      setApprovalNotes('');
      await handleStatusChange(gateModal.targetStatus, {
        approval_by: approvalBy.trim(),
        approval_notes: approvalNotes.trim(),
      });
      await fetchDeal();
    } else {
      // For offer_acceptance / contract_execution, just close and switch to Admin tab
      setGateModal(null);
      setActiveTab('Admin');
    }
  };

  // -----------------------------------------------------------------------
  // Update deal fields (inline editing)
  // -----------------------------------------------------------------------
  const handleDealUpdate = useCallback(async (updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to save');
      const json = await res.json();
      if (json.data) {
        setDeal(json.data);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error saving field');
    }
  }, [dealId]);

  // -----------------------------------------------------------------------
  // Deal type change
  // -----------------------------------------------------------------------
  const handleDealTypeChange = useCallback(async (newType: string) => {
    if (!deal || newType === deal.deal_type) return;
    const updates: Record<string, unknown> = { deal_type: newType };

    const TERMINAL = ['complete', 'archived', 'dead'];
    const talentOnly = TALENT_STATUSES.filter(s => !TERMINAL.includes(s) && !MUSIC_STATUSES.includes(s as any));
    const musicOnly = MUSIC_STATUSES.filter(s => !TERMINAL.includes(s) && !TALENT_STATUSES.includes(s as any));

    // Reset status if incompatible with new pipeline
    if (newType === 'music' && talentOnly.includes(deal.status as any)) {
      updates.status = 'music_brief';
    } else if ((newType === 'talent' || newType === 'talent_and_music') && musicOnly.includes(deal.status as any)) {
      updates.status = 'creative_brief';
    }

    // Manage music_status for dual-pipeline
    if (newType === 'talent_and_music' && !deal.music_status) {
      updates.music_status = 'music_brief';
    } else if (newType !== 'talent_and_music') {
      updates.music_status = null;
    }

    await handleDealUpdate(updates);
    // Reset to Overview tab since available tabs change with deal type
    setActiveTab('Overview');
  }, [deal, handleDealUpdate]);

  // -----------------------------------------------------------------------
  // Loading / Error
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 text-lg">Loading deal...</div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || 'Deal not found'}</p>
          <button
            onClick={() => router.push('/deals')}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Back to Deals
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <button
          onClick={() => router.push('/deals')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Deals
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{deal.deal_name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {deal.campaign_name && (
                <p className="text-sm text-gray-500">{deal.campaign_name}</p>
              )}
              {deal.client_name && deal.client_id && (
                <span className="text-sm text-gray-400">
                  {deal.campaign_name ? '| ' : ''}
                  <ContactPopover entityType="client" entityId={deal.client_id} displayName={deal.client_name} linkHref={`/clients/${deal.client_id}`} />
                </span>
              )}
              {deal.talent_name && deal.talent_id && (
                <span className="text-sm text-gray-400">
                  | Talent: <ContactPopover entityType="talent" entityId={deal.talent_id} displayName={deal.talent_name} linkHref={`/talent/${deal.talent_id}`} />
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              {/* Duplicate Button */}
              <button
                onClick={async () => {
                  if (!confirm('Duplicate this deal? A new deal will be created with the same terms but reset status.')) return;
                  try {
                    const res = await fetch(`/api/deals/${dealId}/duplicate`, { method: 'POST' });
                    if (res.ok) {
                      const json = await res.json();
                      router.push(`/deals/${json.data.id}`);
                    } else {
                      alert('Failed to duplicate deal');
                    }
                  } catch { alert('Failed to duplicate deal'); }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition-colors"
                title="Duplicate this deal"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Duplicate
              </button>
              {/* Save as Template Button */}
              <button
                onClick={() => setShowTemplateModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                title="Save as template"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
                Template
              </button>
              {/* Export Button */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  title="Export document"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {exporting ? 'Exporting...' : 'Export'}
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                    <button
                      onClick={async () => {
                        setShowExportMenu(false);
                        setExporting(true);
                        try {
                          const res = await fetch(`/api/deals/${dealId}/documents/generate`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'offer_sheet', aiPolish: false }),
                          });
                          if (res.ok) {
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${deal.deal_name}_Offer_Sheet.docx`;
                            a.click();
                            URL.revokeObjectURL(url);
                          } else { alert('Export failed'); }
                        } catch { alert('Export failed'); }
                        setExporting(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Offer Sheet (.docx)
                    </button>
                    <button
                      onClick={async () => {
                        setShowExportMenu(false);
                        setExporting(true);
                        try {
                          const res = await fetch(`/api/deals/${dealId}/documents/generate`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'long_form', aiPolish: false }),
                          });
                          if (res.ok) {
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${deal.deal_name}_Long_Form.docx`;
                            a.click();
                            URL.revokeObjectURL(url);
                          } else { alert('Export failed'); }
                        } catch { alert('Export failed'); }
                        setExporting(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Long Form (.docx)
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={async () => {
                        setShowExportMenu(false);
                        setExporting(true);
                        try {
                          const res = await fetch(`/api/deals/${dealId}/documents/generate`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'offer_sheet', aiPolish: true }),
                          });
                          if (res.ok) {
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${deal.deal_name}_Offer_Sheet_AI.docx`;
                            a.click();
                            URL.revokeObjectURL(url);
                          } else { alert('Export failed'); }
                        } catch { alert('Export failed'); }
                        setExporting(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      ✨ AI-Enhanced Offer Sheet
                    </button>
                    <button
                      onClick={async () => {
                        setShowExportMenu(false);
                        setExporting(true);
                        try {
                          const res = await fetch(`/api/deals/${dealId}/documents/generate`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'long_form', aiPolish: true }),
                          });
                          if (res.ok) {
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${deal.deal_name}_Long_Form_AI.docx`;
                            a.click();
                            URL.revokeObjectURL(url);
                          } else { alert('Export failed'); }
                        } catch { alert('Export failed'); }
                        setExporting(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      ✨ AI-Enhanced Long Form
                    </button>
                  </div>
                )}
              </div>
              {/* Deal Type Selector */}
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                {(['talent', 'music', 'talent_and_music'] as const).map((dt) => (
                  <button
                    key={dt}
                    onClick={() => handleDealTypeChange(dt)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      deal.deal_type === dt
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {dt === 'talent' ? 'Talent' : dt === 'music' ? 'Music' : 'Both'}
                  </button>
                ))}
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusColor(deal.status)}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[deal.status] || 'bg-gray-400'}`} />
                {snakeToTitle(deal.status)}
              </span>
              <select
                key={deal.status + deal.updated_at}
                value={deal.status}
                disabled={statusUpdating}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-50"
              >
                {(deal.deal_type === 'music' ? MUSIC_STATUSES : TALENT_STATUSES).map((s) => (
                  <option key={s} value={s}>
                    {snakeToTitle(s)}
                  </option>
                ))}
              </select>
            </div>

            {/* Secondary Music Status for "Both" deals */}
            {deal.deal_type === 'talent_and_music' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-purple-600 font-medium">Music Pipeline:</span>
                <select
                  value={deal.music_status || 'music_brief'}
                  onChange={(e) => handleDealUpdate({ music_status: e.target.value })}
                  className="text-xs border border-purple-200 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none"
                >
                  {MUSIC_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {snakeToTitle(s)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-6 border-t border-gray-100 pt-3 overflow-x-auto">
          {(deal.deal_type === 'music' ? MUSIC_TABS : deal.deal_type === 'talent_and_music' ? BOTH_TABS : TALENT_TABS).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {activeTab === 'Overview' && <OverviewTab deal={deal} syncStatus={syncStatus} musicLicenses={musicLicenses} onDealUpdate={handleDealUpdate} />}
        {activeTab === 'Shortlist' && (
          <ShortlistTab
            entries={shortlist}
            loading={shortlistLoading}
            dealId={dealId}
            onRefresh={fetchShortlist}
            onDealRefresh={fetchDeal}
          />
        )}
        {activeTab === 'Documents' && (
          <DocumentsTab
            documents={documents}
            loading={documentsLoading}
            syncStatus={syncStatus}
            dealId={dealId}
            deal={deal}
            onRefresh={fetchDocuments}
            onDealRefresh={fetchDeal}
          />
        )}
        {activeTab === 'Admin' && (
          <AdminTab deal={deal} dealId={dealId} onDealRefresh={fetchDeal} />
        )}
        {activeTab === 'Fulfillment' && (
          <FulfillmentTab deal={deal} dealId={dealId} onDealRefresh={fetchDeal} />
        )}
        {activeTab === 'Song Pitchlist' && (
          <SongPitchlistTab dealId={dealId} deal={deal} onDealRefresh={fetchDeal} />
        )}
        {activeTab === 'Music Licenses' && (
          <MusicLicensesTab dealId={dealId} deal={deal} />
        )}
        {activeTab === 'Timeline' && (
          <TimelineTab
            entries={timeline}
            loading={timelineLoading}
            dealId={dealId}
            onRefresh={fetchTimeline}
          />
        )}
        {activeTab === 'Tasks' && (
          <DealTasksPanel dealId={dealId} />
        )}
        {activeTab === 'Notes' && (
          <DealNotesPanel dealId={dealId} />
        )}
      </div>

      {/* Stage Gate Modal */}
      {gateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Approval Required</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-700">{gateModal.message}</p>

              {gateModal.gate === 'approval_to_engage' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Approved By *</label>
                    <input
                      type="text"
                      value={approvalBy}
                      onChange={(e) => setApprovalBy(e.target.value)}
                      placeholder="e.g. Sarah Johnson (VP, Marketing)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                    <textarea
                      rows={2}
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Any notes about the approval..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                </>
              )}

              {gateModal.gate === 'offer_acceptance' && (
                <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
                  Go to the <strong>Admin</strong> tab and click &quot;Mark Offer Accepted&quot; first.
                </p>
              )}

              {gateModal.gate === 'contract_execution' && (
                <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
                  Go to the <strong>Admin</strong> tab and click &quot;Mark Contract Executed&quot; first.
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setGateModal(null);
                  setApprovalBy('');
                  setApprovalNotes('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {gateModal.gate === 'approval_to_engage' ? 'Cancel' : 'Dismiss'}
              </button>
              {gateModal.gate === 'approval_to_engage' && (
                <button
                  onClick={handleGateApproval}
                  disabled={!approvalBy.trim()}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Grant Approval & Advance
                </button>
              )}
              {(gateModal.gate === 'offer_acceptance' || gateModal.gate === 'contract_execution') && (
                <button
                  onClick={handleGateApproval}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Go to Admin Tab
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save as Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Save as Template</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Save the terms from this deal as a reusable template for future deals.
            </p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!templateName.trim()) return;
              setTemplateSaving(true);
              try {
                const res = await fetch(`/api/templates/from-deal/${dealId}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: templateName.trim(), description: templateDesc.trim() || undefined }),
                });
                if (res.ok) {
                  setShowTemplateModal(false);
                  setTemplateName('');
                  setTemplateDesc('');
                  alert('Template saved successfully!');
                } else {
                  const json = await res.json();
                  alert(json.error || 'Failed to save template');
                }
              } catch { alert('Failed to save template'); }
              setTemplateSaving(false);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Standard Celebrity Endorsement"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  placeholder="Brief description of when to use this template..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowTemplateModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={templateSaving || !templateName.trim()} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {templateSaving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Section Card helper
// ===========================================================================

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">{title}</h3>
      {children}
    </div>
  );
}

// Section group with colored left border for "Both" deal type organization
function SectionGroup({ label, color, children }: { label: string; color: 'blue' | 'purple'; children: React.ReactNode }) {
  const borderColor = color === 'blue' ? 'border-blue-400' : 'border-purple-400';
  const badgeBg = color === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';

  return (
    <div className={`md:col-span-2 border-l-4 ${borderColor} pl-4 space-y-4`}>
      <div className="flex items-center gap-2 pt-1">
        <span className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${badgeBg}`}>
          {label}
        </span>
        <div className="flex-1 border-t border-gray-200" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {children}
      </div>
    </div>
  );
}

// Read-only field (for timestamps, versions, etc.)
function ReadOnlyField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2 flex justify-between items-start gap-4 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value ?? '--'}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable Field — click to edit, Enter/blur to save, Escape to cancel
// ---------------------------------------------------------------------------
function EditableField({
  label,
  value,
  displayValue,
  fieldKey,
  type = 'text',
  onSave,
}: {
  label: string;
  value: string | number | null;
  displayValue?: string;
  fieldKey: string;
  type?: 'text' | 'number' | 'date' | 'textarea';
  onSave: (key: string, val: string | number | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));
  const [saving, setSaving] = useState(false);

  const display = displayValue ?? (value != null && value !== '' ? String(value) : null);

  const handleSave = async () => {
    setSaving(true);
    let parsed: string | number | null = draft.trim() || null;
    if (type === 'number' && parsed !== null) {
      parsed = Number(parsed);
      if (isNaN(parsed)) parsed = null;
    }
    try {
      await onSave(fieldKey, parsed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setDraft(String(value ?? ''));
      setEditing(false);
    }
  };

  if (editing) {
    const inputClass = 'w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900';
    return (
      <div className="py-2 border-b border-gray-50 last:border-0">
        <span className="text-xs font-medium text-gray-500 block mb-1">{label}</span>
        {type === 'textarea' ? (
          <textarea
            rows={2}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            disabled={saving}
            className={inputClass + ' resize-none'}
          />
        ) : (
          <input
            type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            disabled={saving}
            className={inputClass}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="py-2 flex justify-between items-start gap-4 border-b border-gray-50 last:border-0 group cursor-pointer hover:bg-indigo-50/40 rounded -mx-2 px-2 transition-colors"
      onClick={() => {
        setDraft(String(value ?? ''));
        setEditing(true);
      }}
    >
      <span className="text-xs font-medium text-gray-500 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`text-sm text-right ${display ? 'text-gray-900' : 'text-gray-300 italic'}`}>
          {display || 'click to edit'}
        </span>
        <svg className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable Boolean — click to toggle, saves immediately
// ---------------------------------------------------------------------------
function EditableBoolField({
  label,
  value,
  fieldKey,
  onSave,
}: {
  label: string;
  value: boolean;
  fieldKey: string;
  onSave: (key: string, val: boolean) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    setSaving(true);
    try {
      await onSave(fieldKey, !value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="py-2 flex justify-between items-center gap-4 border-b border-gray-50 last:border-0 group cursor-pointer hover:bg-indigo-50/40 rounded -mx-2 px-2 transition-colors"
      onClick={saving ? undefined : toggle}
    >
      <span className="text-xs font-medium text-gray-500 shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={saving}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            value ? 'bg-indigo-600' : 'bg-gray-200'
          } ${saving ? 'opacity-50' : ''}`}
          onClick={(e) => { e.stopPropagation(); if (!saving) toggle(); }}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              value ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${value ? 'text-green-700' : 'text-gray-400'}`}>
          {value ? 'Yes' : 'No'}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable Select — click to choose from options
// ---------------------------------------------------------------------------
function EditableSelectField({
  label,
  value,
  fieldKey,
  options,
  onSave,
}: {
  label: string;
  value: string | null;
  fieldKey: string;
  options: { value: string; label: string }[];
  onSave: (key: string, val: string | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = async (newVal: string) => {
    setSaving(true);
    try {
      await onSave(fieldKey, newVal || null);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="py-2 border-b border-gray-50 last:border-0">
        <span className="text-xs font-medium text-gray-500 block mb-1">{label}</span>
        <select
          autoFocus
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => { if (!saving) setEditing(false); }}
          disabled={saving}
          className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
        >
          <option value="">-- None --</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  const displayLabel = options.find((o) => o.value === value)?.label || value;

  return (
    <div
      className="py-2 flex justify-between items-start gap-4 border-b border-gray-50 last:border-0 group cursor-pointer hover:bg-indigo-50/40 rounded -mx-2 px-2 transition-colors"
      onClick={() => setEditing(true)}
    >
      <span className="text-xs font-medium text-gray-500 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`text-sm text-right ${displayLabel ? 'text-gray-900' : 'text-gray-300 italic'}`}>
          {displayLabel || 'click to select'}
        </span>
        <svg className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Smart Term Duration — preset buttons, auto-calculate end date
// ---------------------------------------------------------------------------
const TERM_PRESETS = [
  { label: '3 Months', value: '3 months', months: 3, weeks: 13 },
  { label: '6 Months', value: '6 months', months: 6, weeks: 26 },
  { label: '1 Year', value: '1 year', months: 12, weeks: 52 },
];

function addDuration(startDate: string, duration: string): string | null {
  if (!startDate || !duration) return null;
  const d = new Date(startDate + 'T00:00:00');
  if (isNaN(d.getTime())) return null;

  // Parse "N months", "N month", "N year(s)", "N weeks", "N week"
  const lower = duration.toLowerCase().trim();
  const match = lower.match(/^(\d+)\s*(month|months|year|years|week|weeks)$/);
  if (!match) return null;

  const n = parseInt(match[1], 10);
  const unit = match[2];

  if (unit.startsWith('month')) {
    const expectedMonth = (d.getMonth() + n) % 12;
    d.setMonth(d.getMonth() + n);
    // Clamp overflow (e.g., Jan 31 + 1 month → Mar 3 → clamp to Feb 28)
    if (d.getMonth() !== expectedMonth) d.setDate(0);
  } else if (unit.startsWith('year')) {
    const expectedMonth = d.getMonth();
    d.setFullYear(d.getFullYear() + n);
    // Clamp overflow (e.g., Feb 29 + 1 year on non-leap → Mar 1 → clamp to Feb 28)
    if (d.getMonth() !== expectedMonth) d.setDate(0);
  } else if (unit.startsWith('week')) {
    d.setDate(d.getDate() + n * 7);
  }

  return d.toISOString().split('T')[0];
}

function TermDurationSection({
  deal,
  onDealUpdate,
}: {
  deal: Deal;
  onDealUpdate: (updates: Record<string, unknown>) => Promise<void>;
}) {
  const [customWeeks, setCustomWeeks] = useState('');
  const [editingStart, setEditingStart] = useState(false);
  const [editingEnd, setEditingEnd] = useState(false);
  const [startDraft, setStartDraft] = useState(deal.term_start_date ?? '');
  const [endDraft, setEndDraft] = useState(deal.term_end_date ?? '');
  const [saving, setSaving] = useState(false);

  // Sync drafts when deal prop changes
  useEffect(() => {
    setStartDraft(deal.term_start_date ?? '');
    setEndDraft(deal.term_end_date ?? '');
  }, [deal.term_start_date, deal.term_end_date]);

  // Determine which preset is active
  const activeDuration = deal.term_duration?.toLowerCase().trim() ?? '';

  const handlePresetClick = async (preset: typeof TERM_PRESETS[number]) => {
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        term_duration: preset.value,
        term_duration_weeks: preset.weeks,
      };
      // Auto-calculate end date if we have a start date
      if (deal.term_start_date) {
        const endDate = addDuration(deal.term_start_date, preset.value);
        if (endDate) {
          updates.term_end_date = endDate;
          setEndDraft(endDate);
        }
      }
      await onDealUpdate(updates);
    } finally {
      setSaving(false);
    }
  };

  const handleCustomWeeks = async () => {
    const n = parseInt(customWeeks, 10);
    if (!n || n <= 0) return;
    setSaving(true);
    try {
      const durationLabel = `${n} week${n === 1 ? '' : 's'}`;
      const updates: Record<string, unknown> = {
        term_duration: durationLabel,
        term_duration_weeks: n,
      };
      if (deal.term_start_date) {
        const endDate = addDuration(deal.term_start_date, durationLabel);
        if (endDate) {
          updates.term_end_date = endDate;
          setEndDraft(endDate);
        }
      }
      await onDealUpdate(updates);
      setCustomWeeks('');
    } finally {
      setSaving(false);
    }
  };

  const handleStartDateSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, unknown> = { term_start_date: startDraft || null };
      // If we have a duration and the new start date, recalculate end
      if (startDraft && deal.term_duration) {
        const endDate = addDuration(startDraft, deal.term_duration);
        if (endDate) {
          updates.term_end_date = endDate;
          setEndDraft(endDate);
        }
      }
      await onDealUpdate(updates);
    } finally {
      setSaving(false);
      setEditingStart(false);
    }
  };

  const handleEndDateSave = async () => {
    setSaving(true);
    try {
      await onDealUpdate({ term_end_date: endDraft || null });
    } finally {
      setSaving(false);
      setEditingEnd(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    try {
      const dt = new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <div className="py-2 border-b border-gray-50 last:border-0">
      {/* Duration label + presets */}
      <span className="text-xs font-medium text-gray-500 block mb-1.5">Term Duration</span>
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {TERM_PRESETS.map((p) => {
          const isActive = activeDuration === p.value;
          return (
            <button
              key={p.value}
              type="button"
              disabled={saving}
              onClick={() => handlePresetClick(p)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
              } ${saving ? 'opacity-50 cursor-wait' : ''}`}
            >
              {p.label}
            </button>
          );
        })}
        {/* Custom weeks input */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="1"
            placeholder="# wks"
            value={customWeeks}
            onChange={(e) => setCustomWeeks(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCustomWeeks(); }}
            className="w-16 px-2 py-1 text-xs border border-gray-200 rounded-full focus:ring-1 focus:ring-indigo-500 outline-none text-center"
          />
          {customWeeks && (
            <button
              type="button"
              disabled={saving}
              onClick={handleCustomWeeks}
              className="px-2 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Set
            </button>
          )}
        </div>
      </div>

      {/* Show current duration if custom (not a preset) */}
      {deal.term_duration && !TERM_PRESETS.some(p => p.value === activeDuration) && (
        <div className="text-xs text-indigo-600 font-medium mb-2 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {deal.term_duration}
        </div>
      )}

      {/* Start Date */}
      <div className="flex items-center gap-3 mb-1.5">
        <span className="text-xs text-gray-500 w-16 shrink-0">Start</span>
        {editingStart ? (
          <div className="flex items-center gap-1.5 flex-1">
            <input
              type="date"
              autoFocus
              value={startDraft}
              onChange={(e) => setStartDraft(e.target.value)}
              onBlur={handleStartDateSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleStartDateSave();
                if (e.key === 'Escape') { setStartDraft(deal.term_start_date ?? ''); setEditingStart(false); }
              }}
              disabled={saving}
              className="flex-1 px-2 py-1 text-xs border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        ) : (
          <div
            className="flex-1 flex items-center gap-1 cursor-pointer group/date hover:bg-indigo-50/40 rounded px-1.5 py-1 -mx-1.5 transition-colors"
            onClick={() => { setStartDraft(deal.term_start_date ?? ''); setEditingStart(true); }}
          >
            <span className={`text-xs ${deal.term_start_date ? 'text-gray-900' : 'text-gray-300 italic'}`}>
              {formatDate(deal.term_start_date) || 'Set start date'}
            </span>
            <svg className="w-2.5 h-2.5 text-gray-300 opacity-0 group-hover/date:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="10" height="10">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        )}
      </div>

      {/* End Date */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-16 shrink-0">End</span>
        {editingEnd ? (
          <div className="flex items-center gap-1.5 flex-1">
            <input
              type="date"
              autoFocus
              value={endDraft}
              onChange={(e) => setEndDraft(e.target.value)}
              onBlur={handleEndDateSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEndDateSave();
                if (e.key === 'Escape') { setEndDraft(deal.term_end_date ?? ''); setEditingEnd(false); }
              }}
              disabled={saving}
              className="flex-1 px-2 py-1 text-xs border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        ) : (
          <div
            className="flex-1 flex items-center gap-1 cursor-pointer group/date hover:bg-indigo-50/40 rounded px-1.5 py-1 -mx-1.5 transition-colors"
            onClick={() => { setEndDraft(deal.term_end_date ?? ''); setEditingEnd(true); }}
          >
            <span className={`text-xs ${deal.term_end_date ? 'text-gray-900' : 'text-gray-300 italic'}`}>
              {formatDate(deal.term_end_date) || 'Set end date'}
            </span>
            {deal.term_end_date && deal.term_start_date && deal.term_duration && (
              <span className="text-[10px] text-indigo-500 ml-1">(auto-calculated)</span>
            )}
            <svg className="w-2.5 h-2.5 text-gray-300 opacity-0 group-hover/date:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="10" height="10">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// US States for governing law
// ===========================================================================

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida',
  'Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine',
  'Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska',
  'Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota',
  'Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming',
];

// ===========================================================================
// Overview Tab
// ===========================================================================

// ===========================================================================
// Materials Section (within Overview)
// ===========================================================================

const VIDEO_LENGTH_OPTIONS = [':05', ':06', ':10', ':15', ':30', ':60', ':90', ':120', ':180'];

const SPOT_TYPES = ['Hero Film', 'BTS Video', 'Social Video', 'Product Video', 'Other'] as const;

const MEDIA_TYPES = [
  'TV / Broadcast',
  'Radio',
  'Digital Video',
  'Streaming / OTT',
  'Social Media',
  'Online / Web',
  'Theatrical / Cinema',
  'Out of Home (OOH)',
  'Podcast',
  'In-Store / POS',
  'Industrial / Internal',
  'All Media',
];

function MaterialsSection({
  deal,
  onDealUpdate,
}: {
  deal: Deal;
  onDealUpdate: (updates: Record<string, unknown>) => Promise<void>;
}) {
  const [stillsCount, setStillsCount] = useState<string>(
    deal.materials_stills_count != null ? String(deal.materials_stills_count) : ''
  );
  const [videos, setVideos] = useState<{ count: string; length: string }[]>(
    (deal.materials_videos && deal.materials_videos.length > 0)
      ? deal.materials_videos.map((v) => ({ count: String(v.count), length: v.length }))
      : []
  );
  const [editsVersions, setEditsVersions] = useState(deal.materials_edits_versions ?? true);
  const [alternateAssets, setAlternateAssets] = useState(deal.materials_alternate_assets || '');
  const [editingAlternate, setEditingAlternate] = useState(false);

  // Sync local state when deal prop changes
  useEffect(() => {
    setStillsCount(deal.materials_stills_count != null ? String(deal.materials_stills_count) : '');
    setVideos(
      (deal.materials_videos && deal.materials_videos.length > 0)
        ? deal.materials_videos.map((v) => ({ count: String(v.count), length: v.length }))
        : []
    );
    setEditsVersions(deal.materials_edits_versions ?? true);
    setAlternateAssets(deal.materials_alternate_assets || '');
  }, [deal.materials_stills_count, deal.materials_videos, deal.materials_edits_versions, deal.materials_alternate_assets]);

  // Persist stills
  const saveStills = async (val: string) => {
    const num = val.trim() === '' ? null : Number(val);
    await onDealUpdate({ materials_stills_count: num });
  };

  // Persist videos array
  const saveVideos = async (updated: { count: string; length: string }[]) => {
    const parsed = updated
      .filter((v) => v.count.trim() !== '' && v.length.trim() !== '')
      .map((v) => ({ count: Number(v.count), length: v.length }));
    await onDealUpdate({ materials_videos: parsed });
  };

  // Persist edits/versions toggle
  const saveEditsVersions = async (val: boolean) => {
    setEditsVersions(val);
    await onDealUpdate({ materials_edits_versions: val });
  };

  // Persist alternate assets
  const saveAlternateAssets = async () => {
    setEditingAlternate(false);
    await onDealUpdate({ materials_alternate_assets: alternateAssets || null });
  };

  const addVideoRow = () => {
    setVideos((prev) => [...prev, { count: '', length: ':30' }]);
  };

  const updateVideoRow = (index: number, field: 'count' | 'length', value: string) => {
    setVideos((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeVideoRow = (index: number) => {
    setVideos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      saveVideos(next);
      return next;
    });
  };

  // Build summary text
  const summaryParts: string[] = [];
  if (deal.materials_stills_count) {
    summaryParts.push(`up to ${deal.materials_stills_count} still${deal.materials_stills_count !== 1 ? 's' : ''}`);
  }
  if (deal.materials_videos && deal.materials_videos.length > 0) {
    const videoParts = deal.materials_videos.map(
      (v) => `${v.count} ${v.length} video${v.count !== 1 ? 's' : ''}`
    );
    summaryParts.push(videoParts.join(', '));
  }
  if (summaryParts.length > 0 && deal.materials_edits_versions) {
    summaryParts.push('including edits, versions, cutdowns and lifts');
  }
  const summaryText = summaryParts.length > 0
    ? `Up to ${summaryParts.join(' and ')}.`
    : null;

  return (
    <div className="space-y-4">
      {/* Summary line */}
      {summaryText && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
          <p className="text-xs text-indigo-700 italic">{summaryText}</p>
        </div>
      )}

      {/* Stills */}
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Stills</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Up to</span>
          <input
            type="number"
            min="0"
            value={stillsCount}
            onChange={(e) => setStillsCount(e.target.value)}
            onBlur={() => saveStills(stillsCount)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveStills(stillsCount); }}
            className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="#"
          />
          <span className="text-sm text-gray-600">still(s)</span>
        </div>
      </div>

      {/* Videos */}
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Videos</label>
        {videos.length > 0 && (
          <div className="space-y-2 mb-2">
            {videos.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 whitespace-nowrap">Up to</span>
                <input
                  type="number"
                  min="0"
                  value={row.count}
                  onChange={(e) => updateVideoRow(i, 'count', e.target.value)}
                  onBlur={() => saveVideos(videos)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveVideos(videos); }}
                  className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="#"
                />
                <select
                  value={row.length}
                  onChange={(e) => {
                    updateVideoRow(i, 'length', e.target.value);
                    const next = [...videos];
                    next[i] = { ...next[i], length: e.target.value };
                    saveVideos(next);
                  }}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {VIDEO_LENGTH_OPTIONS.map((len) => (
                    <option key={len} value={len}>{len}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-600">video(s)</span>
                <button
                  type="button"
                  onClick={() => removeVideoRow(i)}
                  className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={addVideoRow}
          className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Video Format
        </button>
      </div>

      {/* Edits, Versions, Cutdowns & Lifts */}
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Includes Edits, Versions, Cutdowns & Lifts
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => saveEditsVersions(!editsVersions)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              editsVersions ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                editsVersions ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${editsVersions ? 'text-indigo-700' : 'text-gray-500'}`}>
            {editsVersions ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {/* Alternate Assets / Layouts */}
      <div className="group">
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Alternate Assets / Layouts
        </label>
        {editingAlternate ? (
          <textarea
            autoFocus
            rows={3}
            value={alternateAssets}
            onChange={(e) => setAlternateAssets(e.target.value)}
            onBlur={saveAlternateAssets}
            onKeyDown={(e) => { if (e.key === 'Escape') { setEditingAlternate(false); } }}
            className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="e.g. banner ads, social cutdowns, OOH layouts..."
          />
        ) : (
          <p
            onClick={() => setEditingAlternate(true)}
            className="text-sm text-gray-900 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 flex items-center gap-2 min-h-[28px]"
          >
            {alternateAssets || <span className="text-gray-300 italic">Click to add</span>}
            <svg className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Music Materials — spots (count + length) and media/medium checkboxes
// ---------------------------------------------------------------------------
function MusicMaterialsSection({
  deal,
  onDealUpdate,
}: {
  deal: Deal;
  onDealUpdate: (updates: Record<string, unknown>) => Promise<void>;
}) {
  // Spot type + count + length
  const [spots, setSpots] = useState<{ type: string; count: string; length: string }[]>(
    (deal.materials_videos && deal.materials_videos.length > 0)
      ? deal.materials_videos.map((v: any) => ({ type: v.type || 'Hero Film', count: String(v.count), length: v.length }))
      : []
  );
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(
    new Set(Array.isArray(deal.media) ? deal.media : [])
  );
  const [editsVersions, setEditsVersions] = useState(deal.materials_edits_versions ?? true);
  const [alternateAssets, setAlternateAssets] = useState(deal.materials_alternate_assets || '');
  const [editingAlternate, setEditingAlternate] = useState(false);

  // Custom usage description (editable text block)
  const [usageDescription, setUsageDescription] = useState(deal.usage_description || '');
  const [editingUsage, setEditingUsage] = useState(false);

  // Sync local state when deal prop changes
  useEffect(() => {
    setSpots(
      (deal.materials_videos && deal.materials_videos.length > 0)
        ? deal.materials_videos.map((v: any) => ({ type: v.type || 'Hero Film', count: String(v.count), length: v.length }))
        : []
    );
    setSelectedMedia(new Set(Array.isArray(deal.media) ? deal.media : []));
    setEditsVersions(deal.materials_edits_versions ?? true);
    setAlternateAssets(deal.materials_alternate_assets || '');
    setUsageDescription(deal.usage_description || '');
  }, [deal.materials_videos, deal.media, deal.materials_edits_versions, deal.materials_alternate_assets, deal.usage_description]);

  // Helper: Generate natural language from chips (for preview/default)
  const generateUsageText = (mediaSet: Set<string>, spotsList: { type: string; count: string; length: string }[], includeEdits: boolean): string => {
    const parts: string[] = [];

    // Spots summary
    if (spotsList.length > 0) {
      const spotParts = spotsList
        .filter((s) => s.count.trim() !== '')
        .map((s) => `${s.count} × ${s.length} ${s.type}`);
      if (spotParts.length > 0) {
        parts.push(`Up to ${spotParts.join(', ')}`);
      }
    }

    // Media types - format as natural English
    const mediaArr = Array.from(mediaSet).filter((m) => m !== 'All Media');
    if (mediaSet.has('All Media')) {
      parts.push('across all media');
    } else if (mediaArr.length > 0) {
      // Replace slashes with proper names for readability
      const cleanMedia = mediaArr.map((m) => {
        if (m === 'TV / Broadcast') return 'Television and Broadcast';
        if (m === 'Streaming / OTT') return 'Streaming and OTT';
        if (m === 'Out of Home (OOH)') return 'Out of Home';
        if (m === 'In-Store / POS') return 'In-Store and Point of Sale';
        if (m === 'Industrial / Internal') return 'Industrial and Internal Use';
        return m;
      });
      if (cleanMedia.length === 1) {
        parts.push(`for ${cleanMedia[0]}`);
      } else if (cleanMedia.length === 2) {
        parts.push(`for ${cleanMedia[0]} and ${cleanMedia[1]}`);
      } else {
        const last = cleanMedia.pop();
        parts.push(`for ${cleanMedia.join(', ')}, and ${last}`);
      }
    }

    // Edits/versions
    if (includeEdits && parts.length > 0) {
      parts.push('including edits, versions, cutdowns, and lifts');
    }

    return parts.length > 0 ? parts.join(', ') + '.' : '';
  };

  // Persist spots
  const saveSpots = async (updated: { type: string; count: string; length: string }[]) => {
    const parsed = updated
      .filter((v) => v.count.trim() !== '' && v.length.trim() !== '')
      .map((v) => ({ type: v.type, count: Number(v.count), length: v.length }));
    await onDealUpdate({ materials_videos: parsed });
  };

  const addSpotRow = () => {
    setSpots((prev) => [...prev, { type: 'Hero Film', count: '', length: ':30' }]);
  };

  const updateSpotRow = (index: number, field: 'type' | 'count' | 'length', value: string) => {
    setSpots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeSpotRow = (index: number) => {
    setSpots((prev) => {
      const next = prev.filter((_, i) => i !== index);
      saveSpots(next);
      return next;
    });
  };

  // Persist media types
  const toggleMedia = async (mediaType: string) => {
    const next = new Set(selectedMedia);
    if (next.has(mediaType)) {
      next.delete(mediaType);
    } else {
      if (mediaType === 'All Media') {
        next.clear();
        next.add('All Media');
      } else {
        next.delete('All Media');
        next.add(mediaType);
      }
    }
    setSelectedMedia(next);
    await onDealUpdate({ media: Array.from(next) });
  };

  // Persist edits/versions toggle
  const saveEditsVersions = async (val: boolean) => {
    setEditsVersions(val);
    await onDealUpdate({ materials_edits_versions: val });
  };

  // Persist alternate assets
  const saveAlternateAssets = async () => {
    setEditingAlternate(false);
    await onDealUpdate({ materials_alternate_assets: alternateAssets || null });
  };

  // Persist custom usage description
  const saveUsageDescription = async () => {
    setEditingUsage(false);
    await onDealUpdate({ usage_description: usageDescription || null });
  };

  // Auto-generated preview (only shown when no custom text)
  const autoGeneratedText = generateUsageText(selectedMedia, spots, editsVersions);
  const displayText = usageDescription || autoGeneratedText;
  const isCustom = !!usageDescription;

  return (
    <div className="space-y-4">
      {/* Usage Description Block - Editable */}
      <div className="group">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
            Usage Description
          </label>
          {isCustom && (
            <button
              type="button"
              onClick={async () => {
                setUsageDescription('');
                await onDealUpdate({ usage_description: null });
              }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Reset to auto-generated
            </button>
          )}
        </div>
        {editingUsage ? (
          <textarea
            autoFocus
            rows={3}
            value={usageDescription || autoGeneratedText}
            onChange={(e) => setUsageDescription(e.target.value)}
            onBlur={saveUsageDescription}
            onKeyDown={(e) => { if (e.key === 'Escape') { setEditingUsage(false); } }}
            className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            placeholder="Describe the usage rights..."
          />
        ) : (
          <div
            onClick={() => {
              if (!usageDescription && autoGeneratedText) {
                setUsageDescription(autoGeneratedText);
              }
              setEditingUsage(true);
            }}
            className={`text-sm cursor-pointer hover:bg-gray-50 rounded px-3 py-2 -mx-1 border ${
              isCustom ? 'border-purple-200 bg-purple-50' : 'border-gray-100 bg-gray-50'
            } flex items-start gap-2 min-h-[60px]`}
          >
            <span className={isCustom ? 'text-gray-900' : 'text-gray-600 italic'}>
              {displayText || 'Click to add usage description...'}
            </span>
            <svg className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        )}
        {!isCustom && displayText && (
          <p className="text-xs text-gray-400 mt-1 italic">Auto-generated from selections below. Click to customize.</p>
        )}
      </div>

      {/* Spots (type + count + length) */}
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Spots</label>
        {spots.length > 0 && (
          <div className="space-y-2 mb-2">
            {spots.map((row, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap">
                <select
                  value={row.type}
                  onChange={(e) => {
                    updateSpotRow(i, 'type', e.target.value);
                    const next = [...spots];
                    next[i] = { ...next[i], type: e.target.value };
                    saveSpots(next);
                  }}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white min-w-[120px]"
                >
                  {SPOT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-600 whitespace-nowrap">up to</span>
                <input
                  type="number"
                  min="0"
                  value={row.count}
                  onChange={(e) => updateSpotRow(i, 'count', e.target.value)}
                  onBlur={() => saveSpots(spots)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveSpots(spots); }}
                  className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#"
                />
                <span className="text-sm text-gray-600">×</span>
                <select
                  value={row.length}
                  onChange={(e) => {
                    updateSpotRow(i, 'length', e.target.value);
                    const next = [...spots];
                    next[i] = { ...next[i], length: e.target.value };
                    saveSpots(next);
                  }}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  {VIDEO_LENGTH_OPTIONS.map((len) => (
                    <option key={len} value={len}>{len}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeSpotRow(i)}
                  className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={addSpotRow}
          className="inline-flex items-center text-xs font-medium text-purple-600 hover:text-purple-800 transition-colors"
        >
          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Spot
        </button>
      </div>

      {/* Media / Medium selection */}
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Medium</label>
        <div className="flex flex-wrap gap-1.5">
          {MEDIA_TYPES.map((mt) => {
            const isSelected = selectedMedia.has(mt);
            return (
              <button
                key={mt}
                type="button"
                onClick={() => toggleMedia(mt)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-all ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                }`}
              >
                {mt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Edits, Versions, Cutdowns & Lifts */}
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Includes Edits, Versions, Cutdowns & Lifts
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => saveEditsVersions(!editsVersions)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              editsVersions ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                editsVersions ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${editsVersions ? 'text-purple-700' : 'text-gray-500'}`}>
            {editsVersions ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {/* Alternate Assets / Layouts */}
      <div className="group">
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Alternate Assets / Layouts
        </label>
        {editingAlternate ? (
          <textarea
            autoFocus
            rows={3}
            value={alternateAssets}
            onChange={(e) => setAlternateAssets(e.target.value)}
            onBlur={saveAlternateAssets}
            onKeyDown={(e) => { if (e.key === 'Escape') { setEditingAlternate(false); } }}
            className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            placeholder="e.g. radio edits, social cutdowns, bumpers..."
          />
        ) : (
          <p
            onClick={() => setEditingAlternate(true)}
            className="text-sm text-gray-900 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 flex items-center gap-2 min-h-[28px]"
          >
            {alternateAssets || <span className="text-gray-300 italic">Click to add</span>}
            <svg className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </p>
        )}
      </div>
    </div>
  );
}

function OverviewTab({
  deal,
  syncStatus,
  musicLicenses,
  onDealUpdate,
}: {
  deal: Deal;
  syncStatus: SyncStatus | null;
  musicLicenses: any[];
  onDealUpdate: (updates: Record<string, unknown>) => Promise<void>;
}) {
  const saveField = async (key: string, val: unknown) => {
    await onDealUpdate({ [key]: val });
  };

  const saveBoolField = async (key: string, val: boolean) => {
    await onDealUpdate({ [key]: val });
  };

  // For JSON object fields: stringify for display, parse back on save
  const jsonDisplay = (val: unknown): string | null => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'string') return val;
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  };

  const saveJsonField = async (key: string, val: unknown) => {
    if (val === null || val === '') {
      await onDealUpdate({ [key]: null });
      return;
    }
    const str = String(val).trim();
    // Try to parse as JSON first; if it fails, store as plain string
    try {
      const parsed = JSON.parse(str);
      await onDealUpdate({ [key]: parsed });
    } catch {
      await onDealUpdate({ [key]: str });
    }
  };

  // Calculate revenue share from music licenses
  const masterLicenses = musicLicenses.filter((l) => l.side === 'master');
  const publishingLicenses = musicLicenses.filter((l) => l.side === 'publishing');
  const masterTotal = masterLicenses.reduce((sum, l) => sum + (l.fee_override ?? l.fee_amount ?? 0), 0);
  const publishingTotal = publishingLicenses.reduce((sum, l) => sum + (l.fee_override ?? l.fee_amount ?? 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Key Terms - Different for Music vs Talent deals */}
      {deal.deal_type === 'music' ? (
        <SectionCard title="Key Terms">
          <EditableField label="Fee Per Side" value={deal.fee_per_side} displayValue={formatCurrency(deal.fee_per_side, deal.fee_currency)} fieldKey="fee_per_side" type="number" onSave={saveField} />
          <EditableSelectField
            label="Fee Currency"
            value={deal.fee_currency}
            fieldKey="fee_currency"
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
              { value: 'GBP', label: 'GBP' },
              { value: 'CAD', label: 'CAD' },
            ]}
            onSave={saveField}
          />
          <EditableBoolField label="Most Favored Nation (MFN)" value={deal.fee_mfn} fieldKey="fee_mfn" onSave={saveBoolField} />
          <TermDurationSection deal={deal} onDealUpdate={onDealUpdate} />

          {/* Revenue Share - Auto-populated from Music Licenses */}
          {musicLicenses.length > 0 && (
            <div className="pt-3 border-t border-gray-100 mt-3">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Revenue Share</label>
              <div className="space-y-3">
                {masterLicenses.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase mb-1">Master ({formatCurrency(masterTotal)})</p>
                    <div className="space-y-1">
                      {masterLicenses.map((l) => (
                        <div key={l.id} className="flex justify-between text-sm">
                          <span className="text-gray-700">{l.rights_holder_name} <span className="text-gray-400">({l.share_percentage}%)</span></span>
                          <span className="font-medium text-gray-900">{formatCurrency(l.fee_override ?? l.fee_amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {publishingLicenses.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Publishing ({formatCurrency(publishingTotal)})</p>
                    <div className="space-y-1">
                      {publishingLicenses.map((l) => (
                        <div key={l.id} className="flex justify-between text-sm">
                          <span className="text-gray-700">{l.rights_holder_name} <span className="text-gray-400">({l.share_percentage}%)</span></span>
                          <span className="font-medium text-gray-900">{formatCurrency(l.fee_override ?? l.fee_amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-semibold">
                  <span className="text-gray-700">Total</span>
                  <span className="text-indigo-600">{formatCurrency(masterTotal + publishingTotal)}</span>
                </div>
              </div>
            </div>
          )}
          {musicLicenses.length === 0 && (
            <div className="pt-3 border-t border-gray-100 mt-3">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Revenue Share</label>
              <p className="text-sm text-gray-400 italic">Add licenses in the Music Licenses tab to see fee breakdown</p>
            </div>
          )}
        </SectionCard>
      ) : (
        <SectionCard title="Key Terms">
          <EditableField label="Fee Total" value={deal.fee_total} displayValue={formatCurrency(deal.fee_total, deal.fee_currency)} fieldKey="fee_total" type="number" onSave={saveField} />
          <EditableField label="Fee Structure" value={deal.fee_structure} fieldKey="fee_structure" onSave={saveField} />
          <EditableSelectField
            label="Fee Currency"
            value={deal.fee_currency}
            fieldKey="fee_currency"
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
              { value: 'GBP', label: 'GBP' },
              { value: 'CAD', label: 'CAD' },
            ]}
            onSave={saveField}
          />
          <EditableField label="Net Terms" value={deal.fee_net_terms} fieldKey="fee_net_terms" onSave={saveField} />
          <EditableBoolField label="Most Favored Nation (MFN)" value={deal.fee_mfn} fieldKey="fee_mfn" onSave={saveBoolField} />
          <EditableField label="MFN Details" value={deal.fee_mfn_details} fieldKey="fee_mfn_details" type="textarea" onSave={saveField} />
          <EditableField label="Revenue Share" value={jsonDisplay(deal.fee_revenue_share)} fieldKey="fee_revenue_share" type="textarea" onSave={saveJsonField} />
          <TermDurationSection deal={deal} onDealUpdate={onDealUpdate} />
          <EditableField label="Effective Date" value={deal.effective_date} fieldKey="effective_date" type="date" onSave={saveField} />
          <EditableField label="Start Trigger" value={deal.term_start_trigger} fieldKey="term_start_trigger" onSave={saveField} />
        </SectionCard>
      )}

      {/* --- Conditional Layout: "Both" deals get grouped sections --- */}
      {deal.deal_type === 'talent_and_music' ? (
        <>
          {/* TALENT group */}
          <SectionGroup label="Talent" color="blue">
            <SectionCard title="Services">
              <EditableField
                label="Service Days"
                value={jsonDisplay(deal.service_days?.length > 0 ? deal.service_days : null)}
                fieldKey="service_days"
                type="textarea"
                onSave={saveJsonField}
              />
              <EditableField label="Social Posts" value={jsonDisplay(deal.social_posts)} fieldKey="social_posts" type="textarea" onSave={saveJsonField} />
              <EditableField label="Media Opportunities" value={jsonDisplay(deal.media_opportunities)} fieldKey="media_opportunities" type="textarea" onSave={saveJsonField} />
              <EditableField label="Ambassador Duties" value={jsonDisplay(deal.ambassador_duties)} fieldKey="ambassador_duties" type="textarea" onSave={saveJsonField} />
            </SectionCard>

            <SectionCard title="Usage">
              <EditableField label="Permitted Usage" value={jsonDisplay(deal.permitted_usage)} fieldKey="permitted_usage" type="textarea" onSave={saveJsonField} />
              <EditableField label="Image Rights" value={jsonDisplay(deal.image_rights)} fieldKey="image_rights" type="textarea" onSave={saveJsonField} />
              <EditableField label="Approval Rights" value={jsonDisplay(deal.approval_rights)} fieldKey="approval_rights" type="textarea" onSave={saveJsonField} />
              <EditableField label="Post-Term Rules" value={deal.post_term_rules} fieldKey="post_term_rules" type="textarea" onSave={saveField} />
            </SectionCard>

            <SectionCard title="Materials">
              <MaterialsSection deal={deal} onDealUpdate={onDealUpdate} />
            </SectionCard>

            <SectionCard title="Exclusivity">
              <EditableField label="Category" value={deal.exclusivity_category} fieldKey="exclusivity_category" onSave={saveField} />
              <EditableField
                label="Brands"
                value={deal.exclusivity_brands?.length > 0 ? deal.exclusivity_brands.join(', ') : null}
                fieldKey="exclusivity_brands"
                onSave={async (key, val) => {
                  const arr = val ? String(val).split(',').map((s) => s.trim()).filter(Boolean) : [];
                  await onDealUpdate({ [key]: arr });
                }}
              />
              <EditableField label="Duration" value={deal.exclusivity_duration} fieldKey="exclusivity_duration" onSave={saveField} />
            </SectionCard>

            <SectionCard title="Travel & Production">
              <EditableField label="Travel" value={jsonDisplay(deal.travel)} fieldKey="travel" type="textarea" onSave={saveJsonField} />
              <EditableField label="Hair/Makeup/Styling" value={jsonDisplay(deal.hmu)} fieldKey="hmu" type="textarea" onSave={saveJsonField} />
              <EditableField label="Talent Criteria" value={jsonDisplay(deal.talent_criteria)} fieldKey="talent_criteria" type="textarea" onSave={saveJsonField} />
              <EditableField label="Ancillary Fees" value={deal.fee_ancillary} fieldKey="fee_ancillary" type="textarea" onSave={saveField} />
            </SectionCard>
          </SectionGroup>

          {/* MUSIC group */}
          <SectionGroup label="Music" color="purple">
            <SectionCard title="Music Licensing">
              <EditableSelectField
                label="License Type"
                value={deal.license_type}
                fieldKey="license_type"
                options={[
                  { value: '', label: 'Not Set' },
                  { value: 'master', label: 'Master' },
                  { value: 'sync', label: 'Sync' },
                  { value: 'master_and_sync', label: 'Master & Sync' },
                ]}
                onSave={saveField}
              />
              <EditableField label="Fee Per Side" value={deal.fee_per_side} displayValue={formatCurrency(deal.fee_per_side)} fieldKey="fee_per_side" type="number" onSave={saveField} />
              <EditableField label="Master Fee Override" value={deal.master_fee_override} displayValue={deal.master_fee_override != null ? formatCurrency(deal.master_fee_override) : 'MFN (same as fee/side)'} fieldKey="master_fee_override" type="number" onSave={saveField} />
              <EditableField label="Territory" value={deal.territory} fieldKey="territory" onSave={saveField} />

              {/* Materials integrated into Music Licensing */}
              <div className="pt-3 border-t border-gray-100 mt-3">
                <MusicMaterialsSection deal={deal} onDealUpdate={onDealUpdate} />
              </div>
            </SectionCard>
          </SectionGroup>
        </>
      ) : (
        <>
          {/* Flat layout for single-type deals */}
          {deal.deal_type === 'music' && (
            <SectionCard title="Music Licensing">
              <EditableSelectField
                label="License Type"
                value={deal.license_type}
                fieldKey="license_type"
                options={[
                  { value: '', label: 'Not Set' },
                  { value: 'master', label: 'Master' },
                  { value: 'sync', label: 'Sync' },
                  { value: 'master_and_sync', label: 'Master & Sync' },
                ]}
                onSave={saveField}
              />
              <EditableField label="Master Fee Override" value={deal.master_fee_override} displayValue={deal.master_fee_override != null ? formatCurrency(deal.master_fee_override) : 'MFN (same as fee/side)'} fieldKey="master_fee_override" type="number" onSave={saveField} />
              <EditableField label="Territory" value={deal.territory} fieldKey="territory" onSave={saveField} />

              {/* Materials integrated into Music Licensing */}
              <div className="pt-3 border-t border-gray-100 mt-3">
                <MusicMaterialsSection deal={deal} onDealUpdate={onDealUpdate} />
              </div>
            </SectionCard>
          )}

          {deal.deal_type === 'talent' && (
            <>
              <SectionCard title="Exclusivity">
                <EditableField label="Category" value={deal.exclusivity_category} fieldKey="exclusivity_category" onSave={saveField} />
                <EditableField
                  label="Brands"
                  value={deal.exclusivity_brands?.length > 0 ? deal.exclusivity_brands.join(', ') : null}
                  fieldKey="exclusivity_brands"
                  onSave={async (key, val) => {
                    const arr = val ? String(val).split(',').map((s) => s.trim()).filter(Boolean) : [];
                    await onDealUpdate({ [key]: arr });
                  }}
                />
                <EditableField label="Duration" value={deal.exclusivity_duration} fieldKey="exclusivity_duration" onSave={saveField} />
              </SectionCard>

              <SectionCard title="Services">
                <EditableField
                  label="Service Days"
                  value={jsonDisplay(deal.service_days?.length > 0 ? deal.service_days : null)}
                  fieldKey="service_days"
                  type="textarea"
                  onSave={saveJsonField}
                />
                <EditableField label="Social Posts" value={jsonDisplay(deal.social_posts)} fieldKey="social_posts" type="textarea" onSave={saveJsonField} />
                <EditableField label="Media Opportunities" value={jsonDisplay(deal.media_opportunities)} fieldKey="media_opportunities" type="textarea" onSave={saveJsonField} />
                <EditableField label="Ambassador Duties" value={jsonDisplay(deal.ambassador_duties)} fieldKey="ambassador_duties" type="textarea" onSave={saveJsonField} />
              </SectionCard>

              <SectionCard title="Usage">
                <EditableField label="Permitted Usage" value={jsonDisplay(deal.permitted_usage)} fieldKey="permitted_usage" type="textarea" onSave={saveJsonField} />
                <EditableField label="Image Rights" value={jsonDisplay(deal.image_rights)} fieldKey="image_rights" type="textarea" onSave={saveJsonField} />
                <EditableField label="Approval Rights" value={jsonDisplay(deal.approval_rights)} fieldKey="approval_rights" type="textarea" onSave={saveJsonField} />
                <EditableField label="Post-Term Rules" value={deal.post_term_rules} fieldKey="post_term_rules" type="textarea" onSave={saveField} />
              </SectionCard>

              <SectionCard title="Materials">
                <MaterialsSection deal={deal} onDealUpdate={onDealUpdate} />
              </SectionCard>
            </>
          )}
        </>
      )}

      {/* --- Shared sections (all deal types) --- */}

      {/* Travel & Production (talent-only flat layout) */}
      {deal.deal_type !== 'talent_and_music' && deal.deal_type !== 'music' && (
        <SectionCard title="Travel & Production">
          <EditableField label="Travel" value={jsonDisplay(deal.travel)} fieldKey="travel" type="textarea" onSave={saveJsonField} />
          <EditableField label="Hair/Makeup/Styling" value={jsonDisplay(deal.hmu)} fieldKey="hmu" type="textarea" onSave={saveJsonField} />
          <EditableField label="Talent Criteria" value={jsonDisplay(deal.talent_criteria)} fieldKey="talent_criteria" type="textarea" onSave={saveJsonField} />
          <EditableField label="Ancillary Fees" value={deal.fee_ancillary} fieldKey="fee_ancillary" type="textarea" onSave={saveField} />
        </SectionCard>
      )}

      {/* Legal */}
      <SectionCard title="Legal">
        <EditableSelectField
          label="Governing Law"
          value={deal.governing_law}
          fieldKey="governing_law"
          options={US_STATES.map((s) => ({ value: s, label: s }))}
          onSave={saveField}
        />
        <EditableBoolField label="Non-Union" value={deal.non_union} fieldKey="non_union" onSave={saveBoolField} />
        <EditableBoolField label="Confidential" value={deal.confidential} fieldKey="confidential" onSave={saveBoolField} />
        <EditableBoolField label="Morals Clause" value={deal.morals_clause} fieldKey="morals_clause" onSave={saveBoolField} />
        <EditableField label="Morals Clause Details" value={deal.morals_clause_details} fieldKey="morals_clause_details" type="textarea" onSave={saveField} />
        <EditableField label="Termination Cure Days" value={deal.termination_cure_days} fieldKey="termination_cure_days" type="number" onSave={saveField} />
        <EditableField label="Pro Rata Formula" value={deal.pro_rata_formula} fieldKey="pro_rata_formula" onSave={saveField} />
      </SectionCard>

      {/* Signatories & Notices */}
      <SectionCard title="Signatories & Notices">
        <EditableField label="Lender Entity" value={deal.lender_entity} fieldKey="lender_entity" onSave={saveField} />
        <EditableField label="Lender Address" value={deal.lender_address} fieldKey="lender_address" type="textarea" onSave={saveField} />
        <EditableField label="Company Signatory" value={deal.company_signatory} fieldKey="company_signatory" onSave={saveField} />
        <EditableField label="Talent Signatory" value={deal.talent_signatory} fieldKey="talent_signatory" onSave={saveField} />
        <EditableField label="Notice Emails" value={deal.notice_emails} fieldKey="notice_emails" onSave={saveField} />
      </SectionCard>

      {/* Document Versions & Sync */}
      <SectionCard title="Document Versions">
        <ReadOnlyField label="Offer Sheet Version" value={`v${deal.offer_sheet_version}`} />
        <ReadOnlyField label="Long Form Version" value={`v${deal.longform_version}`} />
        {syncStatus && (
          <>
            <ReadOnlyField label="Pending Changes" value={syncStatus.pendingChanges} />
            <ReadOnlyField label="Last Synced" value={syncStatus.lastSyncedAt ? formatDateTime(syncStatus.lastSyncedAt) : '--'} />
            <ReadOnlyField
              label="Discrepancies"
              value={
                syncStatus.discrepancies.length === 0 ? (
                  <span className="text-green-600 font-medium">None</span>
                ) : (
                  <span className="text-red-600 font-medium">{syncStatus.discrepancies.length} found</span>
                )
              }
            />
          </>
        )}
      </SectionCard>

      {/* Timestamps (full width) */}
      <div className="md:col-span-2">
        <SectionCard title="Record Info">
          <div className="grid grid-cols-2 gap-4">
            <ReadOnlyField label="Created" value={formatDate(deal.created_at)} />
            <ReadOnlyField label="Last Updated" value={formatDate(deal.updated_at)} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ===========================================================================
// Shortlist Row (interactive status + rate)
// ===========================================================================

const SHORTLIST_STATUSES = [
  { value: 'considering', label: 'Considering', color: 'bg-gray-100 text-gray-700' },
  { value: 'reached_out', label: 'Reached Out', color: 'bg-blue-100 text-blue-800' },
  { value: 'interested', label: 'Interested', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'approved', label: 'Approved to Move Forward', color: 'bg-green-100 text-green-800' },
  { value: 'in_negotiation', label: 'In Negotiation', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'passed', label: 'Passed', color: 'bg-red-100 text-red-800' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-orange-100 text-orange-800' },
];

function shortlistStatusColor(status: string): string {
  const found = SHORTLIST_STATUSES.find((s) => s.value === status);
  return found?.color || 'bg-gray-100 text-gray-700';
}

function shortlistStatusLabel(status: string): string {
  const found = SHORTLIST_STATUSES.find((s) => s.value === status);
  return found?.label || snakeToTitle(status);
}

function ShortlistRow({
  entry,
  dealId,
  onRefresh,
  onDealRefresh,
}: {
  entry: ShortlistEntry;
  dealId: string;
  onRefresh: () => void;
  onDealRefresh: () => void;
}) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function openDropdown() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      // Position dropdown below the button, but if near bottom of viewport, flip above
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = SHORTLIST_STATUSES.length * 40 + 8; // approx
      if (spaceBelow < dropdownHeight) {
        setDropdownPos({ top: rect.top - dropdownHeight, left: rect.left });
      } else {
        setDropdownPos({ top: rect.bottom + 4, left: rect.left });
      }
    }
    setShowStatusDropdown(true);
  }

  async function handleStatusChange(newStatus: string) {
    setShowStatusDropdown(false);
    if (newStatus === entry.status) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/shortlist/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      onRefresh();
      // When talent is confirmed, refresh the deal to show updated talent info in overview
      if (newStatus === 'confirmed') {
        onDealRefresh();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating status');
    } finally {
      setUpdatingStatus(false);
    }
  }

  const rateDisplay = entry.estimated_rate || entry.talent_rate_range || '--';

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 font-semibold text-gray-900">{entry.talent_name}</td>
      <td className="px-4 py-3 text-gray-600 capitalize">{entry.talent_category || '--'}</td>
      <td className="px-4 py-3 text-gray-600">{entry.rep_name || '--'}</td>
      <td className="px-4 py-3 text-gray-600">{entry.rep_agency || '--'}</td>
      <td className="px-4 py-3">
        <span className="text-yellow-500 tracking-wide">{renderStars(entry.fit_score)}</span>
      </td>
      <td className="px-4 py-3">
        <button
          ref={btnRef}
          type="button"
          onClick={openDropdown}
          disabled={updatingStatus}
          className={`text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all ${shortlistStatusColor(entry.status)} ${updatingStatus ? 'opacity-50' : ''}`}
        >
          {updatingStatus ? '...' : shortlistStatusLabel(entry.status)}
          <svg className="w-3 h-3 ml-1 inline-block -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showStatusDropdown && dropdownPos && (
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setShowStatusDropdown(false)} />
            <div
              className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[220px]"
              style={{ top: dropdownPos.top, left: dropdownPos.left }}
            >
              {SHORTLIST_STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleStatusChange(s.value)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors ${
                    s.value === entry.status ? 'bg-indigo-50 font-medium' : ''
                  }`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full ${s.color.split(' ')[0]}`} />
                  {s.label}
                  {s.value === entry.status && (
                    <svg className="w-4 h-4 ml-auto text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </td>
      <td className="px-4 py-3 text-right text-gray-700 font-medium">
        {rateDisplay}
      </td>
    </tr>
  );
}

// ===========================================================================
// Shortlist Tab
// ===========================================================================

function ShortlistTab({
  entries,
  loading,
  dealId,
  onRefresh,
  onDealRefresh,
}: {
  entries: ShortlistEntry[] | null;
  loading: boolean;
  dealId: string;
  onRefresh: () => void;
  onDealRefresh: () => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [talentOptions, setTalentOptions] = useState<TalentOption[]>([]);
  const [talentLoading, setTalentLoading] = useState(false);
  const [addForm, setAddForm] = useState({
    talent_id: '',
    fit_score: '',
    your_notes: '',
  });

  // Inline new talent
  const [showInlineTalent, setShowInlineTalent] = useState(false);
  const [inlineTalentForm, setInlineTalentForm] = useState({
    name: '',
    category: '',
    location: '',
    rate_range: '',
    rep_name: '',
    rep_email: '',
    rep_agency: '',
    rep_role: 'agent',
  });
  const [inlineTalentSubmitting, setInlineTalentSubmitting] = useState(false);

  // Fetch available talent when form opens
  useEffect(() => {
    if (!showAddForm) return;
    setTalentLoading(true);
    fetch('/api/talent')
      .then((res) => res.ok ? res.json() : { data: [] })
      .then((json) => {
        setTalentOptions(json.data || []);
      })
      .catch(() => {
        setTalentOptions([]);
      })
      .finally(() => setTalentLoading(false));
  }, [showAddForm]);

  const handleInlineTalentCreate = async () => {
    if (!inlineTalentForm.name.trim()) return;
    setInlineTalentSubmitting(true);
    try {
      // 1. Create the talent
      const talentPayload = {
        name: inlineTalentForm.name,
        category: inlineTalentForm.category,
        location: inlineTalentForm.location,
        rate_range: inlineTalentForm.rate_range,
      };
      const res = await fetch('/api/talent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(talentPayload),
      });
      if (!res.ok) throw new Error('Failed to create talent');
      const json = await res.json();
      const newTalentId = json.data?.id;
      if (newTalentId) {
        setTalentOptions((prev) => [...prev, json.data]);
        setAddForm((prev) => ({ ...prev, talent_id: newTalentId }));
      }

      // 2. If rep info is provided, create rep and link to talent
      if (newTalentId && inlineTalentForm.rep_name.trim()) {
        const repRes = await fetch('/api/reps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: inlineTalentForm.rep_name,
            email: inlineTalentForm.rep_email || null,
            agency: inlineTalentForm.rep_agency || null,
            role: inlineTalentForm.rep_role || 'agent',
          }),
        });
        if (repRes.ok) {
          const repJson = await repRes.json();
          const newRepId = repJson.data?.id;
          if (newRepId) {
            // Link rep to talent as primary
            await fetch(`/api/talent/${newTalentId}/reps`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                rep_id: newRepId,
                relationship_type: inlineTalentForm.rep_role || 'agent',
                is_primary: true,
              }),
            });
          }
        }
      }

      setShowInlineTalent(false);
      setInlineTalentForm({ name: '', category: '', location: '', rate_range: '', rep_name: '', rep_email: '', rep_agency: '', rep_role: 'agent' });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating talent');
    } finally {
      setInlineTalentSubmitting(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.talent_id) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/shortlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          talent_id: addForm.talent_id,
          fit_score: addForm.fit_score ? Number(addForm.fit_score) : null,
          your_notes: addForm.your_notes || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to add to shortlist');
      setShowAddForm(false);
      setAddForm({ talent_id: '', fit_score: '', your_notes: '' });
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error adding to shortlist');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading shortlist...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Talent Shortlist ({entries?.length || 0})
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {showAddForm ? 'Cancel' : 'Add to Shortlist'}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Talent <span className="text-red-500">*</span>
            </label>
            {talentLoading ? (
              <p className="text-sm text-gray-400">Loading talent list...</p>
            ) : !showInlineTalent ? (
              <select
                required
                value={addForm.talent_id}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setShowInlineTalent(true);
                  } else {
                    setAddForm((p) => ({ ...p, talent_id: e.target.value }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Select talent...</option>
                {talentOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.category ? `(${t.category})` : ''}
                  </option>
                ))}
                <option value="__new__">+ Add New Talent</option>
              </select>
            ) : (
              <div className="border border-indigo-200 bg-indigo-50/50 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-indigo-700">New Talent</span>
                  <button
                    type="button"
                    onClick={() => setShowInlineTalent(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="text"
                  value={inlineTalentForm.name}
                  onChange={(e) => setInlineTalentForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  placeholder="Name (e.g. Zendaya)"
                  autoFocus
                />
                <select
                  value={inlineTalentForm.category}
                  onChange={(e) => setInlineTalentForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Category...</option>
                  <option value="actor">Actor</option>
                  <option value="musician">Musician</option>
                  <option value="athlete">Athlete</option>
                  <option value="model">Model</option>
                  <option value="creator">Creator</option>
                  <option value="influencer">Influencer</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="text"
                  value={inlineTalentForm.location}
                  onChange={(e) => setInlineTalentForm((p) => ({ ...p, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  placeholder="Location (e.g. Los Angeles)"
                />
                <input
                  type="text"
                  value={inlineTalentForm.rate_range}
                  onChange={(e) => setInlineTalentForm((p) => ({ ...p, rate_range: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  placeholder="Rate range (e.g. $500K-$1M)"
                />

                {/* Rep / Agency section */}
                <div className="border-t border-indigo-200 pt-3 mt-1">
                  <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Representative (optional)</span>
                </div>
                <input
                  type="text"
                  value={inlineTalentForm.rep_name}
                  onChange={(e) => setInlineTalentForm((p) => ({ ...p, rep_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  placeholder="Rep name (e.g. John Smith)"
                />
                <input
                  type="email"
                  value={inlineTalentForm.rep_email}
                  onChange={(e) => setInlineTalentForm((p) => ({ ...p, rep_email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  placeholder="Rep email"
                />
                <input
                  type="text"
                  value={inlineTalentForm.rep_agency}
                  onChange={(e) => setInlineTalentForm((p) => ({ ...p, rep_agency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  placeholder="Agency (e.g. WME, CAA, UTA)"
                />
                <select
                  value={inlineTalentForm.rep_role}
                  onChange={(e) => setInlineTalentForm((p) => ({ ...p, rep_role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="agent">Agent</option>
                  <option value="manager">Manager</option>
                  <option value="lawyer">Lawyer</option>
                  <option value="publicist">Publicist</option>
                  <option value="business_manager">Business Manager</option>
                </select>

                <button
                  type="button"
                  disabled={!inlineTalentForm.name.trim() || inlineTalentSubmitting}
                  onClick={handleInlineTalentCreate}
                  className="w-full px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {inlineTalentSubmitting ? 'Creating...' : 'Create Talent & Select'}
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fit Score (1-5)</label>
            <input
              type="number"
              min="1"
              max="5"
              value={addForm.fit_score}
              onChange={(e) => setAddForm((p) => ({ ...p, fit_score: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="1-5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              rows={3}
              value={addForm.your_notes}
              onChange={(e) => setAddForm((p) => ({ ...p, your_notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Any notes about this talent for this deal..."
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !addForm.talent_id}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Adding...' : 'Add Talent'}
            </button>
          </div>
        </form>
      )}

      {/* Shortlist table */}
      {(!entries || entries.length === 0) ? (
        <p className="text-gray-400 text-sm">No talent on the shortlist yet.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Talent</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Rep</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Agency</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Fit Score</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Est. Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((entry) => (
                  <ShortlistRow
                    key={entry.id}
                    entry={entry}
                    dealId={dealId}
                    onRefresh={onRefresh}
                    onDealRefresh={onDealRefresh}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Documents Tab
// ===========================================================================

const DOC_CATEGORIES = [
  { value: 'creative_brief', label: 'Creative Brief' },
  { value: 'casting_brief', label: 'Casting Brief' },
  { value: 'deal_sheet', label: 'Deal Sheet' },
  { value: 'contract', label: 'Contract' },
  { value: 'amendment', label: 'Amendment' },
  { value: 'other', label: 'Other' },
];

const DOC_CATEGORY_COLORS: Record<string, string> = {
  creative_brief: 'bg-purple-100 text-purple-800',
  casting_brief: 'bg-blue-100 text-blue-800',
  deal_sheet: 'bg-green-100 text-green-800',
  contract: 'bg-amber-100 text-amber-800',
  amendment: 'bg-orange-100 text-orange-800',
  other: 'bg-gray-100 text-gray-700',
};

const DOC_STATUS_COLORS: Record<string, string> = {
  uploaded: 'bg-gray-100 text-gray-700',
  extracting: 'bg-yellow-100 text-yellow-800',
  extracted: 'bg-yellow-100 text-yellow-800',
  parsing: 'bg-amber-100 text-amber-800',
  parsed: 'bg-blue-100 text-blue-800',
  applied: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
};

const DOC_STATUS_LABELS: Record<string, string> = {
  uploaded: 'Uploaded',
  extracting: 'Extracting text...',
  extracted: 'Text extracted',
  parsing: 'AI analyzing...',
  parsed: 'Ready to review',
  applied: 'Applied',
  error: 'Error',
};

// Human-readable labels for parsed brief fields
const FIELD_LABELS: Record<string, string> = {
  deal_name: 'Deal Name',
  campaign_name: 'Campaign Name',
  client_name: 'Client Name (will match existing client)',
  talent_criteria: 'Talent Criteria',
  service_days: 'Service Days',
  social_posts: 'Social Posts',
  media_opportunities: 'Media Opportunities',
  ambassador_duties: 'Ambassador Duties',
  term_duration: 'Term Duration',
  term_duration_weeks: 'Term (Weeks)',
  fee_total: 'Total Fee',
  fee_structure: 'Fee Structure',
  fee_payments: 'Payment Schedule',
  exclusivity_category: 'Exclusivity Category',
  exclusivity_brands: 'Excluded Brands',
  exclusivity_duration: 'Exclusivity Duration',
  travel: 'Travel',
  hmu: 'Hair/Makeup/Styling',
  approval_rights: 'Approval Rights',
  image_rights: 'Image Rights',
  permitted_usage: 'Permitted Usage',
  governing_law: 'Governing Law',
  confidential: 'Confidential',
  effective_date: 'Effective Date',
  post_term_rules: 'Post-Term Rules',
  non_union: 'Non-Union',
};

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '--';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return '--';
    if (typeof value[0] === 'string') return value.join(', ');
    return JSON.stringify(value, null, 2);
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentsTab({
  documents,
  loading,
  syncStatus,
  dealId,
  deal,
  onRefresh,
  onDealRefresh,
}: {
  documents: DocumentsResponse | null;
  loading: boolean;
  syncStatus: SyncStatus | null;
  dealId: string;
  deal: Deal | null;
  onRefresh: () => void;
  onDealRefresh: () => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('creative_brief');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewDoc, setReviewDoc] = useState<UploadedDocument | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [musicDocView, setMusicDocView] = useState<'master' | 'publishing'>('master');
  const [expandedLicense, setExpandedLicense] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadedDocs = documents?.uploaded_documents || [];

  // ---- Upload handlers ----
  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('doc_category', uploadCategory);
      const res = await fetch(`/api/deals/${dealId}/documents/upload`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Upload failed');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---- Process handler ----
  const handleProcess = async (docId: string) => {
    setProcessingId(docId);
    try {
      const res = await fetch(`/api/deals/${dealId}/documents/${docId}/process`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Processing failed');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Processing failed');
    } finally {
      setProcessingId(null);
    }
  };

  // ---- Review & Apply ----
  const openReview = (doc: UploadedDocument) => {
    setReviewDoc(doc);
    // Pre-select all non-null fields
    if (doc.parsed_data) {
      const fields = new Set<string>();
      for (const [key, val] of Object.entries(doc.parsed_data)) {
        if (key === 'confidence') continue;
        if (val === null || val === undefined) continue;
        if (Array.isArray(val) && val.length === 0) continue;
        fields.add(key);
      }
      setSelectedFields(fields);
    }
  };

  const handleApply = async () => {
    if (!reviewDoc) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/documents/${reviewDoc.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: Array.from(selectedFields) }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Apply failed');
      setReviewDoc(null);
      onRefresh();
      onDealRefresh();
    } catch (err: any) {
      alert(err.message || 'Apply failed');
    } finally {
      setApplying(false);
    }
  };

  // ---- Delete handler ----
  const handleDelete = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      const res = await fetch(`/api/deals/${dealId}/documents/${docId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Delete failed');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  if (loading) return <p className="text-gray-500">Loading documents...</p>;

  return (
    <div>
      {/* ============ Upload Area ============ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Upload Document</h3>
        <div className="flex items-end gap-4 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Document Type</label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              {DOC_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${dragActive
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
            }
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <svg className="mx-auto h-10 w-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {uploading ? (
            <p className="text-sm text-indigo-600 font-medium">Uploading...</p>
          ) : (
            <>
              <p className="text-sm text-gray-600 font-medium">
                Drag & drop a file here, or <span className="text-indigo-600">click to browse</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF, DOCX, DOC, or TXT — up to 20MB</p>
            </>
          )}
        </div>
      </div>

      {/* ============ Uploaded Documents List ============ */}
      {uploadedDocs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-5">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Uploaded Documents ({uploadedDocs.length})</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {uploadedDocs.map((doc) => {
              const isProcessing = processingId === doc.id;
              const statusColor = DOC_STATUS_COLORS[doc.upload_status] || DOC_STATUS_COLORS.uploaded;
              const categoryColor = DOC_CATEGORY_COLORS[doc.doc_category] || DOC_CATEGORY_COLORS.other;
              const categoryLabel = DOC_CATEGORIES.find((c) => c.value === doc.doc_category)?.label || doc.doc_category;

              return (
                <div key={doc.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* File type icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold uppercase
                      ${doc.file_type === 'pdf' ? 'bg-red-100 text-red-700' :
                        doc.file_type === 'docx' || doc.file_type === 'doc' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'}`}
                    >
                      {doc.file_type}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.original_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${categoryColor}`}>
                          {categoryLabel}
                        </span>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${statusColor}`}>
                          {isProcessing ? 'Processing...' : (DOC_STATUS_LABELS[doc.upload_status] || doc.upload_status)}
                        </span>
                        <span className="text-[10px] text-gray-400">{formatFileSize(doc.file_size)}</span>
                        <span className="text-[10px] text-gray-400">{formatDate(doc.created_at)}</span>
                      </div>
                      {doc.upload_status === 'error' && doc.error_message && (
                        <p className="text-xs text-red-600 mt-1">{doc.error_message}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(doc.upload_status === 'uploaded' || doc.upload_status === 'error') && (
                      <button
                        onClick={() => handleProcess(doc.id)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors"
                      >
                        {isProcessing ? 'Processing...' : 'Process'}
                      </button>
                    )}
                    {doc.upload_status === 'parsed' && (
                      <button
                        onClick={() => openReview(doc)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                      >
                        Review & Apply
                      </button>
                    )}
                    {doc.upload_status === 'applied' && (
                      <span className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg">
                        Applied
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============ Sync status bar ============ */}
      {syncStatus && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sync Status</h3>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">Offer Sheet:</span>{' '}
              <span className="font-medium text-gray-900">v{syncStatus.offerSheetVersion}</span>
            </div>
            <div>
              <span className="text-gray-500">Long Form:</span>{' '}
              <span className="font-medium text-gray-900">v{syncStatus.longFormVersion}</span>
            </div>
            <div>
              <span className="text-gray-500">Pending Changes:</span>{' '}
              <span className={`font-medium ${syncStatus.pendingChanges > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {syncStatus.pendingChanges}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Last Synced:</span>{' '}
              <span className="font-medium text-gray-900">
                {syncStatus.lastSyncedAt ? formatDateTime(syncStatus.lastSyncedAt) : '--'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Discrepancies:</span>{' '}
              <span className={`font-medium ${syncStatus.discrepancies.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {syncStatus.discrepancies.length === 0 ? 'None' : `${syncStatus.discrepancies.length} found`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============ Generated Documents ============ */}
      {!documents ? (
        <p className="text-gray-400 text-sm">No documents generated yet.</p>
      ) : (
        <>
          {/* ---- Talent Documents (Offer Sheet + Long Form) ---- */}
          {documents.offer_sheet && documents.long_form && (
            <div className="mb-5">
              {deal?.deal_type === 'talent_and_music' && (
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Talent Documents</h3>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Offer Sheet */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Offer Sheet</h3>
                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded">
                      v{documents.offer_sheet.version ?? '--'}
                    </span>
                  </div>
                  <div className="p-5 overflow-auto flex-1">
                    {documents.offer_sheet.text ? (
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <code>{documents.offer_sheet.text}</code>
                      </pre>
                    ) : (
                      <p className="text-gray-400 text-sm">No offer sheet text available.</p>
                    )}
                  </div>
                </div>

                {/* Long Form */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Long Form Contract</h3>
                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded">
                      v{documents.long_form.version ?? '--'}
                    </span>
                  </div>
                  <div className="p-5 overflow-auto flex-1">
                    {documents.long_form.text ? (
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <code>{documents.long_form.text}</code>
                      </pre>
                    ) : (
                      <p className="text-gray-400 text-sm">No long form text available.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---- Music Documents (Sync Licenses) ---- */}
          {documents.music_documents && (
            <div>
              {deal?.deal_type === 'talent_and_music' && (
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Music Documents</h3>
              )}

              {/* Master / Publishing Toggle */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-5">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Sync Licenses</h3>
                  <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setMusicDocView('master')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        musicDocView === 'master'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Master
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        musicDocView === 'master' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {documents.music_documents.master_licenses.length}
                      </span>
                    </button>
                    <button
                      onClick={() => setMusicDocView('publishing')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        musicDocView === 'publishing'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Publishing
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        musicDocView === 'publishing' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {documents.music_documents.publishing_licenses.length}
                      </span>
                    </button>
                  </div>
                </div>

                {/* License Cards */}
                <div className="divide-y divide-gray-50">
                  {(musicDocView === 'master'
                    ? documents.music_documents.master_licenses
                    : documents.music_documents.publishing_licenses
                  ).length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <p className="text-sm text-gray-400">
                        No {musicDocView === 'master' ? 'master recording' : 'publishing'} licenses found.
                        {!deal?.song_id && ' Assign a song to this deal to generate licenses.'}
                      </p>
                    </div>
                  ) : (
                    (musicDocView === 'master'
                      ? documents.music_documents.master_licenses
                      : documents.music_documents.publishing_licenses
                    ).map((lic) => {
                      const isExpanded = expandedLicense === lic.license_id;
                      const statusColors: Record<string, string> = {
                        pending: 'bg-gray-100 text-gray-600',
                        contacted: 'bg-blue-50 text-blue-700',
                        negotiating: 'bg-amber-50 text-amber-700',
                        agreed: 'bg-green-50 text-green-700',
                        license_sent: 'bg-indigo-50 text-indigo-700',
                        license_signed: 'bg-green-100 text-green-800',
                        rejected: 'bg-red-50 text-red-700',
                        expired: 'bg-gray-50 text-gray-500',
                      };
                      const statusColor = statusColors[lic.license_status] || statusColors.pending;
                      const statusLabel = lic.license_status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

                      return (
                        <div key={lic.license_id}>
                          {/* Collapsible header */}
                          <button
                            onClick={() => setExpandedLicense(isExpanded ? null : lic.license_id)}
                            className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                musicDocView === 'master' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {musicDocView === 'master' ? 'M' : 'P'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{lic.rights_holder_name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-gray-500">{lic.share_percentage}% share</span>
                                  {lic.fee_amount !== null && (
                                    <>
                                      <span className="text-gray-300">|</span>
                                      <span className="text-xs text-gray-500">
                                        ${lic.fee_amount.toLocaleString()}
                                      </span>
                                    </>
                                  )}
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${statusColor}`}>
                                    {statusLabel}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <svg
                              className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* Expanded license text */}
                          {isExpanded && (
                            <div className="px-5 pb-5">
                              <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-4 border border-gray-100 max-h-[600px] overflow-auto">
                                <code>{lic.text}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============ Review & Apply Modal ============ */}
      {reviewDoc && reviewDoc.parsed_data && (
        <div className="fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center p-4" onClick={() => setReviewDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Review & Apply Fields</h3>
                <p className="text-sm text-gray-500 mt-0.5">{reviewDoc.original_name}</p>
              </div>
              <div className="flex items-center gap-3">
                {reviewDoc.parsed_data.confidence !== undefined && (
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Confidence</p>
                    <p className={`text-lg font-bold ${
                      reviewDoc.parsed_data.confidence >= 0.6 ? 'text-green-600' :
                      reviewDoc.parsed_data.confidence >= 0.3 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {Math.round(reviewDoc.parsed_data.confidence * 100)}%
                    </p>
                  </div>
                )}
                <button onClick={() => setReviewDoc(null)} className="p-2 text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Select all / none */}
            <div className="px-6 py-2 border-b border-gray-50 flex items-center gap-3">
              <button
                onClick={() => {
                  const all = new Set<string>();
                  for (const [k, v] of Object.entries(reviewDoc.parsed_data)) {
                    if (k === 'confidence' || v === null || v === undefined) continue;
                    if (Array.isArray(v) && v.length === 0) continue;
                    all.add(k);
                  }
                  setSelectedFields(all);
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => setSelectedFields(new Set())}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                Deselect All
              </button>
              <span className="text-xs text-gray-400 ml-auto">{selectedFields.size} field(s) selected</span>
            </div>

            {/* Field list */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="space-y-1">
                {Object.entries(reviewDoc.parsed_data)
                  .filter(([key, val]) => {
                    if (key === 'confidence') return false;
                    if (val === null || val === undefined) return false;
                    if (Array.isArray(val) && val.length === 0) return false;
                    return true;
                  })
                  .map(([key, val]) => {
                    const isSelected = selectedFields.has(key);
                    const label = FIELD_LABELS[key] || snakeToTitle(key);
                    const currentValue = deal ? (deal as any)[key] : undefined;
                    const parsedStr = formatFieldValue(val);
                    const currentStr = formatFieldValue(currentValue);
                    const isChanged = currentStr !== parsedStr && currentStr !== '--';

                    return (
                      <label
                        key={key}
                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors
                          ${isSelected ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50 border border-transparent hover:bg-gray-100'}
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const next = new Set(selectedFields);
                            if (isSelected) next.delete(key);
                            else next.add(key);
                            setSelectedFields(next);
                          }}
                          className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{label}</span>
                            {isChanged && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Will overwrite</span>
                            )}
                          </div>
                          <div className="mt-1">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white rounded p-2 border border-gray-100 max-h-24 overflow-auto">
                              {parsedStr}
                            </pre>
                          </div>
                          {isChanged && currentStr !== '--' && (
                            <div className="mt-1">
                              <p className="text-[10px] text-gray-400 mb-0.5">Current value:</p>
                              <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono bg-gray-50 rounded p-2 border border-gray-100 max-h-16 overflow-auto line-through">
                                {currentStr}
                              </pre>
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => setReviewDoc(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={selectedFields.size === 0 || applying}
                className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                {applying ? 'Applying...' : `Apply ${selectedFields.size} Field(s) to Deal`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Admin & Logistics Tab
// ===========================================================================

function AdminTab({
  deal,
  dealId,
  onDealRefresh,
}: {
  deal: Deal;
  dealId: string;
  onDealRefresh: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState<{ item: string; status: string; completed_at: string | null }[]>(
    deal.admin_checklist?.length
      ? deal.admin_checklist
      : [
          { item: 'W-9 received', status: 'pending', completed_at: null },
          { item: 'Invoice received', status: 'pending', completed_at: null },
          { item: 'Payment processed', status: 'pending', completed_at: null },
          { item: 'Talent contact info confirmed', status: 'pending', completed_at: null },
          { item: 'Travel booked', status: 'pending', completed_at: null },
          { item: 'Wardrobe / HMU confirmed', status: 'pending', completed_at: null },
          { item: 'Call sheet sent', status: 'pending', completed_at: null },
        ]
  );
  const [newItem, setNewItem] = useState('');
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  const [executingContract, setExecutingContract] = useState(false);

  useEffect(() => {
    if (deal.admin_checklist?.length) {
      setChecklist(deal.admin_checklist);
    }
  }, [deal.admin_checklist]);

  const saveChecklist = async (updated: typeof checklist) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_checklist: updated }),
      });
      if (!res.ok) throw new Error('Failed to save checklist');
      onDealRefresh();
    } catch (err: any) {
      console.error('Save checklist error:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = (idx: number) => {
    const updated = [...checklist];
    if (updated[idx].status === 'done') {
      updated[idx] = { ...updated[idx], status: 'pending', completed_at: null };
    } else {
      updated[idx] = { ...updated[idx], status: 'done', completed_at: new Date().toISOString() };
    }
    setChecklist(updated);
    saveChecklist(updated);
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    const updated = [...checklist, { item: newItem.trim(), status: 'pending', completed_at: null }];
    setChecklist(updated);
    setNewItem('');
    saveChecklist(updated);
  };

  const removeItem = (idx: number) => {
    const updated = checklist.filter((_, i) => i !== idx);
    setChecklist(updated);
    saveChecklist(updated);
  };

  const saveW9 = async (received: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          w9_received: received,
          w9_received_date: received ? new Date().toISOString().split('T')[0] : null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save W-9 status');
      onDealRefresh();
    } catch (err: any) {
      console.error('Save W9 error:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveInvoice = async (received: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_received: received,
          invoice_received_date: received ? new Date().toISOString().split('T')[0] : null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save invoice status');
      onDealRefresh();
    } catch (err: any) {
      console.error('Save invoice error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptOffer = async () => {
    setAcceptingOffer(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/accept-offer`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || 'Failed to accept offer');
      }
      onDealRefresh();
    } finally {
      setAcceptingOffer(false);
    }
  };

  const handleExecuteContract = async () => {
    setExecutingContract(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/execute-contract`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || 'Failed to execute contract');
      }
      onDealRefresh();
    } finally {
      setExecutingContract(false);
    }
  };

  const doneCount = checklist.filter((c) => c.status === 'done').length;
  const totalCount = checklist.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stage Gate Actions */}
      <SectionCard title="Stage Gate Actions">
        <div className="space-y-4">
          {/* Approval to Engage */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Approval to Engage</p>
              {deal.approval_to_engage_at ? (
                <p className="text-xs text-green-600 mt-0.5">
                  ✓ Approved by {deal.approval_to_engage_by || 'N/A'} on{' '}
                  {formatDate(deal.approval_to_engage_at)}
                  {deal.approval_notes && <span className="text-gray-500 ml-1">— {deal.approval_notes}</span>}
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-0.5">⏳ Not yet approved</p>
              )}
            </div>
            {!deal.approval_to_engage_at && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Required for Negotiation</span>
            )}
          </div>

          {/* Offer Acceptance */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Offer Acceptance</p>
              {deal.offer_accepted_at ? (
                <p className="text-xs text-green-600 mt-0.5">
                  ✓ Accepted on {formatDate(deal.offer_accepted_at)} — Snapshot locked at v{deal.offer_snapshot?.offer_sheet_version || deal.offer_sheet_version}
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-0.5">⏳ Not yet accepted</p>
              )}
            </div>
            {!deal.offer_accepted_at && (
              <button
                onClick={handleAcceptOffer}
                disabled={acceptingOffer}
                className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {acceptingOffer ? 'Accepting...' : 'Mark Offer Accepted'}
              </button>
            )}
          </div>

          {/* Contract Execution */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Contract Execution</p>
              {deal.contract_executed_at ? (
                <p className="text-xs text-green-600 mt-0.5">
                  ✓ Executed on {formatDate(deal.contract_executed_at)}
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-0.5">⏳ Not yet executed</p>
              )}
            </div>
            {!deal.contract_executed_at && deal.offer_accepted_at && (
              <button
                onClick={handleExecuteContract}
                disabled={executingContract}
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {executingContract ? 'Executing...' : 'Mark Contract Executed'}
              </button>
            )}
          </div>
        </div>
      </SectionCard>

      {/* W-9 and Invoice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard title="W-9 Status">
          <div className="flex items-center gap-3">
            <button
              onClick={() => saveW9(!deal.w9_received)}
              disabled={saving}
              className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                deal.w9_received
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 hover:border-green-400'
              }`}
            >
              {deal.w9_received && '✓'}
            </button>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {deal.w9_received ? 'W-9 Received' : 'W-9 Not Received'}
              </p>
              {deal.w9_received_date && (
                <p className="text-xs text-gray-500">Received: {formatDate(deal.w9_received_date)}</p>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Invoice Status">
          <div className="flex items-center gap-3">
            <button
              onClick={() => saveInvoice(!deal.invoice_received)}
              disabled={saving}
              className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                deal.invoice_received
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 hover:border-green-400'
              }`}
            >
              {deal.invoice_received && '✓'}
            </button>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {deal.invoice_received ? 'Invoice Received' : 'Invoice Not Received'}
              </p>
              {deal.invoice_received_date && (
                <p className="text-xs text-gray-500">Received: {formatDate(deal.invoice_received_date)}</p>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Enhanced Payment Tracker */}
      <SectionCard title="Payment Tracker">
        {(() => {
          const payments = (deal.fee_payments as any[]) || [];
          const totalFee = deal.fee_total || 0;

          // Calculate amounts
          const paidPayments = payments.filter((p: any) => p.status === 'paid');
          const invoicedPayments = payments.filter((p: any) => p.status === 'invoiced');
          const amountPaid = paidPayments.reduce((sum: number, p: any) => {
            const pct = parseFloat(p.percentage) || 0;
            return sum + (totalFee * pct / 100);
          }, 0);
          const amountInvoiced = invoicedPayments.reduce((sum: number, p: any) => {
            const pct = parseFloat(p.percentage) || 0;
            return sum + (totalFee * pct / 100);
          }, 0) + amountPaid;
          const outstanding = totalFee - amountPaid;

          const updatePayment = async (idx: number, updates: any) => {
            const updated = [...payments];
            updated[idx] = { ...updated[idx], ...updates };
            try {
              await fetch(`/api/deals/${dealId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fee_payments: updated }),
              });
              onDealRefresh();
            } catch {}
          };

          const cycleStatus = (idx: number) => {
            const current = payments[idx]?.status || 'pending';
            const next = current === 'pending' ? 'invoiced' : current === 'invoiced' ? 'paid' : 'pending';
            const updates: any = { status: next };
            if (next === 'invoiced') updates.invoice_date = new Date().toISOString().split('T')[0];
            if (next === 'paid') updates.payment_date = new Date().toISOString().split('T')[0];
            if (next === 'pending') { updates.invoice_date = null; updates.payment_date = null; }
            updatePayment(idx, updates);
          };

          return (
            <>
              {/* Summary Bar */}
              {totalFee > 0 && (
                <div className="mb-4">
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Total Fee</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(totalFee)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Invoiced</p>
                      <p className="text-sm font-semibold text-amber-600">{formatCurrency(amountInvoiced)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Received</p>
                      <p className="text-sm font-semibold text-green-600">{formatCurrency(amountPaid)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Outstanding</p>
                      <p className="text-sm font-semibold text-red-600">{formatCurrency(outstanding)}</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full flex">
                      <div className="bg-green-500 h-full transition-all" style={{ width: `${totalFee > 0 ? (amountPaid / totalFee * 100) : 0}%` }} />
                      <div className="bg-amber-400 h-full transition-all" style={{ width: `${totalFee > 0 ? ((amountInvoiced - amountPaid) / totalFee * 100) : 0}%` }} />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-1.5 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Paid</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Invoiced</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" /> Pending</span>
                  </div>
                </div>
              )}

              {/* Payment Rows */}
              {payments.length > 0 ? (
                <div className="space-y-2">
                  {payments.map((p: any, i: number) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => cycleStatus(i)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors cursor-pointer ${
                              p.status === 'paid' ? 'bg-green-500 text-white' :
                              p.status === 'invoiced' ? 'bg-amber-400 text-white' :
                              'bg-gray-200 text-gray-500 hover:bg-gray-300'
                            }`}
                            title="Click to cycle: pending → invoiced → paid"
                          >
                            {p.status === 'paid' ? '✓' : p.status === 'invoiced' ? '$' : i + 1}
                          </button>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {p.percentage ? `${p.percentage}%` : ''} {p.milestone || `Payment ${i + 1}`}
                              {totalFee > 0 && p.percentage && (
                                <span className="text-gray-400 font-normal ml-1.5">
                                  ({formatCurrency(totalFee * parseFloat(p.percentage) / 100)})
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {p.invoice_date && (
                                <span className="text-[10px] text-amber-600">Invoiced: {formatDate(p.invoice_date)}</span>
                              )}
                              {p.payment_date && (
                                <span className="text-[10px] text-green-600">Paid: {formatDate(p.payment_date)}</span>
                              )}
                              {p.invoice_number && (
                                <span className="text-[10px] text-gray-400">INV: {p.invoice_number}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            p.status === 'paid' ? 'bg-green-100 text-green-800' :
                            p.status === 'invoiced' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {p.status ? snakeToTitle(p.status) : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No payment milestones configured. Set them in the Overview tab under Fee Structure.
                </p>
              )}
            </>
          );
        })()}
      </SectionCard>

      {/* Admin Checklist */}
      <SectionCard title="Admin Checklist">
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{doneCount} of {totalCount} complete</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Items */}
        <div className="space-y-1.5">
          {checklist.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 group">
              <button
                onClick={() => toggleItem(idx)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  item.status === 'done'
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 hover:border-green-400'
                }`}
              >
                {item.status === 'done' && <span className="text-xs">✓</span>}
              </button>
              <span
                className={`text-sm flex-1 ${
                  item.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'
                }`}
              >
                {item.item}
              </span>
              {item.completed_at && (
                <span className="text-xs text-gray-400">{formatDate(item.completed_at)}</span>
              )}
              <button
                onClick={() => removeItem(idx)}
                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Add new */}
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder="Add checklist item..."
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={addItem}
            disabled={!newItem.trim()}
            className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Add
          </button>
        </div>
      </SectionCard>

      {/* Offer Snapshot (if locked) */}
      {deal.offer_snapshot && (
        <SectionCard title="Locked Offer Snapshot">
          <div className="text-xs text-gray-500 mb-3">
            Snapshot taken at {formatDateTime(deal.offer_snapshot.snapshot_taken_at)}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <ReadOnlyField label="Fee Total" value={formatCurrency(deal.offer_snapshot.fee_total, deal.offer_snapshot.fee_currency)} />
            <ReadOnlyField label="Fee Structure" value={deal.offer_snapshot.fee_structure} />
            <ReadOnlyField label="Term Duration" value={deal.offer_snapshot.term_duration} />
            <ReadOnlyField label="Term Start" value={formatDate(deal.offer_snapshot.term_start_date)} />
            <ReadOnlyField label="Term End" value={formatDate(deal.offer_snapshot.term_end_date)} />
            <ReadOnlyField label="Exclusivity" value={deal.offer_snapshot.exclusivity_category} />
            <ReadOnlyField label="Governing Law" value={deal.offer_snapshot.governing_law} />
            <ReadOnlyField label="Offer Sheet Version" value={`v${deal.offer_snapshot.offer_sheet_version}`} />
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ===========================================================================
// Fulfillment Tab
// ===========================================================================

function FulfillmentTab({
  deal,
  dealId,
  onDealRefresh,
}: {
  deal: Deal;
  dealId: string;
  onDealRefresh: () => void;
}) {
  const [deliverables, setDeliverables] = useState<
    { type: string; description: string; status: string; due_date: string | null; completed_date: string | null }[]
  >(deal.deliverables_status?.length ? deal.deliverables_status : []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDeliverable, setNewDeliverable] = useState({ type: 'shoot_day', description: '', due_date: '' });

  useEffect(() => {
    if (deal.deliverables_status?.length) {
      setDeliverables(deal.deliverables_status);
    }
  }, [deal.deliverables_status]);

  const saveDeliverables = async (updated: typeof deliverables) => {
    await fetch(`/api/deals/${dealId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deliverables_status: updated }),
    });
    onDealRefresh();
  };

  const saveUsageDates = async (field: string, value: string) => {
    await fetch(`/api/deals/${dealId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value || null }),
    });
    onDealRefresh();
  };

  const toggleDeliverable = (idx: number) => {
    const updated = [...deliverables];
    if (updated[idx].status === 'complete') {
      updated[idx] = { ...updated[idx], status: 'pending', completed_date: null };
    } else {
      updated[idx] = { ...updated[idx], status: 'complete', completed_date: new Date().toISOString() };
    }
    setDeliverables(updated);
    saveDeliverables(updated);
  };

  const updateDeliverableStatus = (idx: number, status: string) => {
    const updated = [...deliverables];
    updated[idx] = {
      ...updated[idx],
      status,
      completed_date: status === 'complete' ? new Date().toISOString() : null,
    };
    setDeliverables(updated);
    saveDeliverables(updated);
  };

  const addDeliverable = () => {
    if (!newDeliverable.description.trim()) return;
    const updated = [
      ...deliverables,
      {
        type: newDeliverable.type,
        description: newDeliverable.description.trim(),
        status: 'pending',
        due_date: newDeliverable.due_date || null,
        completed_date: null,
      },
    ];
    setDeliverables(updated);
    setNewDeliverable({ type: 'shoot_day', description: '', due_date: '' });
    setShowAddForm(false);
    saveDeliverables(updated);
  };

  const removeDeliverable = (idx: number) => {
    const updated = deliverables.filter((_, i) => i !== idx);
    setDeliverables(updated);
    saveDeliverables(updated);
  };

  // Usage countdown calculation (parse as local date to avoid timezone issues)
  let usageEndDate: Date | null = null;
  if (deal.usage_end_date) {
    const [y, m, d] = deal.usage_end_date.split('-').map(Number);
    usageEndDate = new Date(y, m - 1, d);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysRemaining = usageEndDate
    ? Math.ceil((usageEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const completedCount = deliverables.filter((d) => d.status === 'complete').length;
  const totalCount = deliverables.length;
  const delProgressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const deliverableTypes = [
    { value: 'shoot_day', label: 'Shoot Day' },
    { value: 'social_post', label: 'Social Post' },
    { value: 'media_appearance', label: 'Media Appearance' },
    { value: 'content_delivery', label: 'Content Delivery' },
    { value: 'event', label: 'Event' },
    { value: 'other', label: 'Other' },
  ];

  const deliverableStatusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-600' },
    { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'review', label: 'In Review', color: 'bg-purple-100 text-purple-800' },
    { value: 'complete', label: 'Complete', color: 'bg-green-100 text-green-800' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  ];

  return (
    <div className="space-y-6">
      {/* Usage Period */}
      <SectionCard title="Usage Period">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Usage Start Date</label>
            <input
              type="date"
              value={deal.usage_start_date || ''}
              onChange={(e) => saveUsageDates('usage_start_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Usage End Date</label>
            <input
              type="date"
              value={deal.usage_end_date || ''}
              onChange={(e) => saveUsageDates('usage_end_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-end">
            {daysRemaining !== null && (
              <div
                className={`w-full text-center py-2 rounded-lg font-semibold text-sm ${
                  daysRemaining <= 0
                    ? 'bg-red-100 text-red-800'
                    : daysRemaining <= 30
                    ? 'bg-orange-100 text-orange-800'
                    : daysRemaining <= 90
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {daysRemaining <= 0
                  ? `Expired ${Math.abs(daysRemaining)} days ago`
                  : `${daysRemaining} days remaining`}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Deliverables Tracker */}
      <SectionCard title="Deliverables">
        {/* Progress */}
        {totalCount > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{completedCount} of {totalCount} deliverables complete</span>
              <span>{delProgressPct}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${delProgressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Deliverable list */}
        <div className="space-y-2">
          {deliverables.map((d, idx) => {
            const statusOpt = deliverableStatusOptions.find((o) => o.value === d.status) || deliverableStatusOptions[0];
            return (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group">
                <button
                  onClick={() => toggleDeliverable(idx)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    d.status === 'complete'
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                >
                  {d.status === 'complete' && <span className="text-xs">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-indigo-600 uppercase">
                      {deliverableTypes.find((t) => t.value === d.type)?.label || d.type}
                    </span>
                    <span
                      className={`text-sm ${d.status === 'complete' ? 'text-gray-400 line-through' : 'text-gray-900'}`}
                    >
                      {d.description}
                    </span>
                  </div>
                  {d.due_date && (
                    <p className="text-xs text-gray-500 mt-0.5">Due: {formatDate(d.due_date)}</p>
                  )}
                  {d.completed_date && (
                    <p className="text-xs text-green-600 mt-0.5">Completed: {formatDate(d.completed_date)}</p>
                  )}
                </div>
                <select
                  value={d.status}
                  onChange={(e) => updateDeliverableStatus(idx, e.target.value)}
                  className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${statusOpt.color}`}
                >
                  {deliverableStatusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removeDeliverable(idx)}
                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                >
                  ✕
                </button>
              </div>
            );
          })}

          {deliverables.length === 0 && !showAddForm && (
            <p className="text-sm text-gray-400">No deliverables tracked yet.</p>
          )}
        </div>

        {/* Add form */}
        {showAddForm ? (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select
                  value={newDeliverable.type}
                  onChange={(e) => setNewDeliverable({ ...newDeliverable, type: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {deliverableTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <input
                  type="text"
                  value={newDeliverable.description}
                  onChange={(e) => setNewDeliverable({ ...newDeliverable, description: e.target.value })}
                  placeholder="e.g. Instagram Reel #1"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newDeliverable.due_date}
                  onChange={(e) => setNewDeliverable({ ...newDeliverable, due_date: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addDeliverable}
                disabled={!newDeliverable.description.trim()}
                className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                Add Deliverable
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-3 inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            + Add Deliverable
          </button>
        )}
      </SectionCard>

      {/* Financial Summary (shown for Complete/Archived deals) */}
      {(deal.status === 'complete' || deal.status === 'archived') && (
        <SectionCard title="Financial Summary">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <ReadOnlyField label="Total Fee" value={formatCurrency(deal.fee_total, deal.fee_currency)} />
            <ReadOnlyField label="Fee Structure" value={deal.fee_structure ? snakeToTitle(deal.fee_structure) : null} />
            <ReadOnlyField label="Net Terms" value={deal.fee_net_terms} />
            <ReadOnlyField label="MFN" value={deal.fee_mfn ? 'Yes' : 'No'} />
            <ReadOnlyField label="W-9 Received" value={deal.w9_received ? `Yes (${formatDate(deal.w9_received_date)})` : 'No'} />
            <ReadOnlyField label="Invoice Received" value={deal.invoice_received ? `Yes (${formatDate(deal.invoice_received_date)})` : 'No'} />
          </div>
          {deal.fee_payments && (deal.fee_payments as any[]).length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">Payment Schedule</p>
              {(deal.fee_payments as any[]).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50">
                  <span className="text-gray-700">
                    {p.percentage ? `${p.percentage}%` : ''} {p.milestone || `Payment ${i + 1}`}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {p.status ? snakeToTitle(p.status) : 'Pending'}
                    {p.paid_date ? ` — ${formatDate(p.paid_date)}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}

// ===========================================================================
// Timeline Tab
// ===========================================================================
// SONG PITCHLIST TAB
// ===========================================================================

function SongPitchlistTab({ dealId, deal, onDealRefresh }: { dealId: string; deal: Deal; onDealRefresh: () => void }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [songs, setSongs] = useState<any[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState('');
  const [adding, setAdding] = useState(false);
  const [showInlineSong, setShowInlineSong] = useState(false);
  const [inlineSongForm, setInlineSongForm] = useState({ title: '', artist_name: '', genre: '', album: '' });
  const [inlineSongSubmitting, setInlineSongSubmitting] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}/pitchlist`);
      if (res.ok) { const json = await res.json(); setEntries(json.data || []); }
    } catch {} finally { setLoading(false); }
  }, [dealId]);

  const fetchSongs = useCallback(async () => {
    try {
      const res = await fetch('/api/songs');
      if (res.ok) { const json = await res.json(); setSongs(json.data || []); }
    } catch {}
  }, []);

  useEffect(() => { fetchEntries(); fetchSongs(); }, [fetchEntries, fetchSongs]);

  const handleAdd = async () => {
    if (!selectedSongId) return;
    setAdding(true);
    try {
      await fetch(`/api/deals/${dealId}/pitchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: selectedSongId }),
      });
      setAddModal(false);
      setSelectedSongId('');
      fetchEntries();
    } catch {} finally { setAdding(false); }
  };

  const handleStatusChange = async (entryId: string, newStatus: string) => {
    try {
      await fetch(`/api/deals/${dealId}/pitchlist/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pitch_status: newStatus }),
      });
      fetchEntries();
      if (newStatus === 'selected') onDealRefresh();
    } catch {}
  };

  const handleRemove = async (entryId: string) => {
    try {
      await fetch(`/api/deals/${dealId}/pitchlist/${entryId}`, { method: 'DELETE' });
      fetchEntries();
    } catch {}
  };

  const handleInlineSongCreate = async () => {
    if (!inlineSongForm.title.trim() || !inlineSongForm.artist_name.trim()) return;
    setInlineSongSubmitting(true);
    try {
      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inlineSongForm),
      });
      if (!res.ok) throw new Error('Failed to create song');
      const json = await res.json();
      if (json.data?.id) {
        setSongs((prev) => [...prev, json.data]);
        // Automatically add the new song to the pitchlist
        await fetch(`/api/deals/${dealId}/pitchlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ song_id: json.data.id }),
        });
        fetchEntries();
      }
      setAddModal(false);
      setShowInlineSong(false);
      setSelectedSongId('');
      setInlineSongForm({ title: '', artist_name: '', genre: '', album: '' });
    } catch (err: any) {
      alert(err.message || 'Error creating song');
    } finally {
      setInlineSongSubmitting(false);
    }
  };

  const PITCH_STATUSES = ['considering', 'pitched', 'client_reviewing', 'selected', 'rejected', 'on_hold'];
  const PITCH_COLORS: Record<string, string> = {
    considering: 'bg-gray-100 text-gray-700',
    pitched: 'bg-blue-100 text-blue-700',
    client_reviewing: 'bg-amber-100 text-amber-700',
    selected: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    on_hold: 'bg-yellow-100 text-yellow-700',
  };

  if (loading) return <div className="flex items-center justify-center py-10"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Song Pitchlist</h2>
        <button onClick={() => setAddModal(true)} className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">+ Add Song</button>
      </div>

      {deal.song_id && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
          Selected song is linked to this deal.
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center text-gray-400 text-sm">No songs pitched yet.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Song</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Artist</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Genre</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((entry: any) => (
                <tr key={entry.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-900">{entry.song_title}</td>
                  <td className="px-5 py-3 text-gray-600">{entry.artist_name}</td>
                  <td className="px-5 py-3 text-gray-600">{entry.genre || '--'}</td>
                  <td className="px-5 py-3">
                    <select
                      value={entry.pitch_status}
                      onChange={(e) => handleStatusChange(entry.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-lg font-medium border-0 ${PITCH_COLORS[entry.pitch_status] || 'bg-gray-100'}`}
                    >
                      {PITCH_STATUSES.map((s) => <option key={s} value={s}>{snakeToTitle(s)}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => handleRemove(entry.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setAddModal(false); setShowInlineSong(false); }} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Song to Pitchlist</h3>

            {!showInlineSong ? (
              <>
                <select
                  value={selectedSongId}
                  onChange={(e) => setSelectedSongId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3 bg-white"
                >
                  <option value="">Select a song...</option>
                  {songs.map((s: any) => <option key={s.id} value={s.id}>{s.title} - {s.artist_name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setShowInlineSong(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mb-4 flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Create New Song
                </button>
                <div className="flex justify-end gap-3">
                  <button onClick={() => { setAddModal(false); setShowInlineSong(false); }} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  <button onClick={handleAdd} disabled={!selectedSongId || adding} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{adding ? 'Adding...' : 'Add'}</button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-3 mb-4">
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">New Song</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="Song Title *"
                      value={inlineSongForm.title}
                      onChange={(e) => setInlineSongForm((f) => ({ ...f, title: e.target.value }))}
                      className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                    <input
                      placeholder="Artist Name *"
                      value={inlineSongForm.artist_name}
                      onChange={(e) => setInlineSongForm((f) => ({ ...f, artist_name: e.target.value }))}
                      className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                    <input
                      placeholder="Genre"
                      value={inlineSongForm.genre}
                      onChange={(e) => setInlineSongForm((f) => ({ ...f, genre: e.target.value }))}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                    <input
                      placeholder="Album"
                      value={inlineSongForm.album}
                      onChange={(e) => setInlineSongForm((f) => ({ ...f, album: e.target.value }))}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => { setShowInlineSong(false); setInlineSongForm({ title: '', artist_name: '', genre: '', album: '' }); }} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Back</button>
                  <button
                    onClick={handleInlineSongCreate}
                    disabled={!inlineSongForm.title.trim() || !inlineSongForm.artist_name.trim() || inlineSongSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {inlineSongSubmitting ? 'Creating...' : 'Create & Add'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// MUSIC LICENSES TAB
// ===========================================================================

function MusicLicensesTab({ dealId, deal }: { dealId: string; deal: Deal }) {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add License Modal state
  const [addModal, setAddModal] = useState(false);
  const [addSide, setAddSide] = useState<'master' | 'publishing'>('master');
  const [rightsHolders, setRightsHolders] = useState<any[]>([]);
  const [selectedRightsHolderId, setSelectedRightsHolderId] = useState('');
  const [sharePercentage, setSharePercentage] = useState('100');
  const [adding, setAdding] = useState(false);

  // Inline create rights holder state
  const [showInlineRH, setShowInlineRH] = useState(false);
  const [inlineRHForm, setInlineRHForm] = useState({ name: '', type: 'label', contact_name: '', contact_email: '' });
  const [inlineRHSubmitting, setInlineRHSubmitting] = useState(false);

  const fetchLicenses = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}/music-licenses`);
      if (res.ok) { const json = await res.json(); setLicenses(json.data || []); }
    } catch {} finally { setLoading(false); }
  }, [dealId]);

  const fetchRightsHolders = useCallback(async () => {
    try {
      const res = await fetch('/api/rights-holders');
      if (res.ok) { const json = await res.json(); setRightsHolders(json.data || []); }
    } catch {}
  }, []);

  useEffect(() => { fetchLicenses(); }, [fetchLicenses]);
  useEffect(() => { fetchRightsHolders(); }, [fetchRightsHolders]);

  const handlePopulate = async () => {
    if (!deal.song_id) { alert('No song selected for this deal. Please select a song from the Song Pitchlist first.'); return; }
    try {
      await fetch(`/api/deals/${dealId}/music-licenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'populate', song_id: deal.song_id }),
      });
      fetchLicenses();
    } catch {}
  };

  const handleRecalculate = async () => {
    try {
      await fetch(`/api/deals/${dealId}/music-licenses/recalculate`, { method: 'POST' });
      fetchLicenses();
    } catch {}
  };

  const handleStatusChange = async (licenseId: string, newStatus: string) => {
    try {
      const updates: any = { license_status: newStatus };
      if (newStatus === 'license_sent') updates.sent_at = new Date().toISOString();
      if (newStatus === 'license_signed') updates.signed_at = new Date().toISOString();
      await fetch(`/api/deals/${dealId}/music-licenses/${licenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      fetchLicenses();
    } catch {}
  };

  const handleDelete = async (licenseId: string) => {
    try {
      await fetch(`/api/deals/${dealId}/music-licenses/${licenseId}`, { method: 'DELETE' });
      fetchLicenses();
    } catch {}
  };

  const handleAddLicense = async () => {
    if (!selectedRightsHolderId || !sharePercentage) return;
    setAdding(true);
    try {
      // Calculate fee based on side and share
      const feePerSide = deal.fee_per_side ?? 0;
      const sideFee = addSide === 'master' ? (deal.master_fee_override ?? feePerSide) : feePerSide;
      const feeAmount = sideFee * (parseFloat(sharePercentage) / 100);

      await fetch(`/api/deals/${dealId}/music-licenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          song_id: deal.song_id || '',
          rights_holder_id: selectedRightsHolderId,
          side: addSide,
          share_percentage: parseFloat(sharePercentage),
          fee_amount: feeAmount,
        }),
      });
      setAddModal(false);
      setSelectedRightsHolderId('');
      setSharePercentage('100');
      setAddSide('master');
      fetchLicenses();
    } catch {} finally { setAdding(false); }
  };

  const handleInlineRHCreate = async () => {
    if (!inlineRHForm.name.trim()) return;
    setInlineRHSubmitting(true);
    try {
      const res = await fetch('/api/rights-holders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inlineRHForm),
      });
      if (!res.ok) throw new Error('Failed to create rights holder');
      const json = await res.json();
      if (json.data?.id) {
        setRightsHolders((prev) => [...prev, json.data]);
        setSelectedRightsHolderId(json.data.id);
        setShowInlineRH(false);
        setInlineRHForm({ name: '', type: 'label', contact_name: '', contact_email: '' });
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating rights holder');
    } finally { setInlineRHSubmitting(false); }
  };

  const LICENSE_STATUSES = ['pending', 'contacted', 'negotiating', 'agreed', 'license_sent', 'license_signed', 'rejected', 'expired'];
  const LICENSE_COLORS: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    contacted: 'bg-blue-100 text-blue-700',
    negotiating: 'bg-amber-100 text-amber-700',
    agreed: 'bg-green-100 text-green-700',
    license_sent: 'bg-indigo-100 text-indigo-700',
    license_signed: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    expired: 'bg-gray-200 text-gray-500',
  };

  // Fee calculations
  const feePerSide = deal.fee_per_side ?? 0;
  const masterFee = deal.master_fee_override ?? feePerSide;
  const publishingFee = feePerSide;
  const isMFN = deal.master_fee_override === null || deal.master_fee_override === undefined;
  const masterLicenses = licenses.filter((l: any) => l.side === 'master');
  const pubLicenses = licenses.filter((l: any) => l.side === 'publishing');
  const totalFees = licenses.reduce((sum: number, l: any) => sum + (l.fee_override ?? l.fee_amount ?? 0), 0);

  if (loading) return <div className="flex items-center justify-center py-10"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Fee Summary */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Music Licenses</h2>
          <div className="flex gap-2">
            <button onClick={() => setAddModal(true)} className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700">+ Add License</button>
            <button onClick={handlePopulate} className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" title="Auto-create license rows from song's rights holders">Populate from Song</button>
            <button onClick={handleRecalculate} className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Recalculate Fees</button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase font-medium">Fee/Side</p>
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(feePerSide)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-medium">Master Fee</p>
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(masterFee)} {isMFN && <span className="text-xs text-green-600 font-normal">(MFN)</span>}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-medium">Publishing Fee</p>
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(publishingFee)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-medium">Total Across Parties</p>
            <p className="text-sm font-semibold text-indigo-600">{formatCurrency(totalFees)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-medium">Parties</p>
            <p className="text-sm text-gray-900">{licenses.length} ({masterLicenses.length}M / {pubLicenses.length}P)</p>
          </div>
        </div>
      </div>

      {/* Licenses Table */}
      {licenses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center text-gray-400 text-sm">
          No licenses yet. Click &ldquo;Populate from Song&rdquo; to auto-create from the song&apos;s rights holders.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Side</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rights Holder</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Share</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {licenses.map((lic: any) => (
                <tr key={lic.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                      lic.side === 'master' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                    }`}>{lic.side}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{lic.rights_holder_name}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{lic.rights_holder_type}</td>
                  <td className="px-4 py-3 font-mono text-gray-900">{lic.share_percentage}%</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {formatCurrency(lic.fee_override ?? lic.fee_amount)}
                    {lic.fee_override !== null && <span className="text-xs text-amber-600 ml-1">(override)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lic.license_status}
                      onChange={(e) => handleStatusChange(lic.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-lg font-medium border-0 ${LICENSE_COLORS[lic.license_status] || 'bg-gray-100'}`}
                    >
                      {LICENSE_STATUSES.map((s) => <option key={s} value={s}>{snakeToTitle(s)}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(lic.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add License Modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setAddModal(false); setShowInlineRH(false); }} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Rights Holder License</h3>

            {!showInlineRH ? (
              <>
                {/* Side Selection */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Side</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAddSide('master')}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        addSide === 'master'
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Master
                    </button>
                    <button
                      onClick={() => setAddSide('publishing')}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        addSide === 'publishing'
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Publishing
                    </button>
                  </div>
                </div>

                {/* Rights Holder Selection */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rights Holder</label>
                  <select
                    value={selectedRightsHolderId}
                    onChange={(e) => setSelectedRightsHolderId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">Select a rights holder...</option>
                    {rightsHolders.map((rh: any) => (
                      <option key={rh.id} value={rh.id}>{rh.name} ({rh.type})</option>
                    ))}
                  </select>
                </div>

                {/* Create New Rights Holder Link */}
                <button
                  onClick={() => setShowInlineRH(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 inline-flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Create New Rights Holder
                </button>

                {/* Share Percentage */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Share Percentage</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={sharePercentage}
                      onChange={(e) => setSharePercentage(e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>

                {/* Fee Preview */}
                {selectedRightsHolderId && sharePercentage && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Calculated Fee</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(
                        (addSide === 'master' ? (deal.master_fee_override ?? deal.fee_per_side ?? 0) : (deal.fee_per_side ?? 0)) *
                        (parseFloat(sharePercentage) / 100)
                      )}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <button onClick={() => { setAddModal(false); setShowInlineRH(false); }} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  <button
                    onClick={handleAddLicense}
                    disabled={!selectedRightsHolderId || !sharePercentage || adding}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {adding ? 'Adding...' : 'Add License'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Inline Create Rights Holder Form */}
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 space-y-3 mb-4">
                  <p className="text-sm font-medium text-purple-800">Create New Rights Holder</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                    <input
                      type="text"
                      value={inlineRHForm.name}
                      onChange={(e) => setInlineRHForm({ ...inlineRHForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="e.g., Sony Music Publishing"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                    <select
                      value={inlineRHForm.type}
                      onChange={(e) => setInlineRHForm({ ...inlineRHForm, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="label">Label</option>
                      <option value="publisher">Publisher</option>
                      <option value="artist">Artist</option>
                      <option value="writer">Writer</option>
                      <option value="producer">Producer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={inlineRHForm.contact_name}
                      onChange={(e) => setInlineRHForm({ ...inlineRHForm, contact_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={inlineRHForm.contact_email}
                      onChange={(e) => setInlineRHForm({ ...inlineRHForm, contact_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => { setShowInlineRH(false); setInlineRHForm({ name: '', type: 'label', contact_name: '', contact_email: '' }); }} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Back</button>
                  <button
                    onClick={handleInlineRHCreate}
                    disabled={!inlineRHForm.name.trim() || inlineRHSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {inlineRHSubmitting ? 'Creating...' : 'Create & Select'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================

function TimelineTab({
  entries,
  loading,
  dealId,
  onRefresh,
}: {
  entries: TimelineEntry[] | null;
  loading: boolean;
  dealId: string;
  onRefresh: () => void;
}) {
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'note_added',
          description: noteText.trim(),
          metadata: {},
        }),
      });
      if (!res.ok) throw new Error('Failed to add note');
      setShowNoteForm(false);
      setNoteText('');
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error adding note');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading timeline...</p>;

  const sorted = entries
    ? [...entries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
        <button
          onClick={() => setShowNoteForm(!showNoteForm)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {showNoteForm ? 'Cancel' : 'Add Note'}
        </button>
      </div>

      {/* Note form */}
      {showNoteForm && (
        <form
          onSubmit={handleAddNote}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5 space-y-3"
        >
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
            <textarea
              rows={3}
              required
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Add a note to the timeline..."
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !noteText.trim()}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </form>
      )}

      {sorted.length === 0 ? (
        <p className="text-gray-400 text-sm">No timeline events yet.</p>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-5">
            {sorted.map((entry) => (
              <div key={entry.id} className="relative pl-10">
                {/* Dot */}
                <div className="absolute left-2.5 top-4 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow-sm" />

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${eventTypeColor(entry.event_type)}`}
                    >
                      {snakeToTitle(entry.event_type)}
                    </span>
                    <span className="text-xs text-gray-400">{formatDateTime(entry.created_at)}</span>
                  </div>
                  {entry.description && (
                    <p className="text-sm text-gray-700">{entry.description}</p>
                  )}
                  {(entry.old_value || entry.new_value) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {entry.old_value && (
                        <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded">{snakeToTitle(entry.old_value)}</span>
                      )}
                      {entry.old_value && entry.new_value && (
                        <span className="mx-1.5 text-gray-400">&rarr;</span>
                      )}
                      {entry.new_value && (
                        <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded">{snakeToTitle(entry.new_value)}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
