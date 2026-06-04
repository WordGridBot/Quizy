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
        throw new Error(data.error || 'Authentication clearance failure');
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
    <div className="w-full max-w-sm mx-auto bg-cyber-obsidian border border-cyber-slate/30 rounded-xl p-6 shadow-2xl backdrop-blur-md">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold font-mono tracking-wider text-white">
          {isLogin ? 'IDENTITY_VERIFICATION' : 'CREATE_NEW_CORE_NODE'}
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          {isLogin ? 'Provide keys to synchronize dashboard analytics' : 'Deploy encrypted student node into system database'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-cyber-crimson/10 border border-cyber-crimson/30 flex items-center gap-2 text-xs text-cyber-crimson animate-fadeIn font-mono">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error.toUpperCase()}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              required
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-cyber-void border border-cyber-slate/40 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan transition"
            />
          </div>
        )}

        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type={isLogin ? "text" : "email"}
            required
            placeholder={isLogin ? "Username or Email" : "Email Address"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-cyber-void border border-cyber-slate/40 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan transition"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="password"
            required
            placeholder="Password Secret Key"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-cyber-void border border-cyber-slate/40 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan transition"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 mt-2 rounded-xl font-mono text-xs font-bold bg-cyber-cyan text-cyber-void hover:bg-cyan-400 disabled:opacity-50 transition uppercase tracking-wider"
        >
          {isLoading ? 'EXECUTING_HANDSHAKE...' : isLogin ? 'INITIATE_LOGIN' : 'REGISTER_NODE'}
        </button>
      </form>

      <div className="mt-5 text-center border-t border-cyber-slate/20 pt-4">
        <button
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
          className="text-xs font-mono text-gray-400 hover:text-cyber-cyan transition underline underline-offset-4"
        >
          {isLogin ? 'SWITCH_MODE // DEPLOY_ACCOUNT' : 'SWITCH_MODE // AUTHORIZE_EXISTING'}
        </button>
      </div>
    </div>
  );
}