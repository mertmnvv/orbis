'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

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

function EmailIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 7.5L10 12L17.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3.5" y="9" width="13" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 9V6.5a3 3 0 016 0V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="13.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,_rgba(249,115,22,0.08)_0%,_transparent_100%)]" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(249,115,22,1) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-px h-32 bg-gradient-to-b from-transparent via-orange-500/20 to-transparent" />
      <div className="absolute top-0 left-0 w-32 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
      <div className="absolute bottom-0 right-0 w-px h-32 bg-gradient-to-t from-transparent via-orange-500/20 to-transparent" />
      <div className="absolute bottom-0 right-0 w-32 h-px bg-gradient-to-l from-transparent via-orange-500/20 to-transparent" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-5">
            <div className="absolute inset-0 blur-2xl bg-orange-500/20 rounded-full scale-150" />
            <OrbisIcon className="h-[72px] w-[72px] relative drop-shadow-[0_0_12px_rgba(249,115,22,0.4)]" />
          </div>
          <h1 className="text-[28px] font-bold text-white tracking-tight">Orbis</h1>
          <p className="text-zinc-500 text-[13px] mt-1 tracking-widest uppercase font-medium">
            Kurye Yönetim Paneli
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-md p-8 shadow-2xl shadow-black/60">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                <EmailIcon />
                E-posta
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 hover:border-white/[0.12] transition-all"
                placeholder="ornek@restoran.com"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                <LockIcon />
                Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 hover:border-white/[0.12] transition-all"
                placeholder="••••••••"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3">
                <span className="text-red-400">
                  <AlertIcon />
                </span>
                <p className="text-[13px] text-red-400 leading-snug">{error}</p>
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-white/[0.05] my-1" />

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-xl py-3 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                boxShadow: '0 0 0 1px rgba(249,115,22,0.3), 0 4px 24px rgba(249,115,22,0.2), inset 0 1px 0 rgba(255,255,255,0.12)',
              }}
            >
              <span className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.06] transition-colors duration-200 rounded-xl" />
              {loading ? (
                <span className="flex items-center justify-center gap-2.5">
                  <svg className="animate-spin h-4 w-4 opacity-80" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Giriş yapılıyor...
                </span>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-7">
          <div className="h-px flex-1 bg-white/[0.04]" />
          <p className="text-zinc-700 text-[11px] tracking-wider uppercase font-medium px-3">
            v2.0
          </p>
          <div className="h-px flex-1 bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}
