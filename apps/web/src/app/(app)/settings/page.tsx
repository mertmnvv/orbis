'use client';

import { useState, useEffect } from 'react';
import { Bell, Store, Link2, User, Check, ChevronRight } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const PLATFORMS = [
  { id: 'yemeksepeti', label: 'Yemeksepeti', color: '#f97316', emoji: '🍔' },
  { id: 'getir',       label: 'Getir',       color: '#7c3aed', emoji: '🚀' },
  { id: 'trendyol',    label: 'Trendyol',    color: '#dc2626', emoji: '🛒' },
  { id: 'paket_taksi', label: 'Paket Taksi', color: '#0284c7', emoji: '📦' },
];

function SectionHeader({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e1e1e] border border-[#2a2a2a]">
        <Icon className="h-4 w-4 text-[#f97316]" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-white">{title}</h2>
        <p className="text-xs text-[#52525b]">{desc}</p>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5 mb-4">
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();

  // Restaurant info state
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');
  const [workingHours, setWorkingHours] = useState('09:00 – 23:00');
  const [maxMultiOrderKm, setMaxMultiOrderKm] = useState('3.0');
  const [isSavingRestaurant, setIsSavingRestaurant] = useState(false);

  // Notification state
  const [notifyNewOrder, setNotifyNewOrder] = useState(true);
  const [notifyDelivered, setNotifyDelivered] = useState(false);

  // Integrations state
  const [integrations, setIntegrations] = useState<Record<string, { apiKey: string; isActive: boolean }>>({});
  const [isSavingIntegrations, setIsSavingIntegrations] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('orbis_restaurant_info');
    if (saved) {
      const d = JSON.parse(saved);
      setRestaurantName(d.name ?? '');
      setRestaurantAddress(d.address ?? '');
      setRestaurantPhone(d.phone ?? '');
      setWorkingHours(d.workingHours ?? '09:00 – 23:00');
      setMaxMultiOrderKm(d.maxMultiOrderKm ?? '3.0');
    }
    const nots = localStorage.getItem('orbis_notifications');
    if (nots) {
      const n = JSON.parse(nots);
      setNotifyNewOrder(n.newOrder ?? true);
      setNotifyDelivered(n.delivered ?? false);
    }

    async function loadIntegrations() {
      if (!user) return;
      const { data } = await supabase.from('restaurants').select('integrations').eq('user_id', user.id).single();
      if (data?.integrations) {
        setIntegrations(data.integrations);
      }
    }
    loadIntegrations();
  }, [user]);

  const handleSaveRestaurant = async () => {
    setIsSavingRestaurant(true);
    localStorage.setItem('orbis_restaurant_info', JSON.stringify({
      name: restaurantName,
      address: restaurantAddress,
      phone: restaurantPhone,
      workingHours,
      maxMultiOrderKm,
    }));
    // Optionally sync to supabase restaurants table
    try {
      if (restaurantName) {
        await supabase
          .from('restaurants')
          .upsert({ 
            name: restaurantName, 
            address: restaurantAddress, 
            phone: restaurantPhone,
            max_multi_order_km: parseFloat(maxMultiOrderKm) || 3.0
          }, { onConflict: 'name' });
      }
    } catch {}
    setTimeout(() => {
      setIsSavingRestaurant(false);
      toast.success('Restoran bilgileri kaydedildi.');
    }, 600);
  };

  const handleSaveNotifications = () => {
    localStorage.setItem('orbis_notifications', JSON.stringify({
      newOrder: notifyNewOrder,
      delivered: notifyDelivered,
    }));
    toast.success('Bildirim tercihleri kaydedildi.');
  };

  const handleIntegrationChange = (platformId: string, field: 'apiKey' | 'isActive', value: string | boolean) => {
    setIntegrations(prev => ({
      ...prev,
      [platformId]: {
        ...(prev[platformId] || { apiKey: '', isActive: false }),
        [field]: value
      }
    }));
  };

  const handleSaveIntegrations = async () => {
    setIsSavingIntegrations(true);
    try {
      if (restaurantName) {
         await supabase
           .from('restaurants')
           .upsert({ 
             name: restaurantName, 
             integrations 
           }, { onConflict: 'name' });
         toast.success('Entegrasyon ayarları kaydedildi.');
      } else {
         toast.error('Lütfen önce restoran bilgilerinizi (Yukarıdaki bölümü) kaydedin.');
      }
    } catch {
      toast.error('Entegrasyonlar kaydedilirken hata oluştu.');
    }
    setIsSavingIntegrations(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-2">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Ayarlar</h1>
        <p className="text-sm text-[#52525b] mt-0.5">Restoran ve sistem ayarlarını buradan yönetin.</p>
      </div>

      {/* Restaurant info */}
      <Card>
        <SectionHeader icon={Store} title="Restoran Bilgileri" desc="Temel bilgileri güncelleyin" />
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Restoran Adı</label>
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="ör. Burger Palace"
              className="w-full rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] px-4 py-2.5 text-sm text-white placeholder:text-[#52525b] focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Adres</label>
            <input
              type="text"
              value={restaurantAddress}
              onChange={(e) => setRestaurantAddress(e.target.value)}
              placeholder="ör. Bağdat Cad. No:12, Kadıköy"
              className="w-full rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] px-4 py-2.5 text-sm text-white placeholder:text-[#52525b] focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316] transition-colors"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Telefon</label>
              <input
                type="tel"
                value={restaurantPhone}
                onChange={(e) => setRestaurantPhone(e.target.value)}
                placeholder="+90 212 000 00 00"
                className="w-full rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] px-4 py-2.5 text-sm text-white placeholder:text-[#52525b] focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316] transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Çalışma Saatleri</label>
              <input
                type="text"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                placeholder="09:00 – 23:00"
                className="w-full rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] px-4 py-2.5 text-sm text-white placeholder:text-[#52525b] focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316] transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Maks. Çoklu Sipariş Mesafesi (KM)</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="20"
                value={maxMultiOrderKm}
                onChange={(e) => setMaxMultiOrderKm(e.target.value)}
                placeholder="3.0"
                className="w-full rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] px-4 py-2.5 text-sm text-white placeholder:text-[#52525b] focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316] transition-colors"
              />
            </div>
          </div>
          <button
            onClick={handleSaveRestaurant}
            disabled={isSavingRestaurant}
            className="mt-1 flex items-center gap-2 rounded-xl bg-[#f97316] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#ea6c0a] transition-colors disabled:opacity-50"
          >
            {isSavingRestaurant ? (
              <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isSavingRestaurant ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </Card>

      {/* Platform integrations */}
      <Card>
        <SectionHeader icon={Link2} title="Platform Entegrasyonları" desc="API ve webhook ayarları" />
        <div className="space-y-3">
          {PLATFORMS.map((p) => {
            const intg = integrations[p.id] || { apiKey: '', isActive: false };
            return (
              <div key={p.id} className="flex flex-col gap-3 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{p.emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{p.label}</p>
                      <p className="text-xs text-[#52525b]">/api/webhook/{p.id}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={intg.isActive} 
                      onChange={(e) => handleIntegrationChange(p.id, 'isActive', e.target.checked)} 
                    />
                    <div className="w-9 h-5 bg-[#2a2a2a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#a1a1aa] peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f97316]"></div>
                  </label>
                </div>
                {intg.isActive && (
                  <div className="pt-3 border-t border-[#2a2a2a] mt-1">
                    <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">API Anahtarı (API Key)</label>
                    <input
                      type="text"
                      value={intg.apiKey}
                      onChange={(e) => handleIntegrationChange(p.id, 'apiKey', e.target.value)}
                      placeholder={`${p.label} API Key giriniz...`}
                      className="w-full rounded-lg border border-[#2a2a2a] bg-[#121212] px-3 py-2 text-sm text-white placeholder:text-[#52525b] focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316] transition-colors"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={handleSaveIntegrations}
          disabled={isSavingIntegrations}
          className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl bg-[#2a2a2a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3f3f46] transition-colors disabled:opacity-50"
        >
          {isSavingIntegrations ? (
            <div className="h-4 w-4 rounded-full border-2 border-[#a1a1aa] border-t-transparent animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {isSavingIntegrations ? 'Kaydediliyor…' : 'Entegrasyonları Kaydet'}
        </button>
      </Card>

      {/* Notifications */}
      <Card>
        <SectionHeader icon={Bell} title="Bildirimler" desc="Tarayıcı bildirim tercihleri" />
        <div className="space-y-3">
          {[
            { label: 'Yeni sipariş geldiğinde bildir', checked: notifyNewOrder, onChange: setNotifyNewOrder },
            { label: 'Sipariş teslim edildiğinde bildir', checked: notifyDelivered, onChange: setNotifyDelivered },
          ].map(({ label, checked, onChange }) => (
            <label key={label} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-[#a1a1aa]">{label}</span>
              <div
                onClick={() => onChange(!checked)}
                className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-[#f97316]' : 'bg-[#2a2a2a]'}`}
              >
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </label>
          ))}
          <button
            onClick={handleSaveNotifications}
            className="flex items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] px-4 py-2 text-sm text-[#a1a1aa] hover:bg-[#2a2a2a] transition-colors mt-1"
          >
            <Check className="h-3.5 w-3.5" />
            Bildirimleri Kaydet
          </button>
        </div>
      </Card>

      {/* Account */}
      <Card>
        <SectionHeader icon={User} title="Hesap" desc="Oturum ve güvenlik" />
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] px-4 py-3">
            <div>
              <p className="text-xs text-[#52525b]">Giriş yapılan hesap</p>
              <p className="text-sm font-medium text-white mt-0.5">{user?.email ?? '—'}</p>
            </div>
          </div>

          <button
            onClick={() => {
              if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) signOut();
            }}
            className="w-full flex items-center justify-between rounded-xl border border-[#ef444430] bg-[#ef444410] px-4 py-3 text-sm font-medium text-[#ef4444] hover:bg-[#ef444420] transition-colors"
          >
            <span>Çıkış Yap</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </Card>
    </div>
  );
}
