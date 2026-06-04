'use client';

import { useState, useEffect } from 'react';
import { Upload, BookOpen, Award, LogOut, FileText, CheckCircle2, Clock, TrendingUp, Shuffle, Eye, X, Sliders, Check } from 'lucide-react';
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
  const [quizImageBase64, setQuizImageBase64] = useState(null);
  const [quizImagesBase64, setQuizImagesBase64] = useState(null);
  const [vaultWords, setVaultWords] = useState([]);
  const [historicalLogs, setHistoricalLogs] = useState([]);
  const [createdQuizzes, setCreatedQuizzes] = useState([]);

  // Advanced feature inputs
  const [examType, setExamType] = useState('SSC CGL');
  const [subject, setSubject] = useState('Mixed');
  const [questionCount, setQuestionCount] = useState(5);
  const [selectedQuizzes, setSelectedQuizzes] = useState([]);
  const [isMixing, setIsMixing] = useState(false);
  const [notesPreviewImage, setNotesPreviewImage] = useState(null);

  // Multiple image queue states
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

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

  // 2. Fetch User History, Quizzes and Words Vault from DB
  const fetchHistoryAndVault = async () => {
    try {
      const scoreRes = await fetch('/api/scores');
      if (scoreRes.ok) {
        const scoreData = await scoreRes.json();
        setHistoricalLogs(scoreData.history || []);
        setCreatedQuizzes(scoreData.createdQuizzes || []);
      }

      const vocabRes = await fetch('/api/vocab');
      if (vocabRes.ok) {
        const vocabData = await vocabRes.json();
        setVaultWords(vocabData.vocabWords || []);
      }
    } catch (err) {
      console.error("Failed to sync background metrics profiles:", err);
    }
  };

  // Client-side image compression utility
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
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

          // Get compressed data URL (JPEG, 0.75 quality for database efficiency)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          const base64 = compressedDataUrl.split(',')[1];
          resolve(base64);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Select multiple files
  const handleFileSelection = (files) => {
    if (!files) return;
    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
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

    setUploadStatus('Compressing queued note images...');
    setIsScanning(true);

    try {
      const compressionPromises = uploadedFiles.map(f => compressImage(f.file));
      const base64Array = await Promise.all(compressionPromises);

      setUploadStatus('Running AI OCR + Synthesis (this may take up to 45 seconds)...');
      
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imagesBase64: base64Array, 
          userId: user?.id,
          examType,
          subject,
          questionCount
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pipeline parsing breakdown');

      setGeneratedQuiz(data.quizData);
      setCurrentQuizId(data.quizId);
      setQuizImageBase64(base64Array[0] || null);
      setQuizImagesBase64(base64Array);
      setUploadStatus('Analysis complete — quiz generated successfully.');
      
      // Clean up local blob URLs
      uploadedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
      setUploadedFiles([]);
      
      // Refresh local cache metrics
      fetchHistoryAndVault();
    } catch (err) {
      setUploadStatus(`Error: ${err.message}`);
    } finally {
      setIsScanning(false);
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

  // Mix selected quizzes
  const handleMixQuizzes = async () => {
    if (selectedQuizzes.length < 2) return;
    setIsMixing(true);
    setUploadStatus('Combining quiz databases and shuffling questions...');

    try {
      const res = await fetch('/api/quizzes/mix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizIds: selectedQuizzes })
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
    { id: 'vault', label: 'Vocab Vault' },
    { id: 'metrics', label: 'Quiz Repository' },
  ];

  // Hydration protection loader screen
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
          <span className="text-xs text-zinc-500 font-mono">Loading CGL Core...</span>
        </div>
      </div>
    );
  }

  // Enforce profile lock-in views if unauthenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12 relative">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center select-none pointer-events-none">
          <h1 className="text-2xl font-bold tracking-wider text-white">
            CGL Core
          </h1>
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.25em] mt-1.5 font-semibold">
            Competitive Exam Revision Engine
          </p>
        </div>
        <AuthForm onAuthSuccess={(profile) => { setUser(profile); fetchHistoryAndVault(); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-300 pb-16 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      
      {/* ==========================================
          PREMIUM HEADER
          ========================================== */}
      <header className="w-full bg-zinc-950 border-b border-zinc-900 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <h1 className="text-base font-bold tracking-wider text-white">CGL Core</h1>
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

                  {/* Question Count Selection */}
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Question Count</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[5, 10, 15, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setQuestionCount(num)}
                          className={`py-1.5 rounded border text-xs font-semibold font-mono transition ${
                            questionCount === num
                              ? 'bg-white border-white text-black font-bold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                          }`}
                        >
                          {num} Qs
                        </button>
                      ))}
                    </div>
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
                      onChange={(e) => handleFileSelection(e.target.files)} 
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
                />
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

        {/* VIEW 2: VOCABULARY VAULT */}
        {activeTab === 'vault' && (
          <div className="animate-fade-in bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden">
            <VocabVault vocabularyItems={vaultWords} />
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
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                                  {quiz.isMixed ? 'Combined revision' : quiz.examType}
                                </span>
                                <span className="px-1.5 py-0.2 bg-zinc-900 border border-zinc-800 text-[8px] font-bold rounded text-zinc-400 uppercase tracking-wide">
                                  {quiz.subject}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                {quiz.questionCount} Questions &bull; {quiz.dateString}
                              </p>
                            </div>
                          </div>

                          {/* Retake button */}
                          <button
                            onClick={() => handleLoadQuiz(quiz.quizId, quiz.imageBase64, quiz.imagesBase64)}
                            className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-[10px] font-semibold rounded text-white transition shrink-0"
                          >
                            Start Exam
                          </button>
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

    </div>
  );
}