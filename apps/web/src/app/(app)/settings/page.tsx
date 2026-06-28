'use client';

import { useState, useEffect } from 'react';
import {
  Bell, Store, Link2, User, Check, Clock,
  Utensils, Zap, ShoppingBag, Package, LucideIcon,
  LogOut, Save,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const PLATFORMS: { id: string; label: string; color: string; icon: LucideIcon }[] = [
  { id: 'yemeksepeti', label: 'Yemeksepeti', color: '#f97316', icon: Utensils },
  { id: 'getir',       label: 'Getir',       color: '#7c3aed', icon: Zap },
  { id: 'trendyol',    label: 'Trendyol',    color: '#dc2626', icon: ShoppingBag },
  { id: 'paket_taksi', label: 'Paket Taksi', color: '#0284c7', icon: Package },
];

type Section = 'restaurant' | 'integrations' | 'notifications' | 'account';

const NAV_ITEMS: { id: Section; label: string; icon: LucideIcon; desc: string }[] = [
  { id: 'restaurant',    label: 'Restoran',       icon: Store, desc: 'Temel bilgiler ve operasyon' },
  { id: 'integrations',  label: 'Entegrasyonlar', icon: Link2, desc: 'Platform API bağlantıları' },
  { id: 'notifications', label: 'Bildirimler',    icon: Bell,  desc: 'Tarayıcı bildirimleri' },
  { id: 'account',       label: 'Hesap',          icon: User,  desc: 'Oturum ve güvenlik' },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#a1a1aa] mb-2">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-[#52525b]">{hint}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-[#3f3f46] focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316]/20 transition-all"
    />
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-[#f97316]' : 'bg-[#2a2a2a]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function SaveButton({ onClick, loading, label = 'Değişiklikleri Kaydet' }: { onClick: () => void; loading: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl bg-[#f97316] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#ea6c0a] transition-colors disabled:opacity-50"
    >
      {loading ? (
        <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {loading ? 'Kaydediliyor…' : label}
    </button>
  );
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('restaurant');

  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');
  const [workingHours, setWorkingHours] = useState('09:00 – 23:00');
  const [maxMultiOrderKm, setMaxMultiOrderKm] = useState('3.0');
  const [maxMultiOrderCount, setMaxMultiOrderCount] = useState('3');
  const [avgPrepTime, setAvgPrepTime] = useState('20');
  const [isSavingRestaurant, setIsSavingRestaurant] = useState(false);

  const [notifyNewOrder, setNotifyNewOrder] = useState(true);
  const [notifyDelivered, setNotifyDelivered] = useState(false);

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
      setMaxMultiOrderCount(d.maxMultiOrderCount ?? '3');
      setAvgPrepTime(d.avgPrepTime ?? '20');
    }
    const nots = localStorage.getItem('orbis_notifications');
    if (nots) {
      const n = JSON.parse(nots);
      setNotifyNewOrder(n.newOrder ?? true);
      setNotifyDelivered(n.delivered ?? false);
    }

    async function loadRestaurantFromDb() {
      if (!user) return;
      const { data } = await supabase
        .from('restaurants')
        .select('name, address, phone, integrations, avg_prep_time_minutes, max_multi_order_km, max_multi_order_count')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!data) return;
      if (data.name) setRestaurantName(data.name);
      if (data.address) setRestaurantAddress(data.address);
      if (data.phone) setRestaurantPhone(data.phone);
      if (data.integrations) setIntegrations(data.integrations);
      if (data.avg_prep_time_minutes != null) setAvgPrepTime(String(data.avg_prep_time_minutes));
      if (data.max_multi_order_km != null) setMaxMultiOrderKm(String(data.max_multi_order_km));
      if (data.max_multi_order_count != null) setMaxMultiOrderCount(String(data.max_multi_order_count));
    }
    loadRestaurantFromDb();
  }, [user]);

  const handleSaveRestaurant = async () => {
    setIsSavingRestaurant(true);
    const prepTimeInt = parseInt(avgPrepTime) || 20;
    localStorage.setItem('orbis_restaurant_info', JSON.stringify({
      name: restaurantName, address: restaurantAddress, phone: restaurantPhone,
      workingHours, maxMultiOrderKm, maxMultiOrderCount, avgPrepTime,
    }));
    try {
      if (restaurantName && user) {
        const payload = {
          user_id: user.id, name: restaurantName, address: restaurantAddress,
          phone: restaurantPhone,
          max_multi_order_km: parseFloat(maxMultiOrderKm) || 3.0,
          max_multi_order_count: parseInt(maxMultiOrderCount) || 3,
          avg_prep_time_minutes: prepTimeInt,
          lat: 0, lng: 0,
        };
        const { data: existing } = await supabase.from('restaurants').select('id').eq('user_id', user.id).maybeSingle();
        if (existing?.id) {
          await supabase.from('restaurants').update(payload).eq('id', existing.id);
        } else {
          await supabase.from('restaurants').insert(payload);
        }
      }
    } catch (err) {
      console.error('Restaurant save error:', err);
    }
    setTimeout(() => {
      setIsSavingRestaurant(false);
      toast.success('Restoran bilgileri kaydedildi.');
    }, 600);
  };

  const handleSaveNotifications = () => {
    localStorage.setItem('orbis_notifications', JSON.stringify({ newOrder: notifyNewOrder, delivered: notifyDelivered }));
    toast.success('Bildirim tercihleri kaydedildi.');
  };

  const handleIntegrationChange = (platformId: string, field: 'apiKey' | 'isActive', value: string | boolean) => {
    setIntegrations(prev => ({
      ...prev,
      [platformId]: { ...(prev[platformId] || { apiKey: '', isActive: false }), [field]: value },
    }));
  };

  const handleSaveIntegrations = async () => {
    if (!user) return;
    setIsSavingIntegrations(true);
    try {
      const { data: existing } = await supabase.from('restaurants').select('id').eq('user_id', user.id).maybeSingle();
      if (existing?.id) {
        await supabase.from('restaurants').update({ integrations }).eq('id', existing.id);
        toast.success('Entegrasyon ayarları kaydedildi.');
      } else {
        toast.error('Önce Restoran Bilgileri bölümünden restoran adı kaydedin.');
      }
    } catch {
      toast.error('Entegrasyonlar kaydedilirken hata oluştu.');
    }
    setIsSavingIntegrations(false);
  };

  return (
    <div className="flex h-full bg-[#0a0a0a]">
      {/* Sidebar */}
      <div className="w-60 shrink-0 border-r border-[#161616] bg-[#0d0d0d] flex flex-col py-7 px-3">
        <div className="px-3 mb-7">
          <h1 className="text-base font-bold text-white">Ayarlar</h1>
          <p className="text-xs text-[#52525b] mt-0.5">Sistem tercihlerini yönetin</p>
        </div>
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? 'bg-[#f97316]/10 border border-[#f97316]/15 text-white'
                    : 'border border-transparent text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#161616]'
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isActive ? 'bg-[#f97316]/15' : 'bg-[#161616]'
                }`}>
                  <item.icon className={`h-4 w-4 ${isActive ? 'text-[#f97316]' : 'text-[#52525b]'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none">{item.label}</p>
                  <p className={`text-xs mt-1 truncate ${isActive ? 'text-[#71717a]' : 'text-[#3f3f46]'}`}>{item.desc}</p>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-8 space-y-8">

          {/* ── Restaurant ── */}
          {activeSection === 'restaurant' && (
            <>
              <div>
                <h2 className="text-lg font-bold text-white">Restoran Bilgileri</h2>
                <p className="text-sm text-[#52525b] mt-1">Restoranınızın temel bilgilerini ve operasyon parametrelerini güncelleyin.</p>
              </div>

              <div className="rounded-2xl border border-[#1c1c1c] bg-[#111] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1c1c1c]">
                  <p className="text-sm font-semibold text-white">Temel Bilgiler</p>
                </div>
                <div className="p-6 space-y-4">
                  <Field label="Restoran Adı">
                    <Input type="text" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} placeholder="ör. Burger Palace" />
                  </Field>
                  <Field label="Adres">
                    <Input type="text" value={restaurantAddress} onChange={(e) => setRestaurantAddress(e.target.value)} placeholder="ör. Bağdat Cad. No:12, Kadıköy" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Telefon">
                      <Input type="tel" value={restaurantPhone} onChange={(e) => setRestaurantPhone(e.target.value)} placeholder="+90 212 000 00 00" />
                    </Field>
                    <Field label="Çalışma Saatleri">
                      <Input type="text" value={workingHours} onChange={(e) => setWorkingHours(e.target.value)} placeholder="09:00 – 23:00" />
                    </Field>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#1c1c1c] bg-[#111] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1c1c1c]">
                  <p className="text-sm font-semibold text-white">Operasyon Parametreleri</p>
                  <p className="text-xs text-[#52525b] mt-0.5">Kurye atama ve çoklu sipariş eşikleri</p>
                </div>
                <div className="p-6 grid grid-cols-3 gap-4">
                  <Field label="Ort. Hazırlama (dk)" hint="Kuryeler sipariş kartında görür">
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52525b]" />
                      <input
                        type="number" step="1" min="1" max="120"
                        value={avgPrepTime} onChange={(e) => setAvgPrepTime(e.target.value)}
                        placeholder="20"
                        className="w-full rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] pl-9 pr-4 py-3 text-sm text-white placeholder:text-[#3f3f46] focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316]/20 transition-all"
                      />
                    </div>
                  </Field>
                  <Field label="Maks. Çoklu Mesafe (km)">
                    <Input type="number" step="0.1" min="0.5" max="20" value={maxMultiOrderKm} onChange={(e) => setMaxMultiOrderKm(e.target.value)} placeholder="3.0" />
                  </Field>
                  <Field label="Maks. Paket Sayısı">
                    <Input type="number" step="1" min="1" max="10" value={maxMultiOrderCount} onChange={(e) => setMaxMultiOrderCount(e.target.value)} placeholder="3" />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end">
                <SaveButton onClick={handleSaveRestaurant} loading={isSavingRestaurant} />
              </div>
            </>
          )}

          {/* ── Integrations ── */}
          {activeSection === 'integrations' && (
            <>
              <div>
                <h2 className="text-lg font-bold text-white">Platform Entegrasyonları</h2>
                <p className="text-sm text-[#52525b] mt-1">Yemeksepeti, Getir ve diğer platformlar için API bağlantılarını yönetin.</p>
              </div>

              <div className="space-y-3">
                {PLATFORMS.map((p) => {
                  const intg = integrations[p.id] || { apiKey: '', isActive: false };
                  return (
                    <div key={p.id} className="rounded-2xl border border-[#1c1c1c] bg-[#111] overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#0a0a0a]">
                            <p.icon className="h-5 w-5" style={{ color: p.color }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{p.label}</p>
                            <p className="text-xs text-[#3f3f46] font-mono mt-0.5">POST /api/webhook/{p.id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-medium ${intg.isActive ? 'text-green-400' : 'text-[#3f3f46]'}`}>
                            {intg.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox" className="sr-only peer"
                              checked={intg.isActive}
                              onChange={(e) => handleIntegrationChange(p.id, 'isActive', e.target.checked)}
                            />
                            <div className="w-10 h-5 bg-[#2a2a2a] rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-[#52525b] peer-checked:after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f97316]" />
                          </label>
                        </div>
                      </div>
                      {intg.isActive && (
                        <div className="border-t border-[#1c1c1c] px-5 py-4 bg-[#0c0c0c]">
                          <Field label="API Anahtarı">
                            <Input
                              type="password"
                              value={intg.apiKey}
                              onChange={(e) => handleIntegrationChange(p.id, 'apiKey', e.target.value)}
                              placeholder={`${p.label} API Key...`}
                            />
                          </Field>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <SaveButton onClick={handleSaveIntegrations} loading={isSavingIntegrations} label="Entegrasyonları Kaydet" />
              </div>
            </>
          )}

          {/* ── Notifications ── */}
          {activeSection === 'notifications' && (
            <>
              <div>
                <h2 className="text-lg font-bold text-white">Bildirim Tercihleri</h2>
                <p className="text-sm text-[#52525b] mt-1">Tarayıcı bildirimlerini özelleştirin.</p>
              </div>

              <div className="rounded-2xl border border-[#1c1c1c] bg-[#111] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1c1c1c]">
                  <p className="text-sm font-semibold text-white">Sipariş Bildirimleri</p>
                </div>
                <div className="divide-y divide-[#1c1c1c]">
                  {[
                    { label: 'Yeni Sipariş', desc: 'Yeni bir sipariş geldiğinde tarayıcıdan bildirim al', checked: notifyNewOrder, onChange: setNotifyNewOrder },
                    { label: 'Teslim Edildi', desc: 'Sipariş başarıyla teslim edildiğinde bildirim al', checked: notifyDelivered, onChange: setNotifyDelivered },
                  ].map(({ label, desc, checked, onChange }) => (
                    <div key={label} className="flex items-center justify-between px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-white">{label}</p>
                        <p className="text-xs text-[#52525b] mt-0.5">{desc}</p>
                      </div>
                      <Toggle checked={checked} onChange={onChange} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <SaveButton onClick={handleSaveNotifications} loading={false} label="Bildirimleri Kaydet" />
              </div>
            </>
          )}

          {/* ── Account ── */}
          {activeSection === 'account' && (
            <>
              <div>
                <h2 className="text-lg font-bold text-white">Hesap</h2>
                <p className="text-sm text-[#52525b] mt-1">Hesap bilgilerinizi ve oturum ayarlarınızı yönetin.</p>
              </div>

              <div className="rounded-2xl border border-[#1c1c1c] bg-[#111] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1c1c1c]">
                  <p className="text-sm font-semibold text-white">Oturum Bilgileri</p>
                </div>
                <div className="p-6 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f97316]/10 border border-[#f97316]/20">
                    <User className="h-6 w-6 text-[#f97316]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{user?.email ?? '—'}</p>
                    <p className="text-xs text-[#52525b] mt-0.5">Giriş yapılan hesap</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-green-400 font-medium">Aktif</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-red-500/10 bg-red-500/5 overflow-hidden">
                <div className="px-6 py-4 border-b border-red-500/10">
                  <p className="text-sm font-semibold text-red-400">Tehlikeli Bölge</p>
                </div>
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Oturumu Kapat</p>
                    <p className="text-xs text-[#52525b] mt-0.5">Hesabınızdan güvenli şekilde çıkış yapın</p>
                  </div>
                  <button
                    onClick={() => { if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) signOut(); }}
                    className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Çıkış Yap
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
