'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { snakeToTitle } from '@/lib/format';

interface Alert {
  type: string;
  severity: 'high' | 'medium';
  deal_id: string;
  deal_name: string;
  deal_type: string;
  client_name: string | null;
  status: string;
  days_in_stage: number;
  threshold_days: number;
  message: string;
}

export default function AlertsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/alerts')
      .then(r => r.json())
      .then(d => { if (d.success) setAlerts(d.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-[60]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Alerts</h2>
            <p className="text-xs text-gray-500 mt-0.5">Deals that need attention</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="px-6 py-8 text-center text-sm text-gray-400">Loading alerts...</div>
          )}

          {!loading && alerts.length === 0 && (
            <div className="px-6 py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">All clear!</p>
              <p className="text-xs text-gray-500 mt-1">No stale deals found.</p>
            </div>
          )}

          {!loading && alerts.length > 0 && (
            <div className="divide-y divide-gray-100">
              {alerts.map((alert, i) => (
                <div key={`${alert.deal_id}-${i}`} className={`px-6 py-4 ${alert.severity === 'high' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-amber-400'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/deals/${alert.deal_id}`}
                        onClick={onClose}
                        className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                      >
                        {alert.deal_name}
                      </Link>
                      {alert.client_name && (
                        <p className="text-xs text-gray-500 mt-0.5">{alert.client_name}</p>
                      )}
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      alert.severity === 'high'
                        ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                        : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20'
                    }`}>
                      {alert.days_in_stage}d
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                      {snakeToTitle(alert.status)}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Threshold: {alert.threshold_days}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {alerts.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 shrink-0">
            <p className="text-xs text-gray-500 text-center">{alerts.length} alert{alerts.length !== 1 ? 's' : ''} total</p>
          </div>
        )}
      </div>
    </>
  );
}
