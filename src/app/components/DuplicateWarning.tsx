'use client';

import { useState, useEffect, useRef } from 'react';

interface Duplicate {
  id: string;
  name: string;
  matchType: 'exact' | 'similar';
}

interface DuplicateWarningProps {
  entityType: 'client' | 'talent' | 'deal';
  name: string;
  onDismiss?: () => void;
}

const ENTITY_LINKS: Record<string, string> = {
  client: '/clients',
  talent: '/talent',
  deal: '/deals',
};

export default function DuplicateWarning({ entityType, name, onDismiss }: DuplicateWarningProps) {
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastChecked = useRef('');

  useEffect(() => {
    // Reset dismissed when name changes significantly
    setDismissed(false);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setDuplicates([]);
      return;
    }

    // Don't re-check if same normalized value
    if (trimmed.toLowerCase() === lastChecked.current) return;

    timerRef.current = setTimeout(async () => {
      lastChecked.current = trimmed.toLowerCase();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(
          `/api/duplicates?name=${encodeURIComponent(trimmed)}&type=${entityType}`,
          { signal: controller.signal }
        );
        const json = await res.json();
        if (json.success) {
          setDuplicates(json.duplicates || []);
        }
      } catch {
        if (!controller.signal.aborted) setDuplicates([]);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [name, entityType]);

  if (dismissed || duplicates.length === 0) return null;

  const hasExact = duplicates.some(d => d.matchType === 'exact');

  return (
    <div className={`mt-1.5 rounded-lg border px-3 py-2 text-xs ${
      hasExact
        ? 'bg-amber-50 border-amber-300 text-amber-800'
        : 'bg-yellow-50 border-yellow-200 text-yellow-700'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 min-w-0">
          <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-medium">
              {hasExact ? 'Potential duplicate found!' : `Similar ${entityType}${duplicates.length > 1 ? 's' : ''} found`}
            </p>
            <div className="mt-1 space-y-0.5">
              {duplicates.map((d) => (
                <div key={d.id} className="flex items-center gap-1.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${d.matchType === 'exact' ? 'bg-amber-500' : 'bg-yellow-400'}`} />
                  <a
                    href={`${ENTITY_LINKS[entityType]}/${d.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    {d.name}
                  </a>
                  <span className="text-[10px] opacity-60">({d.matchType})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            setDismissed(true);
            onDismiss?.();
          }}
          className="p-0.5 rounded hover:bg-amber-100 shrink-0"
          title="Dismiss"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
