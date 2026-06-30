'use client';

import Link from 'next/link';
import { Menu, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useLayoutContext } from '@/providers/LayoutProvider';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Mock Integration Component for TopBar
type IntegrationStatus = 'open' | 'busy' | 'closed';

function IntegrationToggle({ name, status: initialStatus, imageSrc }: { name: string; status: IntegrationStatus; imageSrc: string }) {
  const [status, setStatus] = useState<IntegrationStatus>(initialStatus);

  return (
    <div className="flex items-center gap-2 bg-[#1e1e1e] p-1 rounded-xl border border-[#2a2a2a]">
      <div className="flex items-center justify-center w-8 h-8 bg-white rounded-lg overflow-hidden shrink-0">
        <img src={imageSrc} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="flex items-center p-0.5 bg-[#141414] rounded-lg">
        <button
          onClick={() => setStatus('open')}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-md transition-colors',
            status === 'open' ? 'bg-green-500/20 text-green-500' : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          Açık
        </button>
        <button
          onClick={() => setStatus('busy')}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-md transition-colors',
            status === 'busy' ? 'bg-orange-500/20 text-orange-500' : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          Yoğun
        </button>
        <button
          onClick={() => setStatus('closed')}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-md transition-colors',
            status === 'closed' ? 'bg-red-500/20 text-red-500' : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          Kapalı
        </button>
      </div>
    </div>
  );
}

export function TopBar() {
  const { user, signOut } = useAuth();
  const { toggleSidebar } = useLayoutContext();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      supabase.from('restaurants').select('name').eq('user_id', user.id).maybeSingle().then(({ data }) => {
        if (data?.name) {
          setRestaurantName(data.name.toUpperCase());
        } else {
          setRestaurantName(user.email ? user.email.split('@')[0].toUpperCase() : 'RESTORAN ADI');
        }
      });
    }
  }, [user]);

  return (
    <header className="h-16 shrink-0 border-b border-[#2a2a2a] bg-[#141414] px-4 flex items-center justify-between">
      {/* Left side: Hamburger & Logo */}
      <div className="flex items-center gap-4 w-72">
        <button
          onClick={toggleSidebar}
          className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-[#1e1e1e] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden shadow-lg shadow-orange-900/30">
            <img src="/logo-icon.png" alt="Orbis" className="h-8 w-8 object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white leading-none mb-1">
              {restaurantName ?? 'YÜKLENİYOR...'}
            </span>
            <span className="text-[10px] text-zinc-400 leading-none">
              Orbis Panel
            </span>
          </div>
        </div>
      </div>

      {/* Center: Integrations */}
      <div className="flex-1 flex items-center justify-center gap-4">
        <IntegrationToggle name="Yemeksepeti" imageSrc="/integrations/yemeksepeti.svg" status="open" />
        <IntegrationToggle name="Getir" imageSrc="/integrations/getir.svg" status="busy" />
        <IntegrationToggle name="Trendyol Go" imageSrc="/integrations/trendyol.svg" status="closed" />
      </div>

      {/* Right side: Settings & Profile */}
      <div className="flex items-center gap-3 w-72 justify-end">
        <Link
          href="/settings"
          className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-[#1e1e1e] transition-colors"
          title="Sistem Ayarları"
        >
          <Settings className="w-5 h-5" />
        </Link>
        
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1.5 pr-3 text-sm font-medium text-zinc-400 hover:text-white rounded-full hover:bg-[#1e1e1e] transition-colors border border-transparent hover:border-[#2a2a2a]"
          >
            <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white">
              <User className="w-4 h-4" />
            </div>
            <span className="truncate max-w-[120px]">{restaurantName ?? 'Hesabım'}</span>
          </button>

          {isProfileOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[#2a2a2a] bg-[#141414] shadow-lg shadow-black/50 z-20 overflow-hidden py-1">
                <Link
                  href="/settings?tab=account"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-[#1e1e1e] hover:text-white transition-colors"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <User className="w-4 h-4" />
                  Hesap Ayarları
                </Link>
                <div className="h-px bg-[#2a2a2a] my-1" />
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-[#1e1e1e] hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Çıkış Yap
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
