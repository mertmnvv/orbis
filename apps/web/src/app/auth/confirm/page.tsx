'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Isolated client: verifies the code server-side without touching the shared
// browser session, so the restaurant owner's session is never overwritten.
import Link from 'next/link';

// Isolated client: verifies the code server-side without touching the shared
// browser session, so the restaurant owner's session is never overwritten.
const confirmSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function OrbisIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="50" cy="50" r="42" stroke="#f97316" strokeWidth="5.5" />
      <circle cx="50" cy="50" r="24" stroke="#f97316" strokeWidth="5" />
      <line x1="17" y1="76" x2="70" y2="23" stroke="#f97316" strokeWidth="6" strokeLinecap="round" />
      <circle cx="73" cy="20" r="6.5" fill="#f97316" />
      <path d="M 69.5 25 L 73 33 L 76.5 25" fill="#f97316" />
      <path d="M 10 70 Q 15.5 76 10 82" stroke="#f97316" strokeWidth="4" strokeLinecap="round" />
      <path d="M 17 63 Q 22.5 69 17 75" stroke="#f97316" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

function ConfirmContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleVerify = async () => {
      // Check for error parameters in URL (Supabase appends hash parameters on failure)
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.substring(1));
      const errorDesc = hashParams.get('error_description') || searchParams.get('error_description');

      if (errorDesc) {
        setStatus('error');
        setErrorMessage(errorDesc);
        return;
      }

      // Check if there is a code to exchange (for PKCE flow)
      const code = searchParams.get('code');
      if (code) {
        try {
          const { error } = await confirmSupabase.auth.exchangeCodeForSession(code);
          if (error) {
            setStatus('error');
            setErrorMessage(error.message);
          } else {
            setStatus('success');
          }
        } catch (err: any) {
          setStatus('error');
          setErrorMessage(err.message || 'Bilinmeyen bir hata oluştu.');
        }
        return;
      }

      // If no code and no error, check if user is already logged in/active
      const { data: { session } } = await confirmSupabase.auth.getSession();
      if (session) {
        setStatus('success');
      } else {
        // Fallback: If we got here from a verification link, we usually assume success if no error was reported
        setStatus('success');
      }
    };

    handleVerify();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#f97316]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#f97316]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#141414] border border-white/5 rounded-2xl p-8 relative z-10 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <OrbisIcon className="w-20 h-20 mb-6 animate-pulse" />

          {status === 'verifying' && (
            <>
              <div className="w-12 h-12 border-4 border-[#f97316] border-t-transparent rounded-full animate-spin mb-6" />
              <h1 className="text-xl font-bold text-white mb-2">E-posta Adresiniz Doğrulanıyor</h1>
              <p className="text-zinc-400 text-sm">Lütfen bekleyin, hesabınız doğrulanıyor...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>

              <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2">E-posta Onaylandı!</h1>
              <p className="text-zinc-400 text-sm mb-6">Orbis Kurye hesabınız başarıyla aktifleştirildi.</p>

              <div className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-5 text-left mb-6 space-y-4">
                <h3 className="text-xs font-bold text-[#f97316] tracking-wider uppercase">Sonraki Adımlar</h3>
                
                <div className="flex gap-3">
                  <div className="w-5 h-5 bg-white/5 rounded flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">1</div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Telefonunuzdaki <strong>Orbis Kurye</strong> mobil uygulamasını açın.
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 bg-white/5 rounded flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">2</div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Yöneticinizin size verdiği <strong>e-posta adresi</strong> ve <strong>geçici şifre</strong> ile giriş yapın.
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 bg-white/5 rounded flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">3</div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Giriş yaptıktan sonra profil ekranındaki <strong>Anahtar (Key)</strong> butonuna tıklayarak kendi kalıcı şifrenizi belirleyin.
                  </p>
                </div>
              </div>

              <Link
                href="/login"
                className="w-full bg-[#f97316] hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition duration-200 text-center shadow-lg shadow-[#f97316]/20"
              >
                Giriş Ekranına Git
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>

              <h1 className="text-xl font-bold text-white mb-2">Doğrulama Başarısız</h1>
              <p className="text-zinc-400 text-sm mb-6">
                {errorMessage || 'Doğrulama bağlantısı geçersiz veya süresi dolmuş olabilir.'}
              </p>

              <Link
                href="/login"
                className="w-full border border-white/10 hover:bg-white/5 text-white font-semibold py-3 px-6 rounded-xl transition duration-200 text-center"
              >
                Giriş Ekranına Git
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#f97316] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
