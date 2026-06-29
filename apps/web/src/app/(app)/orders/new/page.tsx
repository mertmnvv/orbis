'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Search, MapPin, ShoppingCart, Plus, Minus, ArrowLeft, Clock, User, AlertTriangle, CreditCard, Banknote, Wifi, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useMenuItems } from '@/hooks/useMenuItems';
import { fetchCustomerByPhone, fetchCustomersByName, useUpsertCustomer } from '@/hooks/useCustomers';
import { useZones } from '@/hooks/useZones';
import { formatCurrency } from '@/lib/utils';
import { MenuItem, Customer, Restaurant, PaymentMethod } from '@/lib/types';

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

function useRestaurant() {
  const { user } = useAuth();
  return useQuery<Restaurant | null>({
    queryKey: ['restaurant', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      return data as Restaurant | null;
    },
    enabled: !!user?.id,
  });
}

function pointInPolygon(pt: [number, number], ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

async function geocodeAddress(address: string, token: string): Promise<{ lat: number; lng: number; label: string } | null> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&country=TR&language=tr&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const feature = json.features?.[0];
  if (!feature) return null;
  return {
    lng: feature.center[0],
    lat: feature.center[1],
    label: feature.place_name,
  };
}

export default function NewOrderPage() {
  const router = useRouter();
  const { data: restaurant } = useRestaurant();
  const { data: menuItems = [], isLoading: menuLoading } = useMenuItems(restaurant?.id ?? null);
  const { data: zones = [] } = useZones();
  const upsertCustomer = useUpsertCustomer();

  // Customer state
  const [searchMode, setSearchMode] = useState<'phone' | 'name'>('phone');
  const [phone, setPhone] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [nameResults, setNameResults] = useState<Customer[]>([]);
  const [isNameSearching, setIsNameSearching] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [geoResult, setGeoResult] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [foundCustomer, setFoundCustomer] = useState<Customer | null | undefined>(undefined);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outOfZoneWarning, setOutOfZoneWarning] = useState(false);
  const [pendingGeoResult, setPendingGeoResult] = useState<{ lat: number; lng: number; label: string } | null>(null);

  // Menu state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(menuItems.filter(i => i.is_available).map(i => i.category)));
    return cats.sort();
  }, [menuItems]);

  const activeCategory = selectedCategory ?? categories[0] ?? null;

  const visibleItems = useMemo(
    () => menuItems.filter(i => i.is_available && i.category === activeCategory),
    [menuItems, activeCategory],
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0),
    [cart],
  );

  const cartCount = useMemo(() => cart.reduce((sum, c) => sum + c.quantity, 0), [cart]);

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === itemId);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter(c => c.menuItem.id !== itemId);
      return prev.map(c => c.menuItem.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  }, []);

  function getCartQty(itemId: string): number {
    return cart.find(c => c.menuItem.id === itemId)?.quantity ?? 0;
  }

  async function handlePhoneSearch() {
    if (!phone.trim() || !restaurant?.id) return;
    setIsSearching(true);
    try {
      const customer = await fetchCustomerByPhone(phone.trim(), restaurant.id);
      setFoundCustomer(customer);
      if (customer) {
        setCustomerName(customer.name);
        setAddress(customer.address);
        setGeoResult(customer.lat && customer.lng ? { lat: customer.lat, lng: customer.lng, label: customer.address } : null);
        toast.success(`${customer.name} bulundu`);
      } else {
        setCustomerName('');
        setAddress('');
        setGeoResult(null);
        toast.info('Yeni müşteri');
      }
    } catch {
      toast.error('Arama başarısız');
    } finally {
      setIsSearching(false);
    }
  }

  async function handleNameSearch() {
    if (!nameSearch.trim() || !restaurant?.id) return;
    setIsNameSearching(true);
    try {
      const results = await fetchCustomersByName(nameSearch.trim(), restaurant.id);
      setNameResults(results);
      if (results.length === 0) toast.info('Müşteri bulunamadı');
    } catch {
      toast.error('Arama başarısız');
    } finally {
      setIsNameSearching(false);
    }
  }

  function selectCustomerFromResults(customer: Customer) {
    setFoundCustomer(customer);
    setPhone(customer.phone);
    setCustomerName(customer.name);
    setAddress(customer.address);
    setGeoResult(customer.lat && customer.lng ? { lat: customer.lat, lng: customer.lng, label: customer.address } : null);
    setNameResults([]);
    setNameSearch('');
    toast.success(`${customer.name} seçildi`);
  }

  async function handleGeocode() {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !address.trim()) return;
    setIsGeocoding(true);
    try {
      const result = await geocodeAddress(address.trim(), token);
      if (result) {
        const activeZones = zones.filter((z) => z.is_active);
        if (activeZones.length > 0) {
          const inZone = activeZones.some((zone) => {
            const ring = zone.polygon?.geometry?.coordinates?.[0] as [number, number][] | undefined;
            return ring ? pointInPolygon([result.lng, result.lat], ring) : false;
          });
          if (!inZone) {
            setPendingGeoResult(result);
            setOutOfZoneWarning(true);
            return;
          }
        }
        setGeoResult(result);
        setAddress(result.label);
        toast.success('Adres haritada bulundu');
      } else {
        toast.error('Adres bulunamadı');
      }
    } catch {
      toast.error('Geocoding başarısız');
    } finally {
      setIsGeocoding(false);
    }
  }

  function confirmOutOfZone() {
    if (!pendingGeoResult) return;
    setGeoResult(pendingGeoResult);
    setAddress(pendingGeoResult.label);
    setPendingGeoResult(null);
    setOutOfZoneWarning(false);
    toast.warning('Bölge dışı teslimat onaylandı');
  }

  async function handleSubmit() {
    if (!restaurant?.id) return;
    if (!phone.trim()) { toast.error('Telefon numarası zorunlu'); return; }
    if (!customerName.trim()) { toast.error('Müşteri adı zorunlu'); return; }
    if (!address.trim()) { toast.error('Adres zorunlu'); return; }
    if (cart.length === 0) { toast.error('Sepet boş'); return; }

    setIsSubmitting(true);
    try {
      // Upsert customer
      await upsertCustomer.mutateAsync({
        restaurant_id: restaurant.id,
        phone: phone.trim(),
        name: customerName.trim(),
        address: address.trim(),
        lat: geoResult?.lat ?? null,
        lng: geoResult?.lng ?? null,
      });

      const prepTime = restaurant.avg_prep_time_minutes ?? 20;
      const estimatedReadyAt = new Date(Date.now() + prepTime * 60_000).toISOString();

      const { error } = await supabase.from('orders').insert({
        restaurant_id: restaurant.id,
        platform: 'manual',
        order_source: 'phone',
        status: 'preparing',
        customer_name: customerName.trim(),
        customer_phone: phone.trim(),
        customer_address: address.trim(),
        customer_lat: geoResult?.lat ?? null,
        customer_lng: geoResult?.lng ?? null,
        items: cart.map(c => ({ name: c.menuItem.name, quantity: c.quantity, price: c.menuItem.price })),
        total_amount: cartTotal,
        notes: notes.trim() || null,
        preparation_time_minutes: prepTime,
        estimated_ready_at: estimatedReadyAt,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'online_paid' ? 'not_required' : 'pending',
      });

      if (error) throw error;

      toast.success('Sipariş oluşturuldu');
      router.push('/orders');
    } catch (err) {
      console.error(err);
      toast.error('Sipariş oluşturulamadı');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">
      {/* Out-of-zone warning modal */}
      {outOfZoneWarning && pendingGeoResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-white">Bölge Dışı Adres</h3>
            </div>
            <p className="mb-1 text-sm text-[#a1a1aa]">
              Bu adres teslimat bölgelerinizin dışında kalmaktadır.
            </p>
            <p className="mb-6 text-xs text-[#52525b]">{pendingGeoResult.label}</p>
            <p className="mb-6 text-sm font-medium text-white">Yine de teslimat sağlayacak mısınız?</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setOutOfZoneWarning(false); setPendingGeoResult(null); }}
                className="flex-1 rounded-xl border border-[#2a2a2a] py-2.5 text-sm text-[#a1a1aa] hover:border-[#3a3a3a] hover:text-white transition-colors"
              >
                İptal
              </button>
              <button
                onClick={confirmOutOfZone}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                Evet, Devam Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 border-b border-[#2a2a2a] bg-[#141414] px-6 py-4">
        <button
          onClick={() => router.push('/orders')}
          className="flex items-center gap-1.5 text-sm text-[#71717a] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Geri
        </button>
        <h1 className="text-lg font-bold text-white">Telefon Siparişi</h1>
        {restaurant?.avg_prep_time_minutes && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-[#71717a]">
            <Clock className="h-3.5 w-3.5" />
            Ort. hazırlama: {restaurant.avg_prep_time_minutes} dk
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Customer & Delivery */}
        <div className="w-[380px] shrink-0 flex flex-col border-r border-[#2a2a2a] overflow-y-auto">
          <div className="p-5 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                Müşteri
              </label>
              {/* Search mode toggle */}
              <div className="flex gap-1 rounded-lg bg-[#141414] border border-[#2a2a2a] p-1 mb-3">
                <button
                  onClick={() => { setSearchMode('phone'); setNameResults([]); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
                    searchMode === 'phone' ? 'bg-[#f97316] text-white' : 'text-[#71717a] hover:text-white'
                  }`}
                >
                  <Phone className="h-3.5 w-3.5" />
                  Telefon
                </button>
                <button
                  onClick={() => { setSearchMode('name'); setFoundCustomer(undefined); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
                    searchMode === 'name' ? 'bg-[#f97316] text-white' : 'text-[#71717a] hover:text-white'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  İsim
                </button>
              </div>

              {/* Phone search */}
              {searchMode === 'phone' && (
                <div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52525b]" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePhoneSearch()}
                        placeholder="0555 123 45 67"
                        className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#52525b] focus:border-[#f97316] focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handlePhoneSearch}
                      disabled={isSearching || !phone.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] px-3 py-2 text-sm text-[#a1a1aa] hover:text-white hover:border-[#3a3a3a] disabled:opacity-50 transition-colors"
                    >
                      <Search className="h-4 w-4" />
                      {isSearching ? '...' : 'Ara'}
                    </button>
                  </div>
                  {foundCustomer !== undefined && (
                    <div className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${foundCustomer ? 'bg-green-500/10 text-green-400' : 'bg-[#1a1a1a] text-[#71717a]'}`}>
                      <User className="h-3.5 w-3.5 shrink-0" />
                      {foundCustomer ? 'Kayıtlı müşteri bulundu' : 'Yeni müşteri — bilgileri doldurun'}
                    </div>
                  )}
                </div>
              )}

              {/* Name search */}
              {searchMode === 'name' && (
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52525b]" />
                      <input
                        type="text"
                        value={nameSearch}
                        onChange={(e) => setNameSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNameSearch()}
                        placeholder="Müşteri adıyla ara..."
                        className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#52525b] focus:border-[#f97316] focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleNameSearch}
                      disabled={isNameSearching || !nameSearch.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] px-3 py-2 text-sm text-[#a1a1aa] hover:text-white hover:border-[#3a3a3a] disabled:opacity-50 transition-colors"
                    >
                      <Search className="h-4 w-4" />
                      {isNameSearching ? '...' : 'Ara'}
                    </button>
                  </div>
                  {nameResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl overflow-hidden">
                      {nameResults.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => selectCustomerFromResults(c)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#242424] transition-colors border-b border-[#2a2a2a] last:border-0"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2a2a2a]">
                            <User className="h-4 w-4 text-[#71717a]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{c.name}</p>
                            <p className="text-xs text-[#52525b]">{c.phone}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Customer name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                Ad Soyad
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Müşteri adı"
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2.5 text-sm text-white placeholder-[#52525b] focus:border-[#f97316] focus:outline-none"
              />
            </div>

            {/* Address */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                Teslimat Adresi
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-[#52525b]" />
                <textarea
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); setGeoResult(null); }}
                  placeholder="Adres, mahalle, ilçe..."
                  rows={3}
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#52525b] focus:border-[#f97316] focus:outline-none resize-none"
                />
              </div>
              <button
                onClick={handleGeocode}
                disabled={isGeocoding || !address.trim()}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#2a2a2a] py-2 text-xs text-[#a1a1aa] hover:border-[#f97316] hover:text-[#f97316] disabled:opacity-50 transition-colors"
              >
                <MapPin className="h-3.5 w-3.5" />
                {isGeocoding ? 'Haritada aranıyor...' : 'Haritada Bul'}
              </button>
              {geoResult && (
                <div className="mt-2 rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-400">
                  Bulundu: {geoResult.lat.toFixed(4)}, {geoResult.lng.toFixed(4)}
                </div>
              )}
            </div>

            {/* Payment method */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                Ödeme Yöntemi
              </label>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { value: 'cash', label: 'Nakit', icon: Banknote, color: '#fbbf24' },
                  { value: 'card', label: 'Kart', icon: CreditCard, color: '#60a5fa' },
                  { value: 'food_card', label: 'Yemek Kartı', icon: Wallet, color: '#818cf8' },
                  { value: 'online_paid', label: 'Online', icon: Wifi, color: '#22c55e' },
                ] as const).map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentMethod(value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition-all ${
                      paymentMethod === value
                        ? 'border-[--c] bg-[--c]/10 text-[--c]'
                        : 'border-[#2a2a2a] bg-[#1a1a1a] text-[#71717a] hover:border-[#3a3a3a] hover:text-white'
                    }`}
                    style={{ ['--c' as string]: color }}
                  >
                    <Icon className="h-4 w-4" style={{ color: paymentMethod === value ? color : undefined }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                Sipariş Notu
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Özel istek, kat, daire no..."
                rows={2}
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2.5 text-sm text-white placeholder-[#52525b] focus:border-[#f97316] focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Cart Summary (sticky at bottom) */}
          <div className="border-t border-[#2a2a2a] bg-[#141414] p-4 mt-auto">
            <div className="mb-3 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-[#f97316]" />
              <span className="text-sm font-semibold text-white">Sepet</span>
              {cartCount > 0 && (
                <span className="ml-auto rounded-full bg-[#f97316] px-2 py-0.5 text-xs font-semibold text-white">
                  {cartCount} ürün
                </span>
              )}
            </div>
            {cart.length === 0 ? (
              <p className="text-xs text-[#52525b]">Sağdan ürün ekleyin</p>
            ) : (
              <div className="space-y-1.5 mb-3">
                {cart.map((c) => (
                  <div key={c.menuItem.id} className="flex items-center justify-between text-sm">
                    <span className="text-[#a1a1aa] truncate flex-1">
                      {c.quantity}x {c.menuItem.name}
                    </span>
                    <span className="text-white ml-2 shrink-0">
                      {formatCurrency(c.menuItem.price * c.quantity)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-[#2a2a2a] pt-2 flex justify-between font-semibold text-white">
                  <span>Toplam</span>
                  <span className="text-[#f97316]">{formatCurrency(cartTotal)}</span>
                </div>
              </div>
            )}

            {restaurant?.avg_prep_time_minutes && (
              <p className="mb-3 flex items-center gap-1.5 text-xs text-[#71717a]">
                <Clock className="h-3.5 w-3.5" />
                Tahmini hazırlama: ~{restaurant.avg_prep_time_minutes} dk
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || cart.length === 0}
              className="w-full rounded-lg bg-[#f97316] py-2.5 text-sm font-semibold text-white hover:bg-[#ea6c0a] disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Oluşturuluyor...' : 'Siparişi Oluştur'}
            </button>
          </div>
        </div>

        {/* Right Column: Menu */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Category tabs */}
          <div className="flex gap-1 border-b border-[#2a2a2a] bg-[#141414] px-4 py-3 overflow-x-auto">
            {menuLoading ? (
              <span className="text-xs text-[#52525b]">Menü yükleniyor...</span>
            ) : categories.length === 0 ? (
              <span className="text-xs text-[#52525b]">Henüz menü ürünü yok. Önce /menu sayfasından ekleyin.</span>
            ) : (
              categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-[#f97316] text-white'
                      : 'bg-[#1e1e1e] text-[#a1a1aa] hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))
            )}
          </div>

          {/* Menu items grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {visibleItems.length === 0 ? (
              <p className="text-sm text-[#52525b] text-center pt-10">Bu kategoride ürün yok</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                {visibleItems.map((item) => {
                  const qty = getCartQty(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border bg-[#141414] p-4 transition-colors ${
                        qty > 0 ? 'border-[#f97316]/50' : 'border-[#2a2a2a]'
                      }`}
                    >
                      <p className="text-sm font-medium text-white leading-tight">{item.name}</p>
                      {item.description && (
                        <p className="mt-0.5 text-xs text-[#71717a] line-clamp-2">{item.description}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#f97316]">
                          {formatCurrency(item.price)}
                        </span>
                        {qty === 0 ? (
                          <button
                            onClick={() => addToCart(item)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f97316] text-white hover:bg-[#ea6c0a] transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#2a2a2a] text-[#a1a1aa] hover:text-white transition-colors"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-4 text-center text-sm font-semibold text-white">{qty}</span>
                            <button
                              onClick={() => addToCart(item)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f97316] text-white hover:bg-[#ea6c0a] transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
