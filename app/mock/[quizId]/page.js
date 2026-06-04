'use client';

import { useState, useEffect } from 'react';
import { Trophy, ShieldAlert, UserCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import QuizTerminal from '@/components/QuizTerminal';

export default function SharedMockPage({ params }) {
  const { quizId } = params;

  // View control and data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [quizImageBase64, setQuizImageBase64] = useState(null);
  const [quizImagesBase64, setQuizImagesBase64] = useState(null);
  
  // Guest access handling states
  const [guestName, setGuestName] = useState('');
  const [isGuestVerified, setIsGuestVerified] = useState(false);
  const [localUserId, setLocalUserId] = useState('guest');

  // Load question packs and standings
  const loadQuizMatrix = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/quizzes/${quizId}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to pull shared node data');

      setQuizQuestions(data.questions);
      setLeaderboard(data.leaderboard);
      setQuizImageBase64(data.imageBase64);
      setQuizImagesBase64(data.imagesBase64);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizMatrix();
  }, [quizId]);

  // Handle setting up a guest session
  const initializeGuestNode = (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setIsGuestVerified(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
          <p className="text-zinc-500 text-xs font-mono mt-4">Loading shared quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="glass-card p-8 max-w-sm text-center border border-red-950 bg-zinc-950">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">Access Failed</h3>
          <p className="text-zinc-500 text-xs mt-2 leading-relaxed">{error}</p>
          <Link href="/" className="btn-gradient inline-block mt-6 px-4 py-2 text-xs font-bold no-underline">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-300 pb-16 flex flex-col font-sans">
      
      {/* Mini top HUD header */}
      <header className="bg-zinc-950 border-b border-zinc-900 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <span className="text-zinc-600 text-[10px] font-mono">{quizId}</span>
      </header>

      <div className={`max-w-7xl w-full mx-auto px-6 mt-8 grid grid-cols-1 ${isGuestVerified && (quizImageBase64 || quizImagesBase64) ? 'lg:grid-cols-12' : 'lg:grid-cols-3'} gap-6 items-start`}>
        
        {/* LEFT COLUMN / SPAN: Main interactive testing terminal workspace */}
        <div className={isGuestVerified && (quizImageBase64 || quizImagesBase64) ? 'lg:col-span-9' : 'lg:col-span-2'}>
          {!isGuestVerified ? (
            <div className="glass-card p-6 max-w-md mx-auto animate-slide-up bg-zinc-950 border border-zinc-800">
              <div className="text-center mb-5">
                <UserCheck className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-white">Join Challenge</h3>
                <p className="text-xs text-zinc-500 mt-1">Enter your name to join the standings leaderboard</p>
              </div>
              <form onSubmit={initializeGuestNode} className="space-y-3">
                <input
                  type="text"
                  required
                  maxLength={15}
                  placeholder="Your nickname"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="glass-input px-3.5 py-2.5 text-xs w-full font-semibold focus:outline-none"
                />
                <button type="submit" className="btn-gradient w-full py-2.5 text-xs font-bold">
                  Start Exam
                </button>
              </form>
            </div>
          ) : (
            <QuizTerminal 
              quizData={quizQuestions} 
              quizId={quizId} 
              userId={localUserId} 
              imageBase64={quizImageBase64}
              imagesBase64={quizImagesBase64}
              onCompleteRefresh={loadQuizMatrix}
            />
          )}
        </div>

        {/* RIGHT COLUMN / SPAN 1: Shared live competitive scoreboard rankings */}
        <div className={isGuestVerified && (quizImageBase64 || quizImagesBase64) ? 'lg:col-span-3 glass-card p-4 bg-zinc-950' : 'lg:col-span-1 glass-card p-4 bg-zinc-950'}>
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" /> Standings
            </h4>
            <button onClick={loadQuizMatrix} className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-white transition" title="Refresh Standings">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-center py-8 text-zinc-600 text-xs">No attempts recorded yet</p>
          ) : (
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-0.5">
              {leaderboard.map((player) => (
                <div 
                  key={player.rank}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    player.username.toLowerCase() === guestName.toLowerCase()
                      ? 'border-zinc-500 bg-zinc-900 text-white font-semibold animate-pulse'
                      : 'bg-zinc-900/20 border-zinc-900 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-4.5 h-4.5 rounded flex items-center justify-center font-bold text-[9px] ${
                      player.rank === 1 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      player.rank === 2 ? 'bg-zinc-700/30 text-zinc-300' : 'bg-transparent text-zinc-600'
                    }`}>
                      {player.rank}
                    </span>
                    <span className="truncate max-w-[90px]">{player.username}</span>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <span className="text-emerald-400 font-bold">{player.score}/{player.total}</span>
                    <span className="text-zinc-600 text-[9px] ml-1.5 font-mono">({player.timeMinutes}m)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}