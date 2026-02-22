'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';

interface ContactPopoverProps {
  entityType: 'talent' | 'client' | 'rep';
  entityId: string;
  displayName: string;
  linkHref?: string;
}

const cache = new Map<string, any>();

const CATEGORY_COLORS: Record<string, string> = {
  actor: 'bg-blue-100 text-blue-700',
  musician: 'bg-purple-100 text-purple-700',
  athlete: 'bg-green-100 text-green-700',
  influencer: 'bg-pink-100 text-pink-700',
  model: 'bg-amber-100 text-amber-700',
  creator: 'bg-cyan-100 text-cyan-700',
  comedian: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function ContactPopover({ entityType, entityId, displayName, linkHref }: ContactPopoverProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  const apiPath = entityType === 'talent' ? 'talent' : entityType === 'client' ? 'clients' : 'reps';

  const fetchData = useCallback(async () => {
    const cacheKey = `${entityType}-${entityId}`;
    if (cache.has(cacheKey)) {
      setData(cache.get(cacheKey));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/${apiPath}/${entityId}`);
      if (res.ok) {
        const json = await res.json();
        const entity = json.data || json;
        cache.set(cacheKey, entity);
        setData(entity);
      }
    } catch {}
    setLoading(false);
  }, [entityType, entityId, apiPath]);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShowPopover(true);
      fetchData();
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowPopover(false);
  };

  const renderContent = () => {
    if (loading || !data) {
      return <div className="px-4 py-3 text-xs text-gray-400">Loading...</div>;
    }

    if (entityType === 'talent') {
      return (
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">{data.name}</h4>
            {data.category && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_COLORS[data.category] || CATEGORY_COLORS.other}`}>
                {data.category}
              </span>
            )}
          </div>
          {data.location && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {data.location}
            </p>
          )}
          {data.rate_range && (
            <p className="text-xs text-gray-500">Rate: {data.rate_range}</p>
          )}
          {data.rating && (
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(s => (
                <span key={s} className={`text-xs ${s <= data.rating ? 'text-yellow-400' : 'text-gray-300'}`}>&#9733;</span>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (entityType === 'client') {
      return (
        <div className="p-4 space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">{data.name}</h4>
          {data.dba_name && <p className="text-xs text-gray-500">DBA: {data.dba_name}</p>}
          {data.agency && <p className="text-xs text-gray-500">Agency: {data.agency}</p>}
          {data.deal_count !== undefined && (
            <p className="text-xs text-gray-500">{data.deal_count} deal{data.deal_count !== 1 ? 's' : ''}</p>
          )}
        </div>
      );
    }

    // rep
    return (
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">{data.name}</h4>
          {data.role && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
              {data.role}
            </span>
          )}
        </div>
        {data.agency && <p className="text-xs text-gray-500">{data.agency}</p>}
        {data.email && <p className="text-xs text-gray-500">{data.email}</p>}
        {data.phone && <p className="text-xs text-gray-500">{data.phone}</p>}
        {data.avg_response_days && (
          <p className="text-xs text-gray-500">Avg response: {data.avg_response_days}d</p>
        )}
      </div>
    );
  };

  const nameElement = linkHref ? (
    <Link href={linkHref} className="text-indigo-600 hover:text-indigo-800 underline decoration-dotted underline-offset-2 transition-colors">
      {displayName}
    </Link>
  ) : (
    <span className="text-indigo-600 cursor-pointer underline decoration-dotted underline-offset-2">
      {displayName}
    </span>
  );

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {nameElement}
      {showPopover && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
             style={{ animation: 'fadeIn 0.15s ease-out' }}>
          {renderContent()}
          {linkHref && data && (
            <div className="px-4 pb-3">
              <Link href={linkHref} className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium">
                View Profile →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
