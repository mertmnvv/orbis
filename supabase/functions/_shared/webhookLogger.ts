import { supabaseAdmin } from "./supabaseAdmin.ts";

interface LogWebhookArgs {
  restaurantId: string | null;
  platform: string;
  rawPayload: unknown;
  error?: string;
}

/** Ham payload'ı platform_webhooks tablosuna yazar; webhook ID'sini döndürür. */
export async function logWebhook(args: LogWebhookArgs): Promise<string | null> {
  const { data, error: dbErr } = await supabaseAdmin
    .from("platform_webhooks")
    .insert({
      restaurant_id: args.restaurantId,
      platform: args.platform,
      raw_payload: args.rawPayload,
      error: args.error ?? null,
    })
    .select("id")
    .single();

  if (dbErr) {
    // Loglama başarısız olursa sadece konsola yaz, ana akışı durdurma
    console.error("[webhook-logger] DB insert başarısız:", dbErr.message);
    return null;
  }
  return (data as { id: string }).id;
}

/** Webhook'un başarıyla işlendiğini işaretler. */
export async function markProcessed(webhookId: string): Promise<void> {
  await supabaseAdmin
    .from("platform_webhooks")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", webhookId);
}

/** Webhook kaydına hata mesajı ekler. */
export async function markFailed(webhookId: string, error: string): Promise<void> {
  await supabaseAdmin
    .from("platform_webhooks")
    .update({ error })
    .eq("id", webhookId);
}
