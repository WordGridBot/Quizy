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
      ? { identifier: email, password } // identifier holds username or email
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
    <div className="w-full max-w-sm mx-auto glass-card p-8 shadow-glow animate-fade-in">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold tracking-wide text-gradient">
          {isLogin ? 'Sign In' : 'Create Account'}
        </h3>
        <p className="text-xs text-glass-muted mt-1.5">
          {isLogin ? 'Access your personalized dashboard' : 'Set up your student profile'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg glass-card !border-glass-danger/20 bg-glass-danger/5 flex items-center gap-2 text-xs text-glass-danger animate-fade-in">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-glass-muted" />
            <input
              type="text"
              required
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="glass-input pl-10 pr-4 py-3 w-full text-sm"
            />
          </div>
        )}

        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-glass-muted" />
          <input
            type={isLogin ? "text" : "email"}
            required
            placeholder={isLogin ? "Username or Email" : "Email Address"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glass-input pl-10 pr-4 py-3 w-full text-sm"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-glass-muted" />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass-input pl-10 pr-4 py-3 w-full text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-gradient w-full py-3 mt-2 text-sm tracking-wide disabled:opacity-50"
        >
          {isLoading ? 'Signing in...' : isLogin ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div className="mt-5 text-center border-t border-glass-border pt-4">
        <button
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
          className="text-xs text-glass-muted hover:text-glass-accent transition-colors"
        >
          {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}