'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { formatTimeAgo } from '@/lib/utils';
import type { Courier, VehicleType } from '@/lib/types';
import {
  Bike,
  Car,
  Footprints,
  Phone,
  Check,
  X,
  Edit2,
  Users,
  Shield,
  Clock,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  UserPlus,
  UserMinus,
  Mail,
  Key,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

const VEHICLE_CONFIG: Record<
  VehicleType,
  { label: string; icon: any; colorClass: string }
> = {
  bicycle: {
    label: 'Bisiklet',
    icon: Bike,
    colorClass: 'text-emerald-400 bg-emerald-500/10',
  },
  motorcycle: {
    label: 'Motosiklet',
    icon: Bike,
    colorClass: 'text-orange-400 bg-orange-500/10',
  },
  scooter: {
    label: 'Skuter',
    icon: Bike,
    colorClass: 'text-amber-400 bg-amber-500/10',
  },
  car: {
    label: 'Otomobil',
    icon: Car,
    colorClass: 'text-blue-400 bg-blue-500/10',
  },
  on_foot: {
    label: 'Yaya',
    icon: Footprints,
    colorClass: 'text-purple-400 bg-purple-500/10',
  },
};

export function CouriersPanel() {
  const { user } = useAuth();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimPhone, setClaimPhone] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [claimName, setClaimName] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [createdCourierCreds, setCreatedCourierCreds] = useState<{ email: string; password: string } | null>(null);

  // Resolve the restaurant belonging to the logged-in admin user, then fetch couriers
  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    async function init() {
      const { data: restData } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (cancelled) return;

      const resId = restData?.id ?? null;
      setRestaurantId(resId);

      if (!resId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('couriers')
          .select('*')
          .eq('restaurant_id', resId)
          .order('name', { ascending: true });
        if (error) throw error;
        if (!cancelled && data) setCouriers(data);
      } catch (err) {
        console.error('Kuryeler yüklenirken hata:', err);
        toast.error('Kurye listesi yüklenemedi');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Realtime subscription — scoped to this restaurant
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel(`couriers-realtime-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couriers',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCourier = payload.new as Courier;
            setCouriers((prev) => {
              const exists = prev.some((c) => c.id === newCourier.id);
              if (exists) return prev;
              return [...prev, newCourier].sort((a, b) => a.name.localeCompare(b.name));
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Courier;
            // If restaurant_id was cleared (released), remove from list
            if (!updated.restaurant_id || updated.restaurant_id !== restaurantId) {
              setCouriers((prev) => prev.filter((c) => c.id !== updated.id));
            } else {
              setCouriers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            }
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setCouriers((prev) => prev.filter((c) => c.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleStartEdit = (courier: Courier) => {
    setEditingId(courier.id);
    setEditingName(courier.name);
  };

  const handleSaveName = async (id: string) => {
    if (!editingName.trim()) {
      toast.error('İsim boş olamaz');
      return;
    }
    try {
      const { error } = await supabase
        .from('couriers')
        .update({ name: editingName.trim() })
        .eq('id', id);
      if (error) throw error;
      toast.success('Kurye ismi güncellendi');
      setEditingId(null);
    } catch (err) {
      console.error('Kurye güncellenirken hata:', err);
      toast.error('Kurye ismi güncellenemedi');
    }
  };

  const handleToggleActive = async (courier: Courier) => {
    try {
      const nextActive = !courier.is_active;
      const { error } = await supabase
        .from('couriers')
        .update({ is_active: nextActive })
        .eq('id', courier.id);
      if (error) throw error;
      toast.success(
        nextActive ? `${courier.name} aktif edildi` : `${courier.name} pasife alındı`
      );
    } catch (err) {
      console.error('Aktiflik güncellenirken hata:', err);
      toast.error('Güncelleme işlemi başarısız');
    }
  };

  const handleReleaseCourier = async (courier: Courier) => {
    try {
      const { data, error } = await supabase.rpc('release_courier', { p_courier_id: courier.id });
      if (error) throw error;
      if (!data) {
        toast.error('Kurye çıkarılamadı');
        return;
      }
      setCouriers((prev) => prev.filter((c) => c.id !== courier.id));
      toast.success(`${courier.name} restoranınızdan çıkarıldı`);
    } catch (err) {
      console.error('Kurye çıkarılırken hata:', err);
      toast.error('Kurye çıkarılırken bir hata oluştu');
    }
  };

  const handleClaimCourier = async () => {
    if (!claimPhone.trim() || !claimEmail.trim() || !claimName.trim() || !restaurantId) {
      toast.error('Lütfen tüm alanları doldurun (İsim, Telefon, E-posta).');
      return;
    }
    setClaimLoading(true);

    // Normalize to E.164 format (+90XXXXXXXXXX) so it matches what Supabase Auth stores
    const digits = claimPhone.replace(/\D/g, '');
    let normalizedPhone: string;
    if (digits.startsWith('90') && digits.length === 12) {
      normalizedPhone = `+${digits}`;
    } else if (digits.startsWith('0') && digits.length === 11) {
      normalizedPhone = `+90${digits.slice(1)}`;
    } else if (digits.length === 10 && !digits.startsWith('0')) {
      normalizedPhone = `+90${digits}`;
    } else {
      toast.error('Geçerli bir telefon numarası girin (ör. 5XX XXX XX XX)');
      setClaimLoading(false);
      return;
    }

    try {
      // Get auth token from client supabase session
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Call secure next API route to create courier account
      const res = await fetch('/api/couriers/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          email: claimEmail.trim(),
          phone: normalizedPhone,
          name: claimName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Kurye eklenirken bir hata oluştu');
      }

      toast.success(`${claimName.trim()} başarıyla eklendi!`);
      setClaimModalOpen(false);
      setClaimPhone('');
      setClaimName('');
      setClaimEmail('');

      // Show generated credentials modal
      setCreatedCourierCreds({ email: data.email, password: data.password });
    } catch (err: any) {
      console.error('Kurye eklenirken hata:', err);
      toast.error(err.message || 'Kurye eklenirken bir hata oluştu');
    } finally {
      setClaimLoading(false);
    }
  };

  // İstatistikler
  const totalCount = couriers.length;
  const activeCount = couriers.filter((c) => c.is_active).length;
  const availableCount = couriers.filter((c) => c.is_active && c.is_available).length;
  const offlineCount = totalCount - availableCount;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Üst başlık + Kurye Ekle butonu */}
      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={() => setClaimModalOpen(true)}
          disabled={!restaurantId}
          className="inline-flex items-center gap-2 rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ea6c0e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <UserPlus className="h-4 w-4" />
          Kurye Ekle
        </button>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Toplam Kurye</p>
              <h3 className="mt-2 text-3xl font-semibold text-white">{totalCount}</h3>
            </div>
            <div className="rounded-lg bg-orange-500/10 p-3 text-orange-500">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Sistemde Aktif</p>
              <h3 className="mt-2 text-3xl font-semibold text-white">{activeCount}</h3>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-3 text-blue-500">
              <UserCheck className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Sipariş Alabilir (Müsait)</p>
              <h3 className="mt-2 text-3xl font-semibold text-white">{availableCount}</h3>
            </div>
            <div className="rounded-lg bg-green-500/10 p-3 text-green-500">
              <Shield className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Çevrimdışı / Meşgul</p>
              <h3 className="mt-2 text-3xl font-semibold text-white">{offlineCount}</h3>
            </div>
            <div className="rounded-lg bg-zinc-500/10 p-3 text-zinc-400">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Kurye Tablosu */}
      <div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#141414]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2a2a2a] bg-[#1a1a1a]/50 text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">
                <th className="px-6 py-4">Kurye Adı</th>
                <th className="px-6 py-4">İletişim</th>
                <th className="px-6 py-4">Taşıt</th>
                <th className="px-6 py-4">Müsaitlik</th>
                <th className="px-6 py-4">Sistem Durumu</th>
                <th className="px-6 py-4">Son Görülme</th>
                <th className="px-6 py-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a] text-sm text-white">
              {couriers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#52525b]">
                    Restoranınıza bağlı kurye yok. &quot;Kurye Ekle&quot; ile telefon numarası girin.
                  </td>
                </tr>
              ) : (
                couriers.map((courier) => {
                  const VehicleIcon = VEHICLE_CONFIG[courier.vehicle_type]?.icon || Bike;
                  const vehicleLabel = VEHICLE_CONFIG[courier.vehicle_type]?.label || 'Bilinmiyor';
                  const vehicleColors =
                    VEHICLE_CONFIG[courier.vehicle_type]?.colorClass || 'text-zinc-400 bg-zinc-500/10';

                  const isEditing = editingId === courier.id;

                  let availabilityLabel = 'Çevrimdışı';
                  let availabilityClass = 'bg-[#1c1c1c] text-[#71717a] border-[#2a2a2a]';
                  let availabilityDot = 'bg-[#71717a]';

                  if (courier.is_active) {
                    if (courier.is_available) {
                      availabilityLabel = 'Müsait';
                      availabilityClass = 'bg-[#14532d20] text-[#22c55e] border-[#14532d40]';
                      availabilityDot = 'bg-[#22c55e] animate-pulse';
                    } else {
                      availabilityLabel = 'Müsait Değil';
                      availabilityClass = 'bg-[#431407] text-[#f97316] border-[#7c2d1240]';
                      availabilityDot = 'bg-[#f97316]';
                    }
                  }

                  return (
                    <tr
                      key={courier.id}
                      className="transition-colors duration-150 hover:bg-[#1a1a1a]/30 group/row"
                    >
                      {/* Kurye Adı */}
                      <td className="px-6 py-4 font-medium text-white">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              ref={inputRef}
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveName(courier.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="rounded border border-orange-500 bg-[#1e1e1e] px-2 py-1 text-sm text-white outline-none focus:ring-1 focus:ring-orange-500"
                            />
                            <button
                              onClick={() => handleSaveName(courier.id)}
                              className="rounded bg-green-500/20 p-1 text-green-400 hover:bg-green-500/30"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded bg-red-500/20 p-1 text-red-400 hover:bg-red-500/30"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{courier.name}</span>
                            <button
                              onClick={() => handleStartEdit(courier)}
                              className="opacity-0 group-hover/row:opacity-100 p-1 text-[#a1a1aa] hover:text-white transition-opacity duration-150"
                              title="İsmi Düzenle"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* İletişim */}
                      <td className="px-6 py-4 text-[#a1a1aa] space-y-1">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <Phone className="h-3.5 w-3.5 text-[#52525b]" />
                          <span>{courier.phone}</span>
                        </div>
                        {courier.email && (
                          <div className="flex items-center gap-1.5 text-xs text-[#71717a]">
                            <Mail className="h-3.5 w-3.5 text-[#52525b]" />
                            <span>{courier.email}</span>
                          </div>
                        )}
                      </td>

                      {/* Araç Tipi */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${vehicleColors}`}
                        >
                          <VehicleIcon className="h-3.5 w-3.5" />
                          {vehicleLabel}
                        </span>
                      </td>

                      {/* Müsaitlik */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${availabilityClass}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${availabilityDot}`} />
                          {availabilityLabel}
                        </span>
                      </td>

                      {/* Sistem Durumu */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                            courier.is_active
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {courier.is_active ? 'Aktif Kurye' : 'Engelli/Pasif'}
                        </span>
                      </td>

                      {/* Son Görülme */}
                      <td className="px-6 py-4 text-xs text-[#a1a1aa]">
                        {courier.last_seen_at ? formatTimeAgo(courier.last_seen_at) : 'Hiç görülmedi'}
                      </td>

                      {/* İşlemler */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleActive(courier)}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                              courier.is_active
                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                            }`}
                          >
                            {courier.is_active ? (
                              <>
                                <ToggleRight className="h-4 w-4 shrink-0 text-red-400" />
                                <span>Devre Dışı Bırak</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-4 w-4 shrink-0 text-green-400" />
                                <span>Hesabı Etkinleştir</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleReleaseCourier(courier)}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 transition-colors duration-150"
                            title="Kurye'yi Restoranınızdan Çıkar"
                          >
                            <UserMinus className="h-4 w-4 shrink-0" />
                            <span>Çıkar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kurye Ekle Modalı */}
      {claimModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) setClaimModalOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-xl border border-[#2a2a2a] bg-[#141414] p-6 shadow-2xl">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-white">Kurye Ekle</h2>
              <p className="mt-1 text-xs text-[#a1a1aa]">
                Telefon numarasını girin. Kurye daha önce giriş yapmamışsa sisteme ön kayıt oluşturulur.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  value={claimName}
                  onChange={(e) => setClaimName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleClaimCourier();
                    if (e.key === 'Escape') setClaimModalOpen(false);
                  }}
                  placeholder="ör. Ahmet Yılmaz"
                  autoFocus
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] py-2.5 px-3 text-sm text-white placeholder-[#3f3f46] outline-none focus:border-[#f97316] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">
                  Telefon Numarası
                </label>
                <div className="flex overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] focus-within:border-[#f97316] transition-colors">
                  <div className="flex items-center gap-1.5 border-r border-[#2a2a2a] bg-[#141414] px-3">
                    <Phone className="h-3.5 w-3.5 text-[#52525b]" />
                    <span className="text-sm font-bold text-[#71717a]">+90</span>
                  </div>
                  <input
                    type="tel"
                    value={claimPhone}
                    onChange={(e) => setClaimPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleClaimCourier();
                      if (e.key === 'Escape') setClaimModalOpen(false);
                    }}
                    placeholder="5XX XXX XX XX"
                    className="flex-1 bg-transparent py-2.5 px-3 text-sm text-white placeholder-[#3f3f46] outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">
                  E-posta Adresi
                </label>
                <div className="flex overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] focus-within:border-[#f97316] transition-colors">
                  <div className="flex items-center gap-1.5 border-r border-[#2a2a2a] bg-[#141414] px-3">
                    <Mail className="h-3.5 w-3.5 text-[#52525b]" />
                  </div>
                  <input
                    type="email"
                    value={claimEmail}
                    onChange={(e) => setClaimEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleClaimCourier();
                      if (e.key === 'Escape') setClaimModalOpen(false);
                    }}
                    placeholder="ornek@orbis.com"
                    className="flex-1 bg-transparent py-2.5 px-3 text-sm text-white placeholder-[#3f3f46] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  setClaimModalOpen(false);
                  setClaimPhone('');
                  setClaimName('');
                  setClaimEmail('');
                }}
                className="flex-1 rounded-lg border border-[#2a2a2a] bg-transparent py-2.5 text-sm font-medium text-[#a1a1aa] hover:border-[#3a3a3a] hover:text-white transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleClaimCourier}
                disabled={claimLoading || !claimPhone.trim() || !claimEmail.trim() || !claimName.trim()}
                className="flex-1 rounded-lg bg-[#f97316] py-2.5 text-sm font-semibold text-white hover:bg-[#ea6c0e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {claimLoading ? 'Ekleniyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Şifre Gösterme Modalı */}
      {createdCourierCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-[#2a2a2a] bg-[#141414] p-6 shadow-2xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2 text-green-400">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Kurye Giriş Bilgileri</h2>
                <p className="text-xs text-[#a1a1aa] mt-0.5">Lütfen bu bilgileri kuryeye iletin.</p>
              </div>
            </div>

            <div className="space-y-3 bg-[#1e1e1e] p-4 rounded-lg border border-[#2a2a2a] font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#71717a]">E-posta:</span>
                <span className="text-white font-semibold">{createdCourierCreds.email}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#2a2a2a] pt-2">
                <span className="text-[#71717a]">Şifre:</span>
                <span className="text-[#f97316] font-bold">{createdCourierCreds.password}</span>
              </div>
            </div>

            <div className="mt-3 rounded-lg bg-orange-500/5 border border-orange-500/10 p-3 text-[11px] text-orange-400 leading-normal">
              ℹ️ Kurye e-postasına gönderilen <strong>doğrulama linkine</strong> tıkladıktan sonra bu bilgilerle giriş yapabilir.
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  const text = `E-posta: ${createdCourierCreds.email}\nŞifre: ${createdCourierCreds.password}`;
                  navigator.clipboard.writeText(text);
                  toast.success('Giriş bilgileri panoya kopyalandı');
                }}
                className="flex-1 rounded-lg border border-[#2a2a2a] bg-transparent py-2.5 text-sm font-medium text-white hover:border-[#3a3a3a] transition-colors flex items-center justify-center gap-1.5"
              >
                <Copy className="h-4 w-4" />
                Kopyala
              </button>
              <button
                onClick={() => setCreatedCourierCreds(null)}
                className="flex-1 rounded-lg bg-[#f97316] py-2.5 text-sm font-semibold text-white hover:bg-[#ea6c0e] transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
