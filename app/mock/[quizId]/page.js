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
      <div className="min-h-screen bg-cyber-void flex items-center justify-center font-mono text-xs text-cyber-cyan tracking-widest">
        RESOLVING_SHARED_EXAM_LINK_PARAMETERS...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cyber-void flex flex-col items-center justify-center p-4">
        <div className="bg-cyber-obsidian border border-cyber-crimson/30 rounded-xl p-6 max-w-sm text-center">
          <ShieldAlert className="w-12 h-12 text-cyber-crimson mx-auto mb-3" />
          <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">Access Clearance Failed</h3>
          <p className="text-xs text-gray-400 mt-2 font-mono">{error.toUpperCase()}</p>
          <Link href="/" className="inline-block mt-5 px-4 py-2 bg-cyber-slate text-xs font-mono rounded-lg text-white hover:bg-gray-700 transition">
            RETURN_TO_BASE
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-void text-gray-200 pb-16">
      
      {/* Mini top HUD header */}
      <header className="w-full bg-cyber-obsidian/40 border-b border-cyber-slate/20 px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-mono text-xs text-gray-400 hover:text-cyber-cyan transition">
          <ArrowLeft className="w-4 h-4" /> BACK_TO_MAIN_DASHBOARD
        </Link>
        <span className="font-mono text-[10px] text-gray-500">SHARED_NODE_ID: {quizId.toUpperCase()}</span>
      </header>

      <div className="max-w-4xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN / SPAN 2: Main interactive testing terminal workspace */}
        <div className="lg:col-span-2">
          {!isGuestVerified ? (
            <div className="bg-cyber-obsidian border border-cyber-slate/30 p-6 rounded-xl backdrop-blur-md max-w-md mx-auto">
              <div className="text-center mb-5">
                <UserCheck className="w-12 h-12 text-cyber-cyan mx-auto mb-2" />
                <h3 className="font-mono text-base font-bold text-white">CHALLENGE_MATCH_GATEWAY</h3>
                <p className="text-xs text-gray-400 mt-1">Enter a candidate name profile to map your scores onto the shared group leaderboard index.</p>
              </div>
              <form onSubmit={initializeGuestNode} className="space-y-3">
                <input
                  type="text"
                  required
                  maxLength={15}
                  placeholder="Enter Nickname / Real Name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-cyber-void border border-cyber-slate/40 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan transition font-mono"
                />
                <button type="submit" className="w-full py-2.5 rounded-xl font-mono text-xs font-bold bg-cyber-cyan text-cyber-void hover:bg-cyan-400 transition uppercase tracking-wider">
                  LAUNCH_EXAM_MATRIX
                </button>
              </form>
            </div>
          ) : (
            /* Custom terminal shell injects guest variables securely */
            <QuizTerminal 
              quizData={quizQuestions} 
              quizId={quizId} 
              userId={localUserId} 
              onCompleteRefresh={loadQuizMatrix} // Forces ranking refresh on submit
            />
          )}
        </div>

        {/* RIGHT COLUMN / SPAN 1: Shared live competitive scoreboard rankings */}
        <div className="lg:col-span-1 bg-cyber-obsidian border border-cyber-slate/30 rounded-xl p-4 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-cyber-slate/20 pb-3 mb-4">
            <h4 className="font-mono text-xs font-bold tracking-wider text-white flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" /> LIVE_STANDINGS
            </h4>
            <button onClick={loadQuizMatrix} className="p-1 text-gray-500 hover:text-cyber-cyan transition" title="Refresh Standings">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-center py-8 text-xs font-mono text-gray-600">ZERO_ATTEMPTS_LOGGED_YET</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {leaderboard.map((player) => (
                <div 
                  key={player.rank}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between font-mono ${
                    player.username.toLowerCase() === guestName.toLowerCase()
                      ? 'bg-cyber-cyan/10 border-cyber-cyan text-white'
                      : 'bg-cyber-void/60 border-cyber-slate/20 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                      player.rank === 1 ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' :
                      player.rank === 2 ? 'bg-gray-400/20 text-gray-300' : 'bg-cyber-slate text-gray-400'
                    }`}>
                      {player.rank}
                    </span>
                    <span className="truncate max-w-[100px] font-medium">{player.username}</span>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <span className="text-cyber-emerald font-bold">{player.score}/{player.total}</span>
                    <span className="text-gray-500 text-[10px] ml-2 font-light">({player.timeMinutes}m)</span>
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