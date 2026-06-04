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
      <div className="min-h-screen bg-glass-deep flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-2 border-glass-accent/20 border-t-glass-accent rounded-full animate-spin" />
          <p className="text-glass-muted text-sm mt-4">Loading shared quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-glass-deep flex flex-col items-center justify-center p-4">
        <div className="glass-card p-8 max-w-sm text-center shadow-glow-danger">
          <ShieldAlert className="w-12 h-12 text-glass-danger mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">Access Failed</h3>
          <p className="text-glass-muted text-sm mt-2">{error}</p>
          <Link href="/" className="btn-gradient inline-block mt-6 px-5 py-2.5 text-sm no-underline">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-glass-deep text-gray-200 pb-16">
      
      {/* Mini top HUD header */}
      <header className="glass-card !rounded-none border-x-0 border-t-0 px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm text-glass-muted hover:text-glass-accent transition">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <span className="text-white/30 text-[10px]">{quizId}</span>
      </header>

      <div className="max-w-4xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN / SPAN 2: Main interactive testing terminal workspace */}
        <div className="lg:col-span-2">
          {!isGuestVerified ? (
            <div className="glass-card p-8 max-w-md mx-auto animate-slide-up">
              <div className="text-center mb-5">
                <UserCheck className="w-12 h-12 text-glass-accent mx-auto mb-2" />
                <h3 className="text-base font-bold text-white">Join Challenge</h3>
                <p className="text-sm text-glass-muted mt-1">Enter your name to join the leaderboard</p>
              </div>
              <form onSubmit={initializeGuestNode} className="space-y-3">
                <input
                  type="text"
                  required
                  maxLength={15}
                  placeholder="Your nickname"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="glass-input px-4 py-3 text-sm w-full"
                />
                <button type="submit" className="btn-gradient w-full py-3 text-sm">
                  Start Exam
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
        <div className="lg:col-span-1 glass-card p-5">
          <div className="flex items-center justify-between border-b border-glass-border pb-3 mb-4">
            <h4 className="text-xs font-bold tracking-wider text-white flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-glass-amber" /> Live Standings
            </h4>
            <button onClick={loadQuizMatrix} className="p-1 text-glass-muted hover:text-glass-accent transition" title="Refresh Standings">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-center py-8 text-glass-muted text-sm">No attempts recorded yet</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {leaderboard.map((player) => (
                <div 
                  key={player.rank}
                  className={`glass-card !rounded-lg p-3 text-xs flex items-center justify-between ${
                    player.username.toLowerCase() === guestName.toLowerCase()
                      ? 'border-glass-accent/30 bg-glass-accent/10 text-white'
                      : 'bg-white/[0.02] text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                      player.rank === 1 ? 'bg-glass-amber/15 text-glass-amber border border-glass-amber/20' :
                      player.rank === 2 ? 'bg-white/10 text-gray-300' : 'bg-white/5 text-glass-muted'
                    }`}>
                      {player.rank}
                    </span>
                    <span className="truncate max-w-[100px] font-medium">{player.username}</span>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <span className="text-glass-success font-bold">{player.score}/{player.total}</span>
                    <span className="text-glass-muted text-[10px] ml-2 font-light">({player.timeMinutes}m)</span>
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