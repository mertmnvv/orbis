'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, MapPin, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockRestaurant } from '@/lib/mock-data';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Siparişler', icon: ClipboardList, matchPaths: ['/dashboard', '/orders'] },
  { href: '/couriers',  label: 'Kuryeler',   icon: Users,          matchPaths: ['/couriers'] },
  { href: '/settings',  label: 'Ayarlar',    icon: Settings,       matchPaths: ['/settings'] },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <MapPin className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-gray-900">
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
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4',
                  isActive ? 'text-indigo-600' : 'text-gray-400',
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Restaurant info */}
      <div className="border-t border-gray-100 p-4">
        <p className="truncate text-xs font-semibold text-gray-900">
          {mockRestaurant.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-gray-400">
          {mockRestaurant.address}
        </p>
      </div>
    </aside>
  );
}
