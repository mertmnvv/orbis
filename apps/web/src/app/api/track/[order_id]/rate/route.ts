import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const RatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

// Uses service role key so it can bypass RLS and write the rating
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function POST(req: NextRequest, { params }: { params: { order_id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = RatingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz puanlama verisi.' }, { status: 400 });
  }

  const { rating, comment } = parsed.data;
  const orderId = params.order_id;

  // Verify order exists and has been delivered and not yet rated
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('id, status, customer_rating')
    .eq('id', orderId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
  }
  if (existing.status !== 'delivered') {
    return NextResponse.json({ error: 'Sipariş henüz teslim edilmedi.' }, { status: 409 });
  }
  if (existing.customer_rating !== null) {
    return NextResponse.json({ error: 'Bu sipariş zaten puanlandı.' }, { status: 409 });
  }

  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ customer_rating: rating, customer_comment: comment ?? null })
    .eq('id', orderId);

  if (updateError) {
    return NextResponse.json({ error: 'Puanlama kaydedilemedi.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
