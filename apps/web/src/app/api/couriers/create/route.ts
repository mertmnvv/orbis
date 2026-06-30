import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Admin client to perform auth actions with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(req: Request) {
  try {
    // 1. Authenticate caller (restaurant owner) via Bearer Token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Yetkisiz işlem. Giriş yapmalısınız (Token eksik)." },
        { status: 401 }
      );
    }
    const token = authHeader.split(" ")[1];

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser();

    if (getUserError || !user) {
      return NextResponse.json({ error: "Yetkisiz işlem. Giriş yapmalısınız." }, { status: 401 });
    }

    // Find restaurant owned by caller
    const { data: restaurant, error: resError } = await supabase
      .from("restaurants")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (resError || !restaurant) {
      return NextResponse.json({ error: "Restoran kaydı bulunamadı." }, { status: 404 });
    }

    // 2. Parse request body
    const body = await req.json();
    const { email, phone, name } = body;

    if (!email || !phone || !name) {
      return NextResponse.json(
        { error: "E-posta, telefon ve isim alanları zorunludur." },
        { status: 400 }
      );
    }

    // Clean inputs
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanName = name.trim();

    // 3. Generate random password (8 chars alpha + 1 digit)
    const randomPassword =
      Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 10);

    // 4. Create auth user (silently with password)
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: randomPassword,
      email_confirm: false, // verification link will be sent
      user_metadata: {
        temp_password: randomPassword,
        courier_name: cleanName,
      },
    });

    if (createError || !authUser?.user) {
      return NextResponse.json(
        { error: `Auth Hatası: ${createError?.message || "Kullanıcı oluşturulamadı."}` },
        { status: 400 }
      );
    }

    // 5. Trigger Supabase verification email with dynamic redirect to our confirm page
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const siteUrl = `${protocol}://${host}`;

    const { error: resendError } = await supabaseAdmin.auth.resend({
      type: "signup",
      email: cleanEmail,
      options: {
        emailRedirectTo: `${siteUrl}/auth/confirm`,
      },
    });

    if (resendError) {
      console.warn("[create courier API] Failed to trigger resend:", resendError.message);
    }

    // 6. Insert courier into public table linked to auth user
    const { error: insertError } = await supabaseAdmin.from("couriers").insert({
      user_id: authUser.user.id,
      email: cleanEmail,
      phone: cleanPhone,
      name: cleanName,
      restaurant_id: restaurant.id,
      vehicle_type: "motorcycle",
      is_active: true,
    });

    if (insertError) {
      // Clean up auth user to prevent orphans
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json(
        { error: `Kurye kaydı oluşturulamadı: ${insertError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      email: cleanEmail,
      password: randomPassword,
    });
  } catch (err: any) {
    console.error("[create courier API] Error:", err);
    return NextResponse.json(
      { error: `Sunucu Hatası: ${err.message || "Bilinmeyen bir hata oluştu"}` },
      { status: 500 }
    );
  }
}
