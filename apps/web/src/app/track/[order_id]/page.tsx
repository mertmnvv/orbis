'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, Clock, Package, Truck, Star, MapPin, Phone } from 'lucide-react';

interface TrackingOrder {
  id: string;
  status: string;
  customer_name: string;
  customer_address: string;
  restaurant_name?: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  courier_id: string | null;
  customer_rating: number | null;
  customer_comment: string | null;
  courier?: {
    name: string;
    phone: string;
    current_lat: number | null;
    current_lng: number | null;
  } | null;
}

const STATUS_STEPS = [
  { key: 'preparing', label: 'Hazırlanıyor', icon: Package, color: 'text-orange-400' },
  { key: 'pending', label: 'Kurye Bekleniyor', icon: Clock, color: 'text-yellow-400' },
  { key: 'assigned', label: 'Kurye Yolda (Restorana)', icon: Truck, color: 'text-blue-400' },
  { key: 'picked_up', label: 'Kurye Teslim Aldı', icon: Truck, color: 'text-purple-400' },
  { key: 'delivered', label: 'Teslim Edildi', icon: CheckCircle, color: 'text-green-400' },
];

const STATUS_ORDER = ['preparing', 'pending', 'assigned', 'picked_up', 'delivered'];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`h-8 w-8 transition-colors ${
              star <= (hovered || value) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function TrackingPage({ params }: { params: { order_id: string } }) {
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchOrder() {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, status, customer_name, customer_address, total_amount,
        payment_method, created_at, assigned_at, picked_up_at, delivered_at,
        courier_id, customer_rating, customer_comment,
        courier:couriers (name, phone, current_lat, current_lng)
      `)
      .eq('id', params.order_id)
      .single();

    if (error || !data) {
      setError('Sipariş bulunamadı veya takip linki geçersiz.');
    } else {
      setOrder(data as unknown as TrackingOrder);
      if (data.customer_rating) {
        setRatingDone(true);
        setRating(data.customer_rating);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchOrder();

    const channel = supabase
      .channel(`track-${params.order_id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${params.order_id}` }, () => {
        fetchOrder();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.order_id]);

  async function handleSubmitRating() {
    if (!rating) return;
    setRatingSubmitting(true);
    try {
      const res = await fetch(`/api/track/${params.order_id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      if (res.ok) {
        setRatingDone(true);
      } else {
        const body = await res.json().catch(() => ({}));
        alert(body?.error ?? 'Puanlama kaydedilemedi.');
      }
    } finally {
      setRatingSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#f97316] border-t-transparent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 text-center">
        <div>
          <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-white text-lg font-semibold">Sipariş Bulunamadı</p>
          <p className="text-gray-500 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const currentStepIndex = STATUS_ORDER.indexOf(order.status);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center py-6">
        <div className="inline-flex items-center gap-2 bg-[#f97316]/10 border border-[#f97316]/20 rounded-full px-4 py-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-[#f97316] animate-pulse" />
          <span className="text-[#f97316] text-sm font-semibold">Canlı Takip</span>
        </div>
        <h1 className="text-2xl font-bold">Siparişiniz Takipte</h1>
        <p className="text-gray-500 text-sm mt-1">#{order.id.slice(0, 8).toUpperCase()}</p>
      </div>

      {/* Status Timeline */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Durum</h2>
        <div className="space-y-3">
          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                  isCompleted
                    ? 'bg-[#f97316]/20 border-[#f97316]/40'
                    : 'bg-[#1e1e1e] border-[#2a2a2a]'
                }`}>
                  <Icon className={`h-4 w-4 ${isCompleted ? step.color : 'text-gray-600'}`} />
                </div>
                <span className={`text-sm font-medium ${
                  isCurrent ? 'text-white' : isCompleted ? 'text-gray-400' : 'text-gray-700'
                }`}>
                  {step.label}
                </span>
                {isCurrent && (
                  <span className="ml-auto text-[10px] bg-[#f97316]/15 text-[#f97316] px-2 py-0.5 rounded-full font-semibold animate-pulse">
                    Şu An
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Courier Info */}
      {order.courier && (order.status === 'assigned' || order.status === 'picked_up') && (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Kurye Bilgisi</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Truck className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-semibold">{order.courier.name}</p>
                <p className="text-gray-500 text-sm">{order.courier.phone}</p>
              </div>
            </div>
            <a
              href={`tel:${order.courier.phone}`}
              className="flex items-center gap-1.5 rounded-xl bg-green-500/10 border border-green-500/20 px-3 py-2 text-green-400 text-sm font-semibold hover:bg-green-500/20 transition-colors"
            >
              <Phone className="h-4 w-4" />
              Ara
            </a>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Sipariş Özeti</h2>
        <div className="flex items-start gap-2 mb-2">
          <MapPin className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
          <p className="text-gray-300 text-sm">{order.customer_address}</p>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2a2a2a]">
          <span className="text-gray-400 text-sm">Toplam</span>
          <span className="text-white font-bold">₺{Number(order.total_amount).toFixed(2)}</span>
        </div>
      </div>

      {/* Rating Section — only after delivery */}
      {order.status === 'delivered' && (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5 mb-4">
          {ratingDone ? (
            <div className="text-center py-2">
              <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
              <p className="text-white font-semibold">Değerlendirmeniz Alındı!</p>
              <div className="flex justify-center gap-1 mt-2">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`h-5 w-5 ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                ))}
              </div>
              {comment && <p className="text-gray-400 text-sm mt-2 italic">"{comment}"</p>}
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-white mb-1">Teslimatı Nasıl Buldunuz?</h2>
              <p className="text-gray-500 text-sm mb-4">Geri bildiriminiz kurye performansını iyileştirmemize yardımcı olur.</p>
              <div className="flex justify-center mb-4">
                <StarRating value={rating} onChange={setRating} />
              </div>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Yorumunuz (isteğe bağlı)..."
                rows={3}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-[#f97316]/50 mb-4"
              />
              <button
                onClick={handleSubmitRating}
                disabled={!rating || ratingSubmitting}
                className="w-full bg-[#f97316] text-white font-bold rounded-xl py-3 text-sm transition-opacity disabled:opacity-40 hover:opacity-90 active:opacity-80"
              >
                {ratingSubmitting ? 'Kaydediliyor...' : 'Değerlendirimi Gönder'}
              </button>
            </>
          )}
        </div>
      )}

      <p className="text-center text-gray-700 text-xs pb-6">Orbis Teslimat Sistemi tarafından sunulmaktadır.</p>
    </div>
  );
}
