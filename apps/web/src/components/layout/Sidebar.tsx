'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, LogOut, Settings, Users, Map } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Siparişler', icon: ClipboardList, matchPaths: ['/dashboard', '/orders'] },
  { href: '/couriers',  label: 'Kuryeler',   icon: Users,          matchPaths: ['/couriers'] },
  { href: '/zones',     label: 'Bölgeler',   icon: Map,            matchPaths: ['/zones'] },
  { href: '/settings',  label: 'Ayarlar',    icon: Settings,       matchPaths: ['/settings'] },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-[#2a2a2a] bg-[#141414]">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-[#2a2a2a] px-5 py-[18px]">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl overflow-hidden shadow-lg shadow-orange-900/30">
          <img src="/logo-icon.png" alt="Orbis" className="h-8 w-8 object-cover" />
        </div>
        <span className="text-base font-bold tracking-tight text-white">
          Orbis
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon, matchPaths }) => {
          const isActive = matchPaths.some((p) => pathname.startsWith(p));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-[#1e1e1e] text-white border-l-2 border-[#f97316]'
                  : 'text-[#52525b] hover:bg-[#1e1e1e] hover:text-[#a1a1aa]',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  isActive ? 'text-[#f97316]' : 'text-[#52525b]',
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-[#2a2a2a] p-4">
        <p className="truncate text-xs font-semibold text-[#a1a1aa]">
          {user?.email ?? 'Restoran'}
        </p>
        <button
          onClick={signOut}
          className="mt-2 flex items-center gap-1.5 text-xs text-[#52525b] hover:text-[#ef4444] transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
