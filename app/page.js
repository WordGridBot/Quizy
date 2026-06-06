'use client';

import { useState, useEffect } from 'react';
import { Upload, BookOpen, Award, LogOut, FileText, CheckCircle2, Clock, TrendingUp, Shuffle, Eye, X, Sliders, Check, Share2 } from 'lucide-react';
import QuizTerminal from '@/components/QuizTerminal';
import AuthForm from '@/components/AuthForm';

const ShareButton = ({ quizId }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    const origin = window.location.origin;
    const path = `${origin}/mock/${quizId}`;
    navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded border transition shrink-0 ${
        copied 
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold' 
          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white'
      }`}
      title={copied ? 'Link Copied!' : 'Copy Shareable Link'}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
    </button>
  );
};

export default function DashboardPage() {
  // Authentication & session track states
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Layout presentation states
  const [activeTab, setActiveTab] = useState('terminal'); // terminal, metrics, leaderboard
  const [isScanning, setIsScanning] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // Loaded engine data blocks
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [currentQuizId, setCurrentQuizId] = useState(null);
  const [quizImageBase64, setQuizImageBase64] = useState(null);
  const [quizImagesBase64, setQuizImagesBase64] = useState(null);
  const [historicalLogs, setHistoricalLogs] = useState([]);
  const [createdQuizzes, setCreatedQuizzes] = useState([]);

  // Global leaderboard & renaming states
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [editTitleText, setEditTitleText] = useState('');

  // Advanced feature inputs
  const [examType, setExamType] = useState('SSC CGL');
  const [subject, setSubject] = useState('Mixed');
  const [selectedQuizzes, setSelectedQuizzes] = useState([]);
  const [isMixing, setIsMixing] = useState(false);
  const [notesPreviewImage, setNotesPreviewImage] = useState(null);

  // Review & Finalize Console states
  const [rawExtractedQuiz, setRawExtractedQuiz] = useState(null);
  const [rawExtractedVocab, setRawExtractedVocab] = useState(null);
  const [reviewTitle, setReviewTitle] = useState('');
  const [keepCount, setKeepCount] = useState(5);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);

  // Scanning simulation states
  const [scanProgress, setScanProgress] = useState(0);
  const [scanPhaseText, setScanPhaseText] = useState('');

  // Mix Modal States
  const [showMixModal, setShowMixModal] = useState(false);
  const [mixTitle, setMixTitle] = useState('');
  const [mixQuestionCount, setMixQuestionCount] = useState(10);

  // Multiple image queue states
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Backend Engine status tracking
  const [engineStatus, setEngineStatus] = useState('checking'); // checking, online, sleeping

  const wakeUpBackend = async (silent = false) => {
    if (!silent) setEngineStatus('checking');
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://japusahu-quizy.hf.space';
      const res = await fetch(backendUrl, { method: 'GET', mode: 'cors' });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'online') {
          setEngineStatus('online');
          return true;
        }
      }
      setEngineStatus('sleeping');
      return false;
    } catch (err) {
      console.error("Backend wake-up failed:", err);
      setEngineStatus('sleeping');
      return false;
    }
  };

  // 1. Lifecycle verification: Check if session cookie is active on load
  useEffect(() => {
    async function verifySession() {
      try {
        const res = await fetch('/api/scores'); // Re-using score GET route to confirm session state
        if (res.ok) {
          const data = await res.json();
          setUser({ username: data.username, id: data.userId });
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

  // 2. Fetch User History and Quizzes from DB
  const fetchHistoryAndVault = async () => {
    try {
      const scoreRes = await fetch('/api/scores');
      if (scoreRes.ok) {
        const scoreData = await scoreRes.json();
        setHistoricalLogs(scoreData.history || []);
        setCreatedQuizzes(scoreData.createdQuizzes || []);
      }
    } catch (err) {
      console.error("Failed to sync background metrics profiles:", err);
    }
  };

  const fetchGlobalLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setGlobalLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error("Failed to load global leaderboard:", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const handleRenameQuiz = async (quizId) => {
    if (!editTitleText.trim()) return;
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitleText.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedQuizzes(prev => prev.map(q => q.quizId === quizId ? { ...q, title: data.title } : q));
        setEditingQuizId(null);
      } else {
        alert(data.error || "Failed to rename quiz");
      }
    } catch (err) {
      console.error("Rename error:", err);
      alert("An error occurred while renaming the quiz");
    }
  };

  // 3. Keep Hugging Face Backend Engine awake
  useEffect(() => {
    if (!user) return;
    
    // Initial wake-up call
    wakeUpBackend(false);

    // Set interval to ping every 2 minutes (120,000 ms) to keep the Space awake
    const interval = setInterval(() => {
      wakeUpBackend(true); // silent ping so it doesn't disturb the user if it's already active
    }, 120000);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchGlobalLeaderboard();
    }
  }, [activeTab]);

  // 4. Scanning simulation progress tracker
  useEffect(() => {
    if (!isScanning) {
      setScanProgress(0);
      setScanPhaseText('');
      return;
    }

    setScanProgress(1);
    setScanPhaseText('Preparing study notes for parsing...');

    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      let progress = 1;
      let phase = 'Preparing study notes for parsing...';

      if (elapsed < 3000) {
        progress = Math.max(1, Math.round((elapsed / 3000) * 15));
        phase = 'Preparing study notes for parsing...';
      } else if (elapsed < 18000) {
        progress = 15 + Math.round(((elapsed - 3000) / 15000) * 35);
        phase = 'Extracting handwritten text via Llama Vision...';
      } else if (elapsed < 28000) {
        progress = 50 + Math.round(((elapsed - 18000) / 10000) * 20);
        phase = 'Load balancing NVIDIA NIM pipeline...';
      } else {
        const ratio = Math.min((elapsed - 28000) / 25000, 1);
        progress = 70 + Math.round(ratio * 28);
        phase = 'Composing TCS-Pattern MCQs via Llama 3.3...';
      }

      // Clamp progress strictly between 1% and 98% while scanning is active
      const finalProgress = Math.max(1, Math.min(progress, 98));
      setScanProgress(finalProgress);
      setScanPhaseText(phase);
    }, 200);

    return () => clearInterval(interval);
  }, [isScanning]);

  // Client-side image compression utility
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1000;
            const MAX_HEIGHT = 1000;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = Math.round((width * MAX_HEIGHT) / height);
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Get compressed data URL (JPEG, 0.6 quality for Vercel size limit and OCR readability)
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
            const base64 = compressedDataUrl.split(',')[1];
            resolve(base64);
          } catch (e) {
            console.error("Canvas scaling error, falling back to raw Base64:", e);
            const rawBase64 = event.target.result.split(',')[1];
            if (rawBase64) {
              resolve(rawBase64);
            } else {
              reject(e);
            }
          }
        };
        img.onerror = (err) => {
          console.error("Image loading error, falling back to raw Base64:", err);
          const rawBase64 = event.target.result.split(',')[1];
          if (rawBase64) {
            resolve(rawBase64);
          } else {
            reject(new Error("Failed to load image for compression"));
          }
        };
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Select multiple files
  const handleFileSelection = (files) => {
    if (!files) return;
    // Mobile browsers may return empty type or application/octet-stream for custom camera formats (like HEIC/HEIF).
    // Filter by either standard startsWith('image/') or filename extension.
    const fileArray = Array.from(files).filter(file => {
      const isImgType = file.type && file.type.startsWith('image/');
      const hasImgExt = /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(file.name);
      return isImgType || hasImgExt;
    });
    const newFiles = fileArray.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  // Remove file from queue
  const handleRemoveFile = (index) => {
    setUploadedFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  // Process all files in queue and generate quiz
  const handleGenerateExam = async () => {
    if (uploadedFiles.length === 0) return;

    if (engineStatus !== 'online') {
      setUploadStatus('Engine is sleeping / waking up. Waking up container first (this can take up to 30 seconds)...');
      await wakeUpBackend(false);
    }

    setUploadStatus('Compressing queued note images...');
    setIsScanning(true);

    try {
      const compressionPromises = uploadedFiles.map(f => compressImage(f.file));
      const base64Array = await Promise.all(compressionPromises);

      setUploadStatus('Running AI OCR + Synthesis (this may take up to 45 seconds)...');
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://japusahu-quizy.hf.space';
      let targetUrl = '';
      let headers = { 'Content-Type': 'application/json' };

      if (backendUrl) {
        const normalizedBase = backendUrl.replace(/\/$/, '');
        targetUrl = normalizedBase.includes('hf.space') 
          ? `${normalizedBase}/analyze` 
          : `${normalizedBase}/api/analyze`;
        
        headers['X-API-Secret'] = process.env.NEXT_PUBLIC_API_SECRET || 'Japu';
      } else {
        targetUrl = '/api/analyze';
      }

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          imagesBase64: base64Array, 
          userId: user?.id || 'anonymous',
          examType,
          subject
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pipeline parsing breakdown');

      setRawExtractedQuiz(data.quizData || []);
      setRawExtractedVocab(data.vocabData || []);
      setReviewTitle(`${examType} ${subject} - ${new Date().toLocaleDateString('en-IN')}`);
      setKeepCount((data.quizData || []).length);
      setQuizImageBase64(base64Array[0] || null);
      setQuizImagesBase64(base64Array);
      setUploadStatus(`Extraction complete. ${data.quizData?.length || 0} questions parsed.`);
      
      // Clean up local blob URLs
      uploadedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
      setUploadedFiles([]);
    } catch (err) {
      setUploadStatus(`Error: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Finalize quiz, shuffle, slice, and save to MongoDB before launching QuizTerminal
  const handleSaveAndStartQuiz = async () => {
    if (!rawExtractedQuiz) return;
    setIsSavingQuiz(true);
    setUploadStatus('Saving quiz database to cloud matrix...');
    try {
      // Randomly shuffle and slice questions if keepCount < total
      let finalQuestions = [...rawExtractedQuiz];
      if (keepCount < rawExtractedQuiz.length) {
        // Shuffle using Fisher-Yates
        for (let i = finalQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [finalQuestions[i], finalQuestions[j]] = [finalQuestions[j], finalQuestions[i]];
        }
        finalQuestions = finalQuestions.slice(0, keepCount);
      }

      // Save to MongoDB via Next.js API
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reviewTitle.trim() || `${examType} - ${subject} Quiz`,
          questions: finalQuestions,
          imagesBase64: quizImagesBase64,
          examType,
          subject,
          vocabWords: rawExtractedVocab
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save quiz to database');

      setGeneratedQuiz(finalQuestions);
      setCurrentQuizId(data.quizId);
      setRawExtractedQuiz(null);
      setRawExtractedVocab(null);
      setUploadStatus('Quiz saved! Re-testing terminal initiated.');

      // Refresh dashboard history list and vocab vault
      fetchHistoryAndVault();
    } catch (err) {
      setUploadStatus(`Save error: ${err.message}`);
    } finally {
      setIsSavingQuiz(false);
    }
  };

  // Load a quiz to retake it
  const handleLoadQuiz = async (quizId, quizImage, quizImages) => {
    setUploadStatus('Loading quiz questions...');
    try {
      const res = await fetch(`/api/quizzes/${quizId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to pull shared quiz');

      setGeneratedQuiz(data.questions);
      setCurrentQuizId(data.quizId);
      setQuizImageBase64(data.imageBase64 || quizImage);
      setQuizImagesBase64(data.imagesBase64 || quizImages);
      setUploadStatus('');
      setActiveTab('terminal');
    } catch (err) {
      alert(`Error loading quiz: ${err.message}`);
    }
  };

  // Get total question count of selected quizzes
  const getSelectedQuizzesTotalQuestions = () => {
    let total = 0;
    selectedQuizzes.forEach(id => {
      const q = createdQuizzes.find(x => x.quizId === id);
      if (q) {
        total += q.questionCount;
      }
    });
    return total;
  };

  // Mix selected quizzes (opens configuration modal)
  const handleMixQuizzes = () => {
    if (selectedQuizzes.length < 2) return;
    const totalQuestions = getSelectedQuizzesTotalQuestions();
    setMixTitle(`Mixed Revision - ${new Date().toLocaleDateString('en-IN')}`);
    setMixQuestionCount(Math.min(25, totalQuestions));
    setShowMixModal(true);
  };

  // Confirms and executes quiz mixing
  const handleMixQuizzesConfirm = async () => {
    setIsMixing(true);
    setUploadStatus('Combining quiz databases and shuffling questions...');
    setShowMixModal(false);

    try {
      const res = await fetch('/api/quizzes/mix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quizIds: selectedQuizzes,
          title: mixTitle,
          questionCount: mixQuestionCount
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mix pipeline failed');

      // Load mixed quiz
      await handleLoadQuiz(data.quizId, null, null);
      setSelectedQuizzes([]);
    } catch (err) {
      alert(`Error mixing quizzes: ${err.message}`);
    } finally {
      setIsMixing(false);
    }
  };

  // Toggle quiz selection for mixer
  const handleSelectQuiz = (quizId) => {
    setSelectedQuizzes(prev => 
      prev.includes(quizId) 
        ? prev.filter(id => id !== quizId) 
        : [...prev, quizId]
    );
  };

  // 4. Reset Session logs out handler
  const handleLogout = () => {
    setUser(null);
    setGeneratedQuiz(null);
    document.cookie = "cgl_session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.reload();
  };

  // Tab configuration
  const tabs = [
    { id: 'terminal', label: 'Testing Portal' },
    { id: 'metrics', label: 'Quiz Repository' },
    { id: 'leaderboard', label: 'Global Leaderboard' },
  ];

  // Hydration protection loader screen
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
          <span className="text-xs text-zinc-500 font-mono">Loading Quizy...</span>
        </div>
      </div>
    );
  }

  // Enforce profile lock-in views if unauthenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center px-4 py-12 relative">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center select-none pointer-events-none flex flex-col items-center">
          <img src="/quizy.png" alt="Quizy Logo" className="h-12 w-auto mb-2" />
          <h1 className="text-2xl font-bold tracking-wider text-white">
            Quizy
          </h1>
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.25em] mt-1 font-semibold">
            AI-Powered Exam Revision Platform
          </p>
        </div>
        <AuthForm onAuthSuccess={(profile) => { setUser(profile); fetchHistoryAndVault(); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-zinc-300 pb-16 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      
      {/* ==========================================
          PREMIUM HEADER
          ========================================== */}
      <header className="w-full bg-zinc-950 border-b border-zinc-900 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <img src="/quizy.png" alt="Quizy Logo" className="h-6 w-auto" />
          <h1 className="text-base font-bold tracking-wider text-white">Quizy</h1>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-0.5 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === tab.id 
                  ? 'bg-zinc-800 text-white' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {/* Engine Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-900 bg-zinc-950/50">
            <span className={`w-1.5 h-1.5 rounded-full ${
              engineStatus === 'online' 
                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' 
                : engineStatus === 'checking'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-zinc-600'
            }`} />
            <span className="text-[10px] font-mono text-zinc-400">
              {engineStatus === 'online' 
                ? 'Engine: Online' 
                : engineStatus === 'checking'
                  ? 'Engine: Waking up...'
                  : 'Engine: Sleeping'}
            </span>
            {engineStatus === 'sleeping' && (
              <button 
                type="button"
                onClick={() => wakeUpBackend(false)}
                className="text-[9px] text-zinc-300 hover:text-white underline ml-1 cursor-pointer font-sans"
              >
                Wake
              </button>
            )}
          </div>

          <span className="text-xs text-zinc-500">
            Username: <span className="text-zinc-300 font-semibold">{user.username}</span>
          </span>
          <button 
            onClick={handleLogout}
            className="p-1.5 rounded bg-zinc-900 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-900/30 transition"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ==========================================
          MAIN LAYOUT REGION
          ========================================== */}
      <div className="flex-grow max-w-7xl w-full mx-auto px-6 mt-8">
        
        {/* VIEW 1: TEST CENTER & UPLOAD ENGINE */}
        {activeTab === 'terminal' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start animate-fade-in">
            
            {/* Left Side: Parameters Config & Upload Console */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* Configuration panel */}
              <div className="glass-card p-5 bg-zinc-950">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                  Exam Parameters
                </h3>
                
                <div className="space-y-4">
                  {/* Target Exam Dropdown */}
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Target Exam</label>
                    <select
                      value={examType}
                      onChange={(e) => setExamType(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                    >
                      <option value="SSC CGL">SSC CGL (Combined Graduate Level)</option>
                      <option value="SSC CHSL">SSC CHSL (Combined Higher Secondary Level)</option>
                      <option value="SSC MTS">SSC MTS (Multi-Tasking Staff)</option>
                      <option value="SSC CPO">SSC CPO (Central Police Organisation)</option>
                    </select>
                  </div>

                  {/* Subject Focus Dropdown */}
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Subject Focus</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                    >
                      <option value="Mixed">Mixed Topics</option>
                      <option value="English (Vocab & Grammar)">English (Vocab & Grammar)</option>
                      <option value="General Studies (GS)">General Studies (GS)</option>
                      <option value="Quantitative Aptitude (Maths)">Quantitative Aptitude (Maths)</option>
                      <option value="Reasoning">General Intelligence & Reasoning</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Upload panel */}
              <div className="glass-card p-5 bg-zinc-950">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Upload Revision Images</h3>
                <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                  Drag & drop or select multiple study note images. Click "Generate Exam" to analyze all pages together.
                </p>
                
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileSelection(e.dataTransfer.files); }}
                  className={`w-full h-28 border border-dashed rounded-lg flex flex-col items-center justify-center gap-1.5 transition ${
                    isScanning 
                      ? 'border-zinc-800 bg-zinc-900/30 opacity-60 pointer-events-none' 
                      : isDragging 
                        ? 'border-white bg-zinc-900/40'
                        : 'border-zinc-800 bg-zinc-900/10 hover:border-zinc-700 hover:bg-zinc-900/20'
                  }`}
                >
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer select-none">
                    <Upload className={`w-6 h-6 mb-1.5 ${isScanning ? 'text-zinc-500 animate-bounce' : 'text-zinc-500'}`} />
                    <span className="text-[11px] text-zinc-400 font-semibold">
                      {isScanning ? 'AI OCR extracting...' : 'Drag & drop or Click to select'}
                    </span>
                    <span className="text-[9px] text-zinc-600 font-mono mt-0.5">Supports JPG, PNG, WEBP</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                      onChange={(e) => { handleFileSelection(e.target.files); e.target.value = ''; }} 
                      disabled={isScanning} 
                    />
                  </label>
                </div>

                {/* Queue Display */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2.5">
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                      <span>Queued Pages ({uploadedFiles.length})</span>
                      <button 
                        type="button"
                        onClick={() => { uploadedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl)); setUploadedFiles([]); }}
                        className="text-red-400 hover:text-red-300 transition text-[9px]"
                      >
                        Clear All
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2">
                      {uploadedFiles.map((fileObj, idx) => (
                        <div key={idx} className="relative group rounded border border-zinc-900 bg-zinc-950 overflow-hidden h-12 flex items-center justify-center">
                          <img 
                            src={fileObj.previewUrl} 
                            alt="Note page" 
                            className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 border border-zinc-800 text-zinc-400 hover:text-white transition"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateExam}
                      disabled={isScanning}
                      className="w-full py-2 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-lg transition"
                    >
                      {isScanning ? 'AI processing...' : 'Generate Exam from Notes'}
                    </button>
                  </div>
                )}

                {uploadStatus && (
                  <div className="mt-3 bg-zinc-900/50 border border-zinc-900 rounded p-2 text-center">
                    <p className="text-[10px] text-zinc-400 font-mono animate-pulse">
                      {uploadStatus}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Testing Console */}
            <div className="lg:col-span-3">
              {generatedQuiz ? (
                <QuizTerminal 
                  quizData={generatedQuiz} 
                  quizId={currentQuizId} 
                  userId={user.id} 
                  imageBase64={quizImageBase64}
                  imagesBase64={quizImagesBase64}
                  onCompleteRefresh={fetchHistoryAndVault}
                />
              ) : isScanning ? (
                <div className="w-full glass-card p-8 bg-zinc-950 border border-zinc-800 animate-slide-up flex flex-col items-center justify-center min-h-[460px] relative overflow-hidden">
                  {/* Grid background effect */}
                  <div className="absolute inset-0 grid-bg opacity-30 select-none pointer-events-none" />
                  
                  {/* Glowing Sweep Scanner Radar */}
                  <div className="w-40 h-40 rounded-full border border-zinc-900 bg-zinc-950 flex items-center justify-center relative shadow-[0_0_50px_rgba(255,255,255,0.02)] mb-8 select-none shrink-0 animate-pulse-glow">
                    {/* Sweeper lines */}
                    <div className="absolute inset-0.5 rounded-full border border-dashed border-zinc-800/80 animate-sweep" style={{ animationDuration: '6s' }} />
                    <div className="absolute inset-2 rounded-full border border-dashed border-zinc-700/40 animate-sweep" style={{ animationDuration: '4s', animationDirection: 'reverse' }} />
                    
                    {/* Sweep Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-zinc-500/0 via-zinc-500/0 to-white/5 rounded-full animate-sweep" style={{ animationDuration: '4s' }} />
                    
                    {/* Inner core */}
                    <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center relative shadow-[0_0_20px_rgba(255,255,255,0.01)]">
                      <BookOpen className="w-6 h-6 text-zinc-400 animate-pulse" />
                    </div>
                  </div>

                  {/* Text Status HUD */}
                  <div className="text-center relative z-10 w-full max-w-xs">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      Quizy AI Vision Scan
                    </h3>
                    
                    <p className="text-[11px] text-zinc-400 font-medium h-4 mb-5 leading-normal">
                      {scanPhaseText}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden mb-6 relative">
                      <div 
                        className="h-full bg-gradient-to-r from-zinc-500 to-white rounded-full transition-all duration-300"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>

                    {/* Scanning stats footer */}
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 border-t border-zinc-900 pt-3.5 font-mono">
                      <span>PAGES LOADED: {uploadedFiles.length || 1}</span>
                      <span>{scanProgress}% ANALYZED</span>
                      <span>API ROUTING: SECURE</span>
                    </div>
                  </div>
                </div>
              ) : rawExtractedQuiz ? (
                <div className="w-full glass-card p-6 bg-zinc-950 border border-zinc-800 animate-slide-up">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Review & Finalize Quiz
                  </h3>
                  <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                    AI successfully extracted <strong className="text-white font-semibold font-mono">{rawExtractedQuiz.length}</strong> questions and <strong className="text-white font-semibold font-mono">{rawExtractedVocab.length}</strong> vocab words from your notes.
                  </p>

                  <div className="space-y-5">
                    {/* Title Input */}
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Quiz Custom Name</label>
                      <input 
                        type="text"
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                        placeholder="Enter quiz title..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700 font-semibold"
                      />
                    </div>

                    {/* Question Count Slider */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider block">Questions to Keep</label>
                        <span className="text-xs font-bold font-mono text-white">{keepCount} / {rawExtractedQuiz.length}</span>
                      </div>
                      <input 
                        type="range"
                        min="1"
                        max={rawExtractedQuiz.length}
                        value={keepCount}
                        onChange={(e) => setKeepCount(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-900 border border-zinc-850 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                      {keepCount < rawExtractedQuiz.length && (
                        <p className="text-[10px] text-amber-500 font-medium mt-2 animate-pulse">
                          {rawExtractedQuiz.length - keepCount} random questions will be discarded upon saving.
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        onClick={handleSaveAndStartQuiz}
                        disabled={isSavingQuiz}
                        className="cursor-pointer w-full py-2.5 bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-black text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                      >
                        {isSavingQuiz ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            Saving Quiz Matrix...
                          </>
                        ) : (
                          'Save & Start Quiz'
                        )}
                      </button>
                      
                      <button
                        onClick={() => {
                          setRawExtractedQuiz(null);
                          setRawExtractedVocab(null);
                          setUploadStatus('');
                        }}
                        disabled={isSavingQuiz}
                        className="cursor-pointer w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-zinc-400 hover:text-white text-xs font-semibold rounded-lg transition"
                      >
                        Discard Entire Extraction
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-[450px] glass-card flex flex-col items-center justify-center text-center p-8 bg-zinc-950">
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                    <FileText className="w-5 h-5 text-zinc-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-400 mb-1">No Active Exam Session</h3>
                  <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
                    Set your exam parameters on the left, upload a note image, and the TCS-pattern revision testing console will compile here.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW 2: GLOBAL LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="animate-fade-in glass-card p-6 bg-zinc-950 border border-zinc-800 rounded-xl max-w-4xl mx-auto">
            <div className="flex items-center gap-3 border-b border-zinc-900 pb-4 mb-6">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Global Standings</h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Cumulative highest marks and activity across all students.
                </p>
              </div>
            </div>

            {loadingLeaderboard ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
                <p className="text-[10px] text-zinc-500 font-mono mt-3">Fetching standings...</p>
              </div>
            ) : globalLeaderboard.length === 0 ? (
              <div className="text-center py-12 border border-zinc-900 rounded-lg">
                <p className="text-xs text-zinc-500">No student records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 font-medium">
                      <th className="py-2.5 px-3 font-semibold text-[10px] uppercase tracking-wider">Rank</th>
                      <th className="py-2.5 px-3 font-semibold text-[10px] uppercase tracking-wider">Student</th>
                      <th className="py-2.5 px-3 font-semibold text-[10px] uppercase tracking-wider text-center">Total Attempts</th>
                      <th className="py-2.5 px-3 font-semibold text-[10px] uppercase tracking-wider text-center">Unique Quizzes</th>
                      <th className="py-2.5 px-3 font-semibold text-[10px] uppercase tracking-wider text-right">Cumulative High Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {globalLeaderboard.map((player) => {
                      const isCurrentUser = player.username === user?.username;
                      return (
                        <tr 
                          key={player.rank}
                          className={`border-b border-zinc-900/60 hover:bg-zinc-900/10 transition ${
                            isCurrentUser 
                              ? 'bg-indigo-500/5 font-semibold text-white' 
                              : 'text-zinc-400'
                          }`}
                        >
                          <td className="py-3 px-3">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              player.rank === 1 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                              player.rank === 2 ? 'bg-zinc-300/10 text-zinc-300' :
                              player.rank === 3 ? 'bg-amber-700/10 text-amber-600' : 'bg-transparent text-zinc-500'
                            }`}>
                              {player.rank}
                            </span>
                          </td>
                          <td className="py-3 px-3 flex items-center gap-2">
                            <span className="truncate max-w-[150px]">{player.username}</span>
                            {player.isGuest && (
                              <span className="text-[8px] px-1 bg-zinc-900 border border-zinc-800 text-zinc-500 font-bold rounded">
                                GUEST
                              </span>
                            )}
                            {isCurrentUser && (
                              <span className="text-[8px] px-1 bg-indigo-500/20 text-indigo-300 font-bold rounded">
                                YOU
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono">{player.totalAttempts}</td>
                          <td className="py-3 px-3 text-center font-mono">{player.uniqueQuizzes}</td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-400 font-mono">
                            {player.totalHighestMarks} Marks
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: HISTORICAL EXAM LOGS & REPOSITORY */}
        {activeTab === 'metrics' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Repository overview panel grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Side (Col span 7): Created Mocks list with check mixer controls */}
              <div className="lg:col-span-7 glass-card p-5 bg-zinc-950">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-4 mb-4 gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      Mock Quiz Repository
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Click quiz to retake. Check 2-3 to merge them.</p>
                  </div>
                  
                  {/* Floating selected counter */}
                  {selectedQuizzes.length >= 2 && (
                    <button
                      onClick={handleMixQuizzes}
                      disabled={isMixing}
                      className="px-3 py-1 bg-white hover:bg-zinc-200 text-black text-[11px] font-bold rounded flex items-center gap-1 transition"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      Mix Selected ({selectedQuizzes.length})
                    </button>
                  )}
                </div>

                {createdQuizzes.length === 0 ? (
                  <div className="text-center py-12 bg-zinc-900/10 border border-zinc-900 rounded-lg">
                    <p className="text-xs text-zinc-500">No mock exams generated yet</p>
                    <p className="text-[10px] text-zinc-600 mt-1">Upload study notes in Testing Portal to generate exams</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {createdQuizzes.map((quiz) => {
                      const isSelected = selectedQuizzes.includes(quiz.quizId);
                      return (
                        <div 
                          key={quiz.quizId} 
                          className={`p-3 rounded-lg border transition flex items-center justify-between gap-3 ${
                            isSelected 
                              ? 'bg-zinc-900 border-zinc-700' 
                              : 'bg-zinc-900/30 border-zinc-900 hover:border-zinc-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Checkbox selector */}
                            <button
                              onClick={() => handleSelectQuiz(quiz.quizId)}
                              className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition shrink-0 ${
                                isSelected 
                                  ? 'bg-white border-white text-black' 
                                  : 'bg-transparent border-zinc-800 hover:border-zinc-700 text-transparent'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>

                            {/* Note preview thumbnail */}
                            {(quiz.imageBase64 || (quiz.imagesBase64 && quiz.imagesBase64[0])) ? (
                              <div 
                                onClick={() => setNotesPreviewImage(quiz.imageBase64 || quiz.imagesBase64[0])}
                                className="w-10 h-10 bg-zinc-950 rounded border border-zinc-800 flex items-center justify-center overflow-hidden cursor-zoom-in shrink-0 hover:border-zinc-600 transition"
                                title="View Notes Image"
                              >
                                <img 
                                  src={`data:image/jpeg;base64,${quiz.imageBase64 || quiz.imagesBase64[0]}`}
                                  alt="Note Thumbnail"
                                  className="w-full h-full object-cover opacity-60 hover:opacity-100 transition"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 bg-zinc-950 rounded border border-zinc-900 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-zinc-700" />
                              </div>
                            )}

                            {/* Meta texts */}
                            <div className="min-w-0 flex-grow">
                              {editingQuizId === quiz.quizId ? (
                                <div className="flex items-center gap-1.5 min-w-0 flex-grow" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={editTitleText}
                                    onChange={(e) => setEditTitleText(e.target.value)}
                                    className="glass-input px-2 py-1 text-[11px] font-semibold w-full focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleRenameQuiz(quiz.quizId)}
                                    className="p-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition"
                                    title="Save Title"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setEditingQuizId(null)}
                                    className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
                                    title="Cancel"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                  <span className="text-xs font-semibold text-white truncate max-w-[200px]" title={quiz.title}>
                                    {quiz.title}
                                  </span>
                                  {quiz.creatorId === user?.id && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingQuizId(quiz.quizId);
                                        setEditTitleText(quiz.title);
                                      }}
                                      className="p-0.5 rounded text-zinc-500 hover:text-white transition animate-fade-in"
                                      title="Rename Quiz"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                  )}
                                  <span className="px-1.5 py-0.2 bg-zinc-900 border border-zinc-800 text-[8px] font-bold rounded text-zinc-400 uppercase tracking-wide">
                                    {quiz.subject}
                                  </span>
                                </div>
                              )}
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                {quiz.questionCount} Questions &bull; Created: {quiz.dateString}
                              </p>
                              {quiz.lastReattemptedAt && (
                                <p className="text-[9px] text-amber-500/80 mt-0.5 font-medium">
                                  Last Reattempted: {new Date(quiz.lastReattemptedAt).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Retake and Share buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <ShareButton quizId={quiz.quizId} />
                            <button
                              onClick={() => handleLoadQuiz(quiz.quizId, quiz.imageBase64, quiz.imagesBase64)}
                              className="cursor-pointer px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-[10px] font-semibold rounded text-white transition"
                            >
                              Start Exam
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Side (Col span 5): Recent Score attempt logs */}
              <div className="lg:col-span-5 glass-card p-5 bg-zinc-950">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-4 mb-4">
                  Recent Attempt History
                </h3>

                {historicalLogs.length === 0 ? (
                  <div className="text-center py-12 bg-zinc-900/10 border border-zinc-900 rounded-lg">
                    <p className="text-xs text-zinc-500">No mock attempts recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    {historicalLogs.map((log, index) => (
                      <div key={log.logId || index} className="p-3 bg-zinc-900/20 border border-zinc-900 rounded-lg flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-bold text-white">
                            Mock: {String(log.quizId).substring(0, 8).toUpperCase()}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5 font-mono">
                            <span>{log.dateString}</span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {log.speedMinutes} min</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] uppercase text-zinc-500 block">Accuracy</span>
                          <span className={`text-sm font-bold ${log.accuracy >= 70 ? 'text-emerald-400' : 'text-amber-500'}`}>
                            {log.accuracy}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ==========================================
          LIGHTBOX NOTE PREVIEW MODAL MODULE
          ========================================== */}
      {notesPreviewImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full h-[85vh] bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col overflow-hidden animate-fade-in">
            {/* Modal header */}
            <div className="flex items-center justify-between p-3 border-b border-zinc-900 shrink-0">
              <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Study Note Preview
              </span>
              <button 
                onClick={() => setNotesPreviewImage(null)}
                className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white transition border border-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Image display */}
            <div className="flex-grow w-full overflow-auto p-4 flex items-center justify-center bg-black select-none">
              <img 
                src={`data:image/jpeg;base64,${notesPreviewImage}`}
                alt="Full study notes zoom"
                className="max-h-full max-w-full object-contain rounded"
                draggable="false"
              />
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MIXER PARAMETER SETUP MODAL
          ========================================== */}
      {showMixModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col overflow-hidden animate-slide-up p-5">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-zinc-400" />
                Configure Mixed Quiz
              </h3>
              <button 
                onClick={() => setShowMixModal(false)}
                className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white transition border border-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Merged Quiz Title</label>
                <input 
                  type="text"
                  value={mixTitle}
                  onChange={(e) => setMixTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700 font-semibold"
                  placeholder="Enter mixed quiz name..."
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider block">Include Questions</label>
                  <span className="text-xs font-bold font-mono text-white">{mixQuestionCount} / {getSelectedQuizzesTotalQuestions()}</span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max={getSelectedQuizzesTotalQuestions()}
                  value={mixQuestionCount}
                  onChange={(e) => setMixQuestionCount(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-900 border border-zinc-850 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <p className="text-[9px] text-zinc-500 leading-relaxed mt-2">
                  We will pool all questions from the selected past quizzes, shuffle them, and randomly select {mixQuestionCount} questions.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowMixModal(false)}
                  className="cursor-pointer w-1/2 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMixQuizzesConfirm}
                  className="cursor-pointer w-1/2 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-lg transition"
                >
                  Merge & Start
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}