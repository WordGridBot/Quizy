'use client';

import { useState, useEffect } from 'react';
import { Upload, BookOpen, Award, LogOut, FileText, CheckCircle2 } from 'lucide-react';
import ThreeCanvas from '@/components/ThreeCanvas';
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

    setUploadStatus('Converting file parameters...');
    setIsScanning(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64RawString = reader.result.split(',')[1];

      setUploadStatus('Executing dual-AI processing chains...');
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
        setUploadStatus('Data extraction successfully committed.');
        
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

  // Hydration protection loader screen
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-cyber-void flex items-center justify-center font-mono text-sm text-cyber-cyan">
        SYNCHRONIZING_CORE_SYSTEM_VARIABLES...
      </div>
    );
  }

  // Enforce profile lock-in views if unauthenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-cyber-void flex items-center justify-center px-4 py-12 relative">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center select-none pointer-events-none">
          <h1 className="text-3xl font-extrabold font-mono text-white tracking-widest bg-clip-text bg-gradient-to-r from-white to-gray-500">
            CGL CORE 3D
          </h1>
          <p className="text-xs font-mono text-cyber-cyan/50 uppercase tracking-widest mt-2">TCS Pattern Revision Node v2.6</p>
        </div>
        <AuthForm onAuthSuccess={(profile) => { setUser(profile); fetchHistoryAndVault(); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-void text-gray-200 pb-12 flex flex-col">
      
      {/* ==========================================
          GLOBAL TOP NAVIGATION HEAD-UP DISPLAY (HUD)
          ========================================== */}
      <header className="w-full bg-cyber-obsidian/70 backdrop-blur-md border-b border-cyber-slate/30 px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyber-cyan animate-pulse" />
          <h1 className="text-xl font-black font-mono tracking-wider text-white">CGL_CORE_3D_MATRIX</h1>
        </div>

        <nav className="flex items-center gap-1 bg-cyber-void border border-cyber-slate/40 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('terminal')}
            className={`px-4 py-1.5 rounded-lg font-mono text-xs font-bold transition ${activeTab === 'terminal' ? 'bg-cyber-cyan text-cyber-void' : 'text-gray-400 hover:text-white'}`}
          >
            TEST_CENTER
          </button>
          <button 
            onClick={() => setActiveTab('vault')}
            className={`px-4 py-1.5 rounded-lg font-mono text-xs font-bold transition ${activeTab === 'vault' ? 'bg-cyber-cyan text-cyber-void' : 'text-gray-400 hover:text-white'}`}
          >
            VOCAB_VAULT
          </button>
          <button 
            onClick={() => setActiveTab('metrics')}
            className={`px-4 py-1.5 rounded-lg font-mono text-xs font-bold transition ${activeTab === 'metrics' ? 'bg-cyber-cyan text-cyber-void' : 'text-gray-400 hover:text-white'}`}
          >
            HISTORY_LOGS
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-gray-400">OPERATOR: <span className="text-white font-bold">{user.username.toUpperCase()}</span></span>
          <button 
            onClick={handleLogout}
            className="p-2 rounded-lg bg-cyber-slate/40 hover:bg-cyber-crimson/10 text-gray-400 hover:text-cyber-crimson transition border border-cyber-slate/30"
            title="Disconnect Profile Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ==========================================
          MAIN INTERACTIVE LAYOUT REGION
          ========================================== */}
      <div className="flex-grow max-w-7xl w-full mx-auto px-4 md:px-8 mt-8">
        
        {/* VIEW 1: CENTRAL COMMAND & UPLOAD ENGINE */}
        {activeTab === 'terminal' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            
            {/* Left Side: Glowing 3D Hologram Interface Canvas */}
            <div className="lg:col-span-2 space-y-4">
              <ThreeCanvas isScanning={isScanning} />
              
              {/* File Drop Field Panel */}
              <div className="bg-cyber-obsidian border border-cyber-slate/30 p-5 rounded-xl backdrop-blur-sm">
                <h3 className="font-mono text-sm font-bold tracking-wide text-white mb-2 uppercase">Ingest Revision Material</h3>
                <p className="text-xs text-gray-400 leading-normal mb-4">Upload handwritten flash sheets, textbook pages, or vocabulary lists. Our system will analyze the data structure to build tests.</p>
                
                <label className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition ${
                  isScanning ? 'border-cyber-emerald bg-cyber-emerald/5 opacity-50 pointer-events-none' : 'border-cyber-slate/40 bg-cyber-void/50 hover:border-cyber-cyan/40 hover:bg-cyber-slate/10'
                }`}>
                  <Upload className={`w-8 h-8 ${isScanning ? 'text-cyber-emerald animate-bounce' : 'text-gray-500'}`} />
                  <span className="font-mono text-xs text-gray-400">SELECT_STUDY_IMAGE</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isScanning} />
                </label>

                {uploadStatus && (
                  <p className="mt-3 font-mono text-[11px] text-cyber-cyan bg-cyber-cyan/5 border border-cyber-cyan/10 p-2.5 rounded-lg text-center animate-pulse">
                    {uploadStatus.toUpperCase()}
                  </p>
                )}
              </div>
            </div>

            {/* Right Side: Render Live Testing Core Engine Output */}
            <div className="lg:col-span-3">
              {generatedQuiz ? (
                <QuizTerminal quizData={generatedQuiz} quizId={currentQuizId} userId={user.id} />
              ) : (
                <div className="w-full h-[540px] border border-dashed border-cyber-slate/20 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-cyber-obsidian/10 backdrop-blur-sm">
                  <FileText className="w-12 h-12 text-gray-600 mb-4" />
                  <h3 className="font-mono text-base text-gray-400 uppercase tracking-wide">NO_ACTIVE_EXAM_MATRIX</h3>
                  <p className="text-xs text-gray-500 max-w-xs mt-2 leading-relaxed">Provide an image compilation sheet on the interface pipeline terminal to generate a targeted TCS exam module.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW 2: CENTRAL DICTIONARY DIAL repository */}
        {activeTab === 'vault' && (
          <div className="animate-fadeIn">
            <VocabVault vocabularyItems={vaultWords} />
          </div>
        )}

        {/* VIEW 3: HISTORICAL SCORES MATRIX CHART DISPLAY */}
        {activeTab === 'metrics' && (
          <div className="bg-cyber-obsidian border border-cyber-slate/30 p-6 rounded-xl backdrop-blur-md max-w-4xl mx-auto animate-fadeIn">
            <div className="flex items-center gap-2 mb-6 border-b border-cyber-slate/30 pb-4">
              <Award className="w-6 h-6 text-cyber-cyan" />
              <div>
                <h3 className="text-xl font-bold font-mono tracking-wide text-white">HISTORICAL EXAM ANALYSIS LOGS</h3>
                <p className="text-xs text-gray-400 mt-0.5">Chronological records of completed review runs</p>
              </div>
            </div>

            {historicalLogs.length === 0 ? (
              <div className="text-center py-16 text-gray-500 font-mono text-sm">
                ZERO_HISTORICAL_ATTEMPTS_RECORDED
              </div>
            ) : (
              <div className="space-y-4">
                {historicalLogs.map((log, index) => (
                  <div key={log.logId || index} className="w-full bg-cyber-void border border-cyber-slate/40 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-cyber-slate/60 transition">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-cyber-emerald shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold font-mono text-white">MOCK ID: {String(log.quizId).substring(0, 12).toUpperCase()}...</h4>
                        <p className="text-xs text-gray-500 mt-1 font-sans">Attempt Finished on {log.dateString}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div className="font-mono">
                        <span className="text-[10px] uppercase text-gray-500 block mb-0.5">Speed Log</span>
                        <span className="text-sm text-amber-400 font-bold">{log.speedMinutes} min</span>
                      </div>
                      <div className="font-mono">
                        <span className="text-[10px] uppercase text-gray-500 block mb-0.5">Precision</span>
                        <span className={`text-base font-black ${log.accuracy >= 70 ? 'text-cyber-emerald' : 'text-cyber-cyan'}`}>{log.accuracy}%</span>
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