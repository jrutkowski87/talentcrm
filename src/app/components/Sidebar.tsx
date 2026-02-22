'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSidebar } from './SidebarContext';
import GlobalSearch from './GlobalSearch';
import AlertsPanel from './AlertsPanel';

const navSections = [
  {
    label: 'DEALS',
    items: [
      { href: '/', label: 'Dashboard', icon: 'home' },
      { href: '/deals', label: 'Deals', icon: 'deals' },
    ],
  },
  {
    label: 'TALENT',
    items: [
      { href: '/talent', label: 'Talent', icon: 'talent' },
      { href: '/reps', label: 'Reps', icon: 'reps' },
    ],
  },
  {
    label: 'MUSIC',
    items: [
      { href: '/songs', label: 'Songs', icon: 'songs' },
      { href: '/rights-holders', label: 'Rights Holders', icon: 'rightsholders' },
    ],
  },
  {
    label: 'ADMIN',
    items: [
      { href: '/clients', label: 'Clients', icon: 'clients' },
    ],
  },
];

const icons: Record<string, JSX.Element> = {
  home: (
    <svg className="w-5 h-5 sidebar-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
    </svg>
  ),
  deals: (
    <svg className="w-5 h-5 sidebar-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  ),
  talent: (
    <svg className="w-5 h-5 sidebar-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  reps: (
    <svg className="w-5 h-5 sidebar-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  songs: (
    <svg className="w-5 h-5 sidebar-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  ),
  rightsholders: (
    <svg className="w-5 h-5 sidebar-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  clients: (
    <svg className="w-5 h-5 sidebar-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
};

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  const [alertCount, setAlertCount] = useState(0);
  const [showAlerts, setShowAlerts] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  useEffect(() => {
    fetch('/api/alerts')
      .then(r => r.json())
      .then(d => { if (d.success) setAlertCount(d.count || 0); })
      .catch(() => {});
  }, []);

  return (
    <>
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white flex flex-col fixed inset-y-0 left-0 z-50 transition-all duration-300`}>
        {/* Header */}
        <div className={`${collapsed ? 'px-2 py-4' : 'px-6 py-5'} border-b border-gray-800 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold tracking-wide">TalentCRM</h1>
              <p className="text-[10px] text-gray-500 mt-0.5">Talent & Music Deals</p>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {/* Alerts bell */}
            <button
              onClick={() => setShowAlerts(true)}
              className="relative p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
              title="Alerts"
            >
              <svg className="w-4.5 h-4.5" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>
            {/* Collapse toggle */}
            <button
              onClick={toggle}
              className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-1">
            <GlobalSearch />
          </div>
        )}
        {collapsed && (
          <div className="px-2 pt-3 pb-1 flex justify-center">
            <GlobalSearch collapsed />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-3 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest text-gray-600 uppercase">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    {icons[item.icon]}
                    {!collapsed && item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Export button */}
        <div className="px-2 pb-1">
          <button
            onClick={() => { window.location.href = '/api/export'; }}
            className={`flex items-center ${collapsed ? 'justify-center px-2' : 'gap-2 px-3'} w-full py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors`}
            title={collapsed ? 'Export Data' : undefined}
          >
            <svg className="w-4 h-4 sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {!collapsed && 'Export Data'}
          </button>
        </div>

        {/* Profile */}
        <div className={`${collapsed ? 'px-2 py-3' : 'px-4 py-3'} border-t border-gray-800`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium shrink-0">
              JR
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm font-medium">Jeff R.</p>
                <p className="text-[10px] text-gray-500">Admin</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Alerts Panel */}
      <AlertsPanel isOpen={showAlerts} onClose={() => setShowAlerts(false)} />
    </>
  );
}
