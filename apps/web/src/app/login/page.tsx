'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

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
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="h-20 w-20 rounded-2xl overflow-hidden mb-4 shadow-lg shadow-orange-900/30">
            <img src="/logo-icon.png" alt="Orbis" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Orbis</h1>
          <p className="text-[#a1a1aa] text-sm mt-1">Restoran yönetim paneli</p>
        </div>

        {/* Card */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-white mb-6">Giriş Yap</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">E-posta</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] transition-colors"
                placeholder="ornek@restoran.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-[#ef4444] bg-[#ef444415] border border-[#ef444430] rounded-xl px-4 py-2.5">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#f97316] hover:bg-[#ea6c0a] active:bg-[#c2590a] text-white font-semibold rounded-xl py-2.5 text-sm transition-colors disabled:opacity-50 mt-2 shadow-lg shadow-orange-900/20"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#52525b] text-xs mt-6">
          Orbis Kurye Yönetim Sistemi v2.0
        </p>
      </div>
    </div>
  );
}
