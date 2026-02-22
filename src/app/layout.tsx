'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import Sidebar from './components/Sidebar';
import { SidebarProvider, useSidebar } from './components/SidebarContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <main className={`flex-1 ${collapsed ? 'ml-16' : 'ml-64'} overflow-y-auto bg-gray-50 min-h-screen transition-all duration-300`}>
      <div className="p-8">
        {children}
      </div>
    </main>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-gray-50">
        <SidebarProvider>
          <div className="flex h-screen">
            <Sidebar />
            <MainContent>{children}</MainContent>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
