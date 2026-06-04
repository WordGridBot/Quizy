'use client';

import { useState } from 'react';
import { Lock, Mail, User, ShieldAlert } from 'lucide-react';

export default function AuthForm({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const targetUrl = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { identifier: email, password }
      : { username, email, password };

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.success) {
        onAuthSuccess(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto glass-card p-6 bg-zinc-950 border border-zinc-800 rounded-xl animate-fade-in shadow-2xl">
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-white tracking-wide">
          {isLogin ? 'Sign In' : 'Create Account'}
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          {isLogin ? 'Access your exam revision dashboard' : 'Set up your student profile'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-950 bg-red-950/20 flex items-center gap-2 text-xs text-red-400 animate-fade-in">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {!isLogin && (
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              required
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="glass-input pl-9 pr-3 py-2 w-full text-xs"
            />
          </div>
        )}

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type={isLogin ? "text" : "email"}
            required
            placeholder={isLogin ? "Username or Email" : "Email Address"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glass-input pl-9 pr-3 py-2 w-full text-xs"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass-input pl-9 pr-3 py-2 w-full text-xs"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-gradient w-full py-2 mt-2 text-xs font-bold"
        >
          {isLoading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div className="mt-5 text-center border-t border-zinc-900 pt-4">
        <button
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
          className="text-xs text-zinc-500 hover:text-white transition"
        >
          {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}