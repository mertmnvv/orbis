'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Users, Map, BarChart3, UtensilsCrossed, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLayoutContext } from '@/providers/LayoutProvider';

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Özet & Raporlar', icon: BarChart3,       matchPaths: ['/dashboard'] },
  { href: '/orders',     label: 'Siparişler',      icon: ClipboardList,   matchPaths: ['/orders'] },
  { href: '/couriers',   label: 'Kuryeler',        icon: Users,           matchPaths: ['/couriers'] },
  { href: '/menu',       label: 'Menü',            icon: UtensilsCrossed, matchPaths: ['/menu'] },
  { href: '/analytics',  label: 'Analitik',        icon: TrendingUp,      matchPaths: ['/analytics'] },
  { href: '/zones',      label: 'Bölgeler',        icon: Map,             matchPaths: ['/zones'] },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { isSidebarOpen } = useLayoutContext();

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-[#2a2a2a] bg-[#141414] transition-all duration-300 overflow-hidden",
        isSidebarOpen ? "w-60" : "w-0 border-r-0"
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-3 min-w-[240px]">
        {NAV_ITEMS.map(({ href, label, icon: Icon, matchPaths }) => {
          const isActive = matchPaths.some((p) => pathname === p || ((p as string) !== '/orders/new' && pathname.startsWith(p)));
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
    </aside>
  );
}
