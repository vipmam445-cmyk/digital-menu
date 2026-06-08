"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Shield, Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/admin/dashboard");
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (authErr) {
      setError(authErr.message === "Invalid login credentials"
        ? "Invalid credentials"
        : authErr.message);
    } else {
      router.push("/admin/dashboard");
    }
  };

  return (
    <div className="luxury-bg flex items-center justify-center min-h-screen p-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl border border-border-warm"
      >
        <div className="w-14 h-14 bg-gold rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Shield size={28} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-black text-center mb-2">
          Admin Login
        </h1>
        <p className="text-sm text-muted/70 text-center mb-6">
          Sign in to manage your menu
        </p>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl mb-4">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted/70 mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-cream-dark rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-gold/50"
              placeholder="admin@example.com"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted/70 mb-1.5 block">
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-cream-dark rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-gold/50 pr-10"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted/50"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gold text-white rounded-xl font-semibold text-sm hover:bg-brown-dark transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-full text-center text-xs text-muted/50 mt-4 hover:text-gold transition-colors"
        >
          Back to Menu
        </button>
      </form>
    </div>
  );
}
