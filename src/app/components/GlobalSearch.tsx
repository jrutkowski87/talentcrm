'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

interface SearchResults {
  deals: any[];
  talent: any[];
  clients: any[];
  reps: any[];
  songs: any[];
  rightsHolders: any[];
}

const ENTITY_CONFIG: { key: keyof SearchResults; label: string; href: (item: any) => string; display: (item: any) => { name: string; detail: string } }[] = [
  { key: 'deals', label: 'Deals', href: (i) => `/deals/${i.id}`, display: (i) => ({ name: i.deal_name, detail: i.client_name || i.deal_type }) },
  { key: 'talent', label: 'Talent', href: (i) => `/talent/${i.id}`, display: (i) => ({ name: i.name, detail: i.category || '' }) },
  { key: 'clients', label: 'Clients', href: (i) => `/clients/${i.id}`, display: (i) => ({ name: i.name, detail: i.agency || '' }) },
  { key: 'reps', label: 'Reps', href: (i) => `/reps/${i.id}`, display: (i) => ({ name: i.name, detail: i.agency || i.role || '' }) },
  { key: 'songs', label: 'Songs', href: (i) => `/songs/${i.id}`, display: (i) => ({ name: i.title, detail: i.artist_name || '' }) },
  { key: 'rightsHolders', label: 'Rights Holders', href: (i) => `/rights-holders/${i.id}`, display: (i) => ({ name: i.name, detail: i.type || '' }) },
];

const ENTITY_COLORS: Record<string, string> = {
  deals: 'bg-indigo-500',
  talent: 'bg-teal-500',
  clients: 'bg-orange-500',
  reps: 'bg-purple-500',
  songs: 'bg-rose-500',
  rightsHolders: 'bg-amber-500',
};

export default function GlobalSearch({ collapsed }: { collapsed?: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedCollapsed, setExpandedCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) setResults(data.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (collapsed) setExpandedCollapsed(true);
        inputRef.current?.focus();
        setShowResults(true);
      }
      if (e.key === 'Escape') {
        setShowResults(false);
        setExpandedCollapsed(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [collapsed]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
        setExpandedCollapsed(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const totalResults = results
    ? Object.values(results).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  // Collapsed mode: show only icon
  if (collapsed && !expandedCollapsed) {
    return (
      <button
        onClick={() => { setExpandedCollapsed(true); setTimeout(() => inputRef.current?.focus(), 100); }}
        className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
        title="Search (Cmd+K)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    );
  }

  return (
    <div ref={containerRef} className={collapsed ? 'fixed left-16 top-16 z-[60] w-72' : 'relative'}>
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          placeholder="Search..."
          className="w-full pl-9 pr-12 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-gray-700 text-[10px] text-gray-400 rounded border border-gray-600 font-mono">
          {'\u2318'}K
        </kbd>
      </div>

      {showResults && (query.length >= 2) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 max-h-80 overflow-y-auto z-[60]">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-400">Searching...</div>
          )}
          {!loading && totalResults === 0 && (
            <div className="px-4 py-3 text-sm text-gray-400">No results found</div>
          )}
          {!loading && results && ENTITY_CONFIG.map(({ key, label, href, display }) => {
            const items = results[key];
            if (!items || items.length === 0) return null;
            return (
              <div key={key}>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${ENTITY_COLORS[key]}`} />
                  {label}
                  <span className="text-gray-400">({items.length})</span>
                </div>
                {items.slice(0, 5).map((item: any) => {
                  const d = display(item);
                  return (
                    <Link
                      key={item.id}
                      href={href(item)}
                      onClick={() => { setShowResults(false); setQuery(''); setExpandedCollapsed(false); }}
                      className="flex items-center justify-between px-4 py-2 hover:bg-indigo-50 transition-colors"
                    >
                      <span className="text-sm text-gray-900 font-medium truncate">{d.name}</span>
                      {d.detail && <span className="text-xs text-gray-400 ml-2 shrink-0">{d.detail}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
