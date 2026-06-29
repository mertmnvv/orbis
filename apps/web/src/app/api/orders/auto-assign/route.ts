import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const BodySchema = z.object({ order_id: z.string().uuid() });

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Sunucu yapılandırma hatası.' }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'order_id gerekli.' }, { status: 400 });
  }
  const { order_id } = parsed.data;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status, restaurant_id, courier_id')
    .eq('id', order_id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
  }
  if (order.status !== 'pending') {
    return NextResponse.json({ error: 'Sadece "pending" durumundaki siparişler atanabilir.' }, { status: 409 });
  }
  if (order.courier_id) {
    return NextResponse.json({ error: 'Siparişe zaten kurye atanmış.' }, { status: 409 });
  }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('lat, lng')
    .eq('id', order.restaurant_id)
    .single();

  const { data: couriers } = await supabase
    .from('couriers')
    .select('id, name, current_lat, current_lng')
    .eq('restaurant_id', order.restaurant_id)
    .eq('is_active', true)
    .eq('is_available', true);

  if (!couriers || couriers.length === 0) {
    return NextResponse.json({ error: 'Müsait kurye bulunamadı.' }, { status: 404 });
  }

  let nearest = couriers[0];
  if (restaurant?.lat && restaurant?.lng) {
    let minDist = Infinity;
    for (const c of couriers) {
      if (c.current_lat == null || c.current_lng == null) continue;
      const dist = haversineKm(restaurant.lat, restaurant.lng, c.current_lat, c.current_lng);
      if (dist < minDist) {
        minDist = dist;
        nearest = c;
      }
    }
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      courier_id: nearest.id,
      status: 'assigned',
      assigned_at: new Date().toISOString(),
    })
    .eq('id', order_id);

  if (updateError) {
    return NextResponse.json({ error: 'Atama yapılamadı.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, courier: { id: nearest.id, name: nearest.name } });
}
