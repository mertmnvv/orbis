import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { WebhookOrderSchema, mapWebhookToOrder } from '@orbis/validators';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? '';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function POST(req: NextRequest) {
  // Authenticate webhook caller
  const secret = req.headers.get('x-webhook-secret');
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse and validate body
  const body = await req.json().catch(() => null);
  const parsed = WebhookOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Geçersiz sipariş verisi', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Resolve restaurant_id from x-restaurant-id header (set by the webhook caller)
  // or fall back to WEBHOOK_RESTAURANT_ID env for single-tenant setups
  const restaurantId =
    req.headers.get('x-restaurant-id') ?? process.env.WEBHOOK_RESTAURANT_ID ?? '';

  if (!restaurantId) {
    return NextResponse.json(
      { error: 'restaurant_id çözümlenemedi. x-restaurant-id header veya WEBHOOK_RESTAURANT_ID env gerekli.' },
      { status: 400 },
    );
  }

  // Check for duplicate (same platform + external_id)
  if (parsed.data.external_id) {
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('platform', parsed.data.source)
      .eq('platform_order_id', parsed.data.external_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Sipariş zaten mevcut.', order_id: existing.id }, { status: 409 });
    }
  }

  // Insert the order
  const payload = mapWebhookToOrder(parsed.data, restaurantId);
  const { data: created, error } = await supabase
    .from('orders')
    .insert(payload)
    .select('id')
    .single();

  if (error || !created) {
    console.error('[webhook] insert error', error);
    return NextResponse.json({ error: 'Sipariş oluşturulamadı.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, order_id: created.id }, { status: 201 });
}
