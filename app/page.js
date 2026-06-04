'use client';

import { useState, useEffect } from 'react';
import { Upload, BookOpen, Award, LogOut, FileText, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import HeroOrb from '@/components/HeroOrb';
import QuizTerminal from '@/components/QuizTerminal';
import VocabVault from '@/components/VocabVault';
import AuthForm from '@/components/AuthForm';

export default function DashboardPage() {
  // Authentication & session track states
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Layout presentation states
  const [activeTab, setActiveTab] = useState('terminal'); // terminal, vault, metrics
  const [isScanning, setIsScanning] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // Loaded engine data blocks
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [currentQuizId, setCurrentQuizId] = useState(null);
  const [vaultWords, setVaultWords] = useState([]);
  const [historicalLogs, setHistoricalLogs] = useState([]);

  // 1. Lifecycle verification: Check if session cookie is active on load
  useEffect(() => {
    async function verifySession() {
      try {
        const res = await fetch('/api/scores'); // Re-using score GET route to confirm session state
        if (res.ok) {
          const data = await res.json();
          setUser({ username: data.username });
          fetchHistoryAndVault();
        }
      } catch (err) {
        console.error("Session verification bypass:", err);
      } finally {
        setAuthChecked(true);
      }
    }
    verifySession();
  }, []);

  // 2. Fetch User History and Words Vault from DB
  const fetchHistoryAndVault = async () => {
    try {
      const scoreRes = await fetch('/api/scores');
      if (scoreRes.ok) {
        const scoreData = await scoreRes.json();
        setHistoricalLogs(scoreData.history || []);
      }
    } catch (err) {
      console.error("Failed to sync background metrics profiles:", err);
    }
  };

  // 3. Handle File Upload conversion and dispatch pipeline execution
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadStatus('Converting file...');
    setIsScanning(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64RawString = reader.result.split(',')[1];

      setUploadStatus('Running AI analysis pipeline...');
      try {
        const res = await fetch('/app/api/analyze', { // adjusted route string to map local API path
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64RawString, userId: user?.id })
        });
        
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Pipeline parsing breakdown');

        setGeneratedQuiz(data.quizData);
        setCurrentQuizId(data.quizId);
        setUploadStatus('Analysis complete — quiz generated successfully.');
        
        // Refresh local cache metrics
        fetchHistoryAndVault();
      } catch (err) {
        setUploadStatus(`Error: ${err.message}`);
      } finally {
        setIsScanning(false);
      }
    };
  };

  // 4. Reset Session logs out handler
  const handleLogout = () => {
    // Clear out session memory
    setUser(null);
    setGeneratedQuiz(null);
    // Explicitly overwrite token parameters via header resets by forcing reload
    document.cookie = "cgl_session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.reload();
  };

  // Tab configuration
  const tabs = [
    { id: 'terminal', label: 'Test Center' },
    { id: 'vault', label: 'Vocab Vault' },
    { id: 'metrics', label: 'History' },
  ];

  // Hydration protection loader screen
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-glass-deep flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-glass-accent/20 border-t-glass-accent rounded-full animate-spin" />
          <span className="text-sm text-glass-muted">Loading CGL Core...</span>
        </div>
      </div>
    );
  }

  // Enforce profile lock-in views if unauthenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-glass-deep flex items-center justify-center px-4 py-12 relative">
        {/* Logo header */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center select-none pointer-events-none">
          <h1 className="text-3xl font-extrabold tracking-wider text-gradient">
            CGL Core
          </h1>
          <p className="text-xs text-glass-muted/60 uppercase tracking-[0.25em] mt-2">
            AI-Powered Exam Revision
          </p>
        </div>
        <AuthForm onAuthSuccess={(profile) => { setUser(profile); fetchHistoryAndVault(); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-glass-deep text-gray-200 pb-12 flex flex-col">
      
      {/* ==========================================
          GLASSMORPHIC NAVIGATION HEADER
          ========================================== */}
      <header className="w-full glass-card !rounded-none !border-x-0 !border-t-0 px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-glass-accent animate-pulse" />
          <h1 className="text-lg font-bold tracking-wider text-gradient">CGL Core</h1>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 glass-card !p-1 !rounded-xl">
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'btn-gradient !rounded-lg shadow-glow' 
                  : 'text-glass-muted hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <span className="text-xs text-glass-muted">
            Welcome, <span className="text-white font-semibold">{user.username}</span>
          </span>
          <button 
            onClick={handleLogout}
            className="p-2 rounded-lg bg-white/[0.04] hover:bg-glass-danger/10 text-glass-muted hover:text-glass-danger transition border border-white/[0.06] hover:border-glass-danger/20"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ==========================================
          MAIN INTERACTIVE LAYOUT REGION
          ========================================== */}
      <div className="flex-grow max-w-7xl w-full mx-auto px-4 md:px-8 mt-8">
        
        {/* VIEW 1: TEST CENTER & UPLOAD ENGINE */}
        {activeTab === 'terminal' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start animate-fade-in">
            
            {/* Left Side: Animated Hero Orb & Upload Panel */}
            <div className="lg:col-span-2 space-y-5">
              <HeroOrb isScanning={isScanning} />
              
              {/* File Upload Panel */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-bold tracking-wide text-white mb-1.5">Upload Study Material</h3>
                <p className="text-xs text-glass-muted leading-relaxed mb-4">
                  Drop handwritten notes, textbook photos, or vocabulary lists. Our AI will analyze and generate targeted exam questions.
                </p>
                
                <label className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 ${
                  isScanning 
                    ? 'border-glass-success/30 bg-glass-success/5 opacity-60 pointer-events-none' 
                    : 'border-white/10 bg-white/[0.02] hover:border-glass-accent/30 hover:bg-white/[0.04] hover:shadow-glow'
                }`}>
                  <Upload className={`w-8 h-8 ${isScanning ? 'text-glass-success animate-bounce' : 'text-white/25'}`} />
                  <span className="text-xs text-glass-muted font-medium">
                    {isScanning ? 'Processing...' : 'Select an image'}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isScanning} />
                </label>

                {uploadStatus && (
                  <div className="mt-3 glass-card !rounded-lg p-3 text-center">
                    <p className="text-xs text-glass-accent font-medium animate-pulse">
                      {uploadStatus}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Live Testing Engine Output */}
            <div className="lg:col-span-3">
              {generatedQuiz ? (
                <QuizTerminal quizData={generatedQuiz} quizId={currentQuizId} userId={user.id} />
              ) : (
                <div className="w-full h-[540px] glass-card flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
                    <FileText className="w-7 h-7 text-white/15" />
                  </div>
                  <h3 className="text-base font-semibold text-white/60 mb-2">No Active Exam</h3>
                  <p className="text-sm text-glass-muted max-w-xs leading-relaxed">
                    Upload a study image to generate a TCS-pattern mock exam with AI-powered question analysis.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW 2: VOCABULARY VAULT */}
        {activeTab === 'vault' && (
          <div className="animate-fade-in">
            <VocabVault vocabularyItems={vaultWords} />
          </div>
        )}

        {/* VIEW 3: HISTORICAL EXAM LOGS */}
        {activeTab === 'metrics' && (
          <div className="glass-card p-6 md:p-8 max-w-4xl mx-auto animate-fade-in">
            <div className="flex items-center gap-3 mb-6 border-b border-white/[0.06] pb-5">
              <div className="w-10 h-10 rounded-xl bg-glass-accent/10 border border-glass-accent/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-glass-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Exam History</h3>
                <p className="text-xs text-glass-muted mt-0.5">Your past mock exam attempts and performance</p>
              </div>
            </div>

            {historicalLogs.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-white/15" />
                </div>
                <p className="text-sm text-glass-muted">No exam attempts recorded yet</p>
                <p className="text-xs text-white/20 mt-1">Complete a mock exam to see your stats here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historicalLogs.map((log, index) => (
                  <div key={log.logId || index} className="glass-card-hover p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-glass-success/10 border border-glass-success/20 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-glass-success" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">
                          Quiz {String(log.quizId).substring(0, 8).toUpperCase()}
                        </h4>
                        <p className="text-xs text-glass-muted mt-0.5">{log.dateString}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <span className="text-[10px] uppercase text-glass-muted block mb-0.5 tracking-wider">Speed</span>
                        <span className="text-sm text-glass-amber font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {log.speedMinutes} min
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-glass-muted block mb-0.5 tracking-wider">Accuracy</span>
                        <span className={`text-base font-black ${log.accuracy >= 70 ? 'text-glass-success' : 'text-glass-accent'}`}>
                          {log.accuracy}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}