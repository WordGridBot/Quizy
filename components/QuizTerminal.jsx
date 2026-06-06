'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Timer, Award, RotateCcw, Share2, FileText, ZoomIn, ZoomOut, Maximize, X, AlertTriangle, Play, HelpCircle } from 'lucide-react';

const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Shuffles the questions, and for each question, shuffles its options and updates the correctAnswer
const jumbleQuizData = (originalData) => {
  if (!Array.isArray(originalData)) return [];
  const shuffledQuestions = shuffleArray(originalData).map((q) => {
    if (!q.options || !q.correctAnswer) return q;
    const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
    const correctIdx = optionLabels.indexOf(q.correctAnswer.toUpperCase());
    if (correctIdx === -1 || correctIdx >= q.options.length) return q;
    
    const correctText = q.options[correctIdx];
    
    // Create option indices and shuffle them
    const indices = Array.from({ length: q.options.length }, (_, i) => i);
    const shuffledIndices = shuffleArray(indices);
    
    const newOptions = shuffledIndices.map(idx => q.options[idx]);
    const newCorrectIdx = newOptions.indexOf(correctText);
    const newCorrectAnswer = newCorrectIdx !== -1 ? optionLabels[newCorrectIdx] : q.correctAnswer;
    
    return {
      ...q,
      options: newOptions,
      correctAnswer: newCorrectAnswer
    };
  });
  return shuffledQuestions;
};

export default function QuizTerminal({ quizData, quizId, userId, imageBase64 = null, imagesBase64 = null, onCompleteRefresh = null }) {
  const [shuffledQuizData, setShuffledQuizData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { [questionIdx]: selectedOptionIdx }
  const [timeSpent, setTimeSpent] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  
  // Note viewer states
  const [showNotes, setShowNotes] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Short Quiz prompt states
  const [needsLengthSelection, setNeedsLengthSelection] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Performance stats computed at submission
  const [stats, setStats] = useState({
    correct: 0,
    incorrect: 0,
    skipped: 0,
    attempted: 0,
    score: 0,
    accuracy: 0
  });

  const hasNotes = !!imageBase64 || (Array.isArray(imagesBase64) && imagesBase64.length > 0);
  const allImages = Array.isArray(imagesBase64) ? imagesBase64 : (imageBase64 ? [imageBase64] : []);

  // 1. Initialize and handle quiz jumbling / length checks
  useEffect(() => {
    if (quizData && quizData.length > 0) {
      if (quizData.length >= 30) {
        setNeedsLengthSelection(true);
      } else {
        setShuffledQuizData(jumbleQuizData(quizData));
        setNeedsLengthSelection(false);
      }
    }
  }, [quizData]);

  const handleStartQuiz = (isShort) => {
    let questionsToUse = [...quizData];
    if (isShort) {
      const shuffledAll = shuffleArray(quizData);
      questionsToUse = shuffledAll.slice(0, 30);
    }
    setShuffledQuizData(jumbleQuizData(questionsToUse));
    setNeedsLengthSelection(false);
  };

  // 2. Clock Timer
  useEffect(() => {
    if (quizComplete || needsLengthSelection) return;
    const interval = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [quizComplete, needsLengthSelection]);

  // 3. Select Option during exam (does not lock immediately)
  const handleOptionClick = (optionIndex) => {
    if (reviewMode || quizComplete) return;
    setUserAnswers(prev => ({
      ...prev,
      [currentIndex]: optionIndex
    }));
  };

  // 4. End Mock Submission Handler
  const handleEndMock = async () => {
    let correct = 0;
    let incorrect = 0;
    const optionLabels = ['A', 'B', 'C', 'D'];

    shuffledQuizData.forEach((q, idx) => {
      const selected = userAnswers[idx];
      if (selected !== undefined) {
        if (optionLabels[selected] === q.correctAnswer) {
          correct++;
        } else {
          incorrect++;
        }
      }
    });

    const attempted = correct + incorrect;
    const skipped = shuffledQuizData.length - attempted;
    // +2 for correct, -0.50 for incorrect
    const finalScore = (correct * 2) - (incorrect * 0.50);
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

    setStats({
      correct,
      incorrect,
      skipped,
      attempted,
      score: finalScore,
      accuracy
    });

    setQuizComplete(true);
    await saveFinalScore(correct, incorrect, finalScore);
  };

  // 5. Save metrics to API
  const saveFinalScore = async (correct, incorrect, finalScore) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId,
          score: finalScore,
          correctCount: correct,
          incorrectCount: incorrect,
          totalQuestions: shuffledQuizData.length,
          timeSpentSeconds: timeSpent
        })
      });
      if (res.ok && onCompleteRefresh) {
        onCompleteRefresh();
      }
    } catch (err) {
      console.error("Failed to commit terminal stats:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const copyShareLink = () => {
    const origin = window.location.origin;
    const path = `${origin}/mock/${quizId}`;
    navigator.clipboard.writeText(path);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 3000);
  };

  const resetQuiz = () => {
    setCurrentIndex(0);
    setUserAnswers({});
    setQuizComplete(false);
    setReviewMode(false);
    setTimeSpent(0);
    setZoomLevel(1);
    setActiveImageIndex(0);
    if (quizData.length >= 30) {
      setNeedsLengthSelection(true);
      setShuffledQuizData([]);
    } else {
      setShuffledQuizData(jumbleQuizData(quizData));
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const alphabeticDesignations = ['A', 'B', 'C', 'D'];

  // ==========================================
  // VIEW RENDER 1: Quiz Length Selection Modal (>= 30 Qs)
  // ==========================================
  if (needsLengthSelection) {
    return (
      <div className="glass-card p-8 max-w-md mx-auto text-center border border-zinc-800 bg-zinc-950 rounded-xl animate-fade-in">
        <HelpCircle className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold tracking-wide text-white mb-2">Select Quiz Mode</h2>
        <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
          This study pack contains <span className="text-zinc-200 font-semibold">{quizData.length}</span> questions. Choose how you want to practice:
        </p>

        <div className="space-y-3">
          <button
            onClick={() => handleStartQuiz(true)}
            className="cursor-pointer w-full p-4 rounded-lg border border-zinc-800 bg-zinc-900/40 text-left hover:border-indigo-500/50 hover:bg-zinc-900 transition flex items-start gap-3 group"
          >
            <div className="p-2 rounded bg-indigo-500/10 text-indigo-400 shrink-0 group-hover:bg-indigo-500/20">
              <Play className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Short Quiz (30 Qs)</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Attempt 30 random questions from the note pool. Perfect for a quick session.</div>
            </div>
          </button>

          <button
            onClick={() => handleStartQuiz(false)}
            className="cursor-pointer w-full p-4 rounded-lg border border-zinc-800 bg-zinc-900/40 text-left hover:border-emerald-500/50 hover:bg-zinc-900 transition flex items-start gap-3 group"
          >
            <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 shrink-0 group-hover:bg-emerald-500/20">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Full Quiz ({quizData.length} Qs)</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Complete mock exam covering all generated questions. Test your thoroughness.</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW RENDER 2: Exam Complete Stats Summary
  // ==========================================
  if (quizComplete && !reviewMode) {
    return (
      <div className="glass-card p-8 max-w-2xl mx-auto text-center animate-slide-up border border-zinc-800 bg-zinc-950 rounded-xl">
        <Award className="w-12 h-12 text-zinc-100 mx-auto mb-4" />
        <h2 className="text-xl font-bold tracking-wide text-white mb-1">Mock Exam Complete</h2>
        <p className="text-xs text-zinc-500 mb-6">Attempt logged on database</p>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          <div className="bg-zinc-900/50 border border-zinc-900 rounded-lg p-4 text-center col-span-2 md:col-span-1">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Final Score</div>
            <div className="text-lg font-bold text-white">
              {stats.score.toFixed(2).replace(/\.00$/, '')} / {shuffledQuizData.length * 2} Marks
            </div>
            <div className="text-[9px] text-zinc-600 mt-0.5">
              (Correct +2, Wrong -0.50)
            </div>
          </div>
          
          <div className="bg-zinc-900/50 border border-zinc-900 rounded-lg p-4 text-center">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Accuracy</div>
            <div className="text-lg font-bold text-emerald-400">{stats.accuracy}%</div>
            <div className="text-[9px] text-zinc-600 mt-0.5">({stats.attempted} attempted)</div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-900 rounded-lg p-4 text-center">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Time Elapsed</div>
            <div className="text-lg font-bold text-amber-500 font-mono">{formatTime(timeSpent)}</div>
            <div className="text-[9px] text-zinc-600 mt-0.5">stopwatch clock</div>
          </div>
        </div>

        {/* Attempt Details Metrics List */}
        <div className="max-w-md mx-auto bg-zinc-900/20 border border-zinc-900 rounded-lg p-4 mb-8 text-left space-y-2">
          <div className="flex justify-between text-xs py-1 border-b border-zinc-900/40">
            <span className="text-zinc-500">Attempted Questions</span>
            <span className="font-semibold text-white">{stats.attempted} / {shuffledQuizData.length}</span>
          </div>
          <div className="flex justify-between text-xs py-1 border-b border-zinc-900/40">
            <span className="text-emerald-500">Correct Answers</span>
            <span className="font-semibold text-emerald-400">+{stats.correct} ({(stats.correct * 2)} Marks)</span>
          </div>
          <div className="flex justify-between text-xs py-1 border-b border-zinc-900/40">
            <span className="text-red-500">Incorrect Answers</span>
            <span className="font-semibold text-red-400">-{stats.incorrect} (-{(stats.incorrect * 0.50).toFixed(2).replace(/\.00$/, '')} Marks)</span>
          </div>
          <div className="flex justify-between text-xs py-1">
            <span className="text-zinc-400">Skipped (No Impact)</span>
            <span className="font-semibold text-zinc-400">{stats.skipped}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button 
            onClick={resetQuiz}
            className="cursor-pointer flex items-center justify-center gap-1.5 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-white text-xs font-semibold rounded-md transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Re-attempt
          </button>
          <button 
            onClick={() => setReviewMode(true)}
            className="cursor-pointer flex items-center justify-center gap-1.5 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-white text-xs font-semibold rounded-md transition"
          >
            <HelpCircle className="w-3.5 h-3.5" /> Review Answers
          </button>
          <button 
            onClick={copyShareLink}
            className="cursor-pointer flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-md transition"
          >
            <Share2 className="w-3.5 h-3.5" /> {shareCopied ? 'Link Copied!' : 'Share Results'}
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = shuffledQuizData[currentIndex] || null;
  if (!currentQuestion) return null;

  const currentSelection = userAnswers[currentIndex];

  return (
    <div className={`w-full mx-auto transition-all duration-300 animate-fade-in ${showNotes && hasNotes ? 'max-w-6xl' : 'max-w-2xl'}`}>
      <div className={`glass-card p-6 bg-zinc-950 border border-zinc-800 rounded-xl ${
        showNotes && hasNotes ? 'grid grid-cols-1 lg:grid-cols-12 gap-6' : 'flex flex-col'
      }`}>
        
        {/* ==========================================
            LEFT COLUMN: STUDY NOTES VIEWER
            ========================================== */}
        {showNotes && hasNotes && (
          <div className="lg:col-span-6 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800 pb-6 lg:pb-0 lg:pr-6 h-[560px]">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <h4 className="text-xs font-semibold text-zinc-300">Original Notes</h4>
              </div>
              
              <div className="flex items-center gap-3">
                {allImages.length > 1 && (
                  <div className="flex items-center gap-0.5 bg-zinc-900 p-0.5 rounded border border-zinc-800">
                    {allImages.map((_, imgIdx) => (
                      <button
                        key={imgIdx}
                        onClick={() => { setActiveImageIndex(imgIdx); setZoomLevel(1); }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition ${
                          activeImageIndex === imgIdx 
                            ? 'bg-zinc-800 text-white' 
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Page {imgIdx + 1}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                    className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <span className="text-[10px] text-zinc-500 font-mono w-9 text-center">{Math.round(zoomLevel * 100)}%</span>
                  <button 
                    onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.25))}
                    className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => setZoomLevel(1)}
                    className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition"
                    title="Reset Zoom"
                  >
                    <Maximize className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-grow w-full bg-zinc-950 rounded-lg border border-zinc-900 overflow-auto flex items-center justify-center p-3 relative select-none">
              <img 
                src={`data:image/jpeg;base64,${allImages[activeImageIndex]}`}
                alt="Study Notes"
                className="max-h-full max-w-full object-contain rounded transition-transform duration-150 origin-center"
                style={{ transform: `scale(${zoomLevel})` }}
                draggable="false"
              />
            </div>
          </div>
        )}

        {/* ==========================================
            RIGHT COLUMN: ACTIVE TESTING WORKSPACE
            ========================================== */}
        <div className={showNotes && hasNotes ? 'lg:col-span-6 flex flex-col justify-between' : 'w-full flex flex-col justify-between'}>
          <div>
            {/* Top HUD Header Status Track */}
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-5 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-semibold text-zinc-300">
                  Question {currentIndex + 1} of {shuffledQuizData.length}
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-900/50 border border-zinc-900 text-[9px] font-bold text-zinc-500 font-mono">
                  +2 / -0.50 MARKS
                </span>
              </div>
              <div className="flex items-center gap-3">
                {hasNotes && (
                  <button 
                    onClick={() => setShowNotes(!showNotes)}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all duration-150 border ${
                      showNotes 
                        ? 'bg-white text-black border-white font-bold' 
                        : 'bg-transparent text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    {showNotes ? 'Hide Notes' : 'View Notes'}
                  </button>
                )}
                <div className="flex items-center gap-1 text-xs text-zinc-400">
                  <Timer className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="font-mono">{formatTime(timeSpent)}</span>
                </div>
              </div>
            </div>

            {/* Progress Accents Navigation Bar */}
            <div className="w-full h-1 bg-zinc-900 rounded-full mb-6 overflow-hidden shrink-0">
              <div 
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / shuffledQuizData.length) * 100}%` }}
              />
            </div>

            {/* Review mode state banner */}
            {reviewMode && (
              <div className={`mb-4 p-3 rounded-lg border text-xs flex items-center justify-between ${
                currentSelection === undefined
                  ? 'border-zinc-800 bg-zinc-900/20 text-zinc-400'
                  : alphabeticDesignations[currentSelection] === currentQuestion.correctAnswer
                  ? 'border-emerald-950 bg-emerald-950/20 text-emerald-400'
                  : 'border-red-950 bg-red-950/20 text-red-400'
              }`}>
                <div className="flex items-center gap-2">
                  {currentSelection === undefined ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : alphabeticDesignations[currentSelection] === currentQuestion.correctAnswer ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>
                    {currentSelection === undefined
                      ? 'You skipped this question (0 Marks)'
                      : alphabeticDesignations[currentSelection] === currentQuestion.correctAnswer
                      ? 'Correct Answer (+2.00 Marks)'
                      : 'Incorrect Answer (-0.50 Marks)'}
                  </span>
                </div>
                {currentSelection !== undefined && (
                  <span className="font-mono text-[10px] bg-black/40 px-1.5 py-0.5 rounded">
                    Selected: {alphabeticDesignations[currentSelection]} &bull; Correct: {currentQuestion.correctAnswer}
                  </span>
                )}
              </div>
            )}

            {/* Question Text Layer */}
            <p className="text-base text-zinc-100 font-medium mb-6 leading-relaxed">
              {currentQuestion.question}
            </p>

            {/* Selectable Option Wrappers */}
            <div className="space-y-2 mb-5">
              {currentQuestion.options.map((option, idx) => {
                const letter = alphabeticDesignations[idx];
                
                let optionStyles = "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700";
                let badgeStyles = "bg-zinc-800/80 text-zinc-400 group-hover:text-white";
                let IconElement = null;

                if (reviewMode) {
                  const isCorrect = letter === currentQuestion.correctAnswer;
                  const isUserSelection = idx === currentSelection;

                  if (isCorrect) {
                    optionStyles = "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
                    badgeStyles = "bg-emerald-500/20 text-emerald-400";
                    IconElement = <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-emerald-400" />;
                  } else if (isUserSelection) {
                    optionStyles = "border-red-500/20 bg-red-500/10 text-red-300";
                    badgeStyles = "bg-red-500/20 text-red-400";
                    IconElement = <XCircle className="w-4.5 h-4.5 shrink-0 text-red-400" />;
                  } else {
                    optionStyles = "border-zinc-900/60 opacity-30 text-zinc-600 cursor-not-allowed bg-transparent";
                    badgeStyles = "bg-zinc-950 text-zinc-600";
                  }
                } else {
                  const isSelected = idx === currentSelection;
                  if (isSelected) {
                    optionStyles = "border-white bg-zinc-900 text-white font-semibold";
                    badgeStyles = "bg-white text-black";
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={reviewMode}
                    onClick={() => handleOptionClick(idx)}
                    className={`cursor-pointer w-full text-left p-3.5 rounded-lg border flex items-center justify-between transition-all duration-150 group ${optionStyles}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold shrink-0 transition ${badgeStyles}`}>
                        {letter}
                      </span>
                      <span className="text-sm leading-tight pt-0.5">{option}</span>
                    </div>
                    {IconElement}
                  </button>
                );
              })}
            </div>

            {/* Explanation Panel */}
            {reviewMode && (
              <div className="bg-zinc-900/30 border border-zinc-900 rounded-lg p-4 mb-5 animate-fade-in">
                <h4 className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold mb-1">Explanation</h4>
                <p className="text-xs text-zinc-300 leading-relaxed">{currentQuestion.explanation}</p>
              </div>
            )}
          </div>

          {/* Action Footer Navigation Control */}
          <div className="flex justify-between items-center gap-3 mt-6 border-t border-zinc-900 pt-4 shrink-0">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="cursor-pointer px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed rounded text-xs font-semibold text-white transition flex items-center gap-1.5"
            >
              Previous
            </button>
            
            {!reviewMode ? (
              <button
                onClick={() => setShowEndConfirm(true)}
                className="cursor-pointer px-5 py-2 bg-red-600/10 border border-red-500/30 hover:bg-red-600/20 text-red-400 rounded text-xs font-bold transition"
              >
                End Mock
              </button>
            ) : (
              <button
                onClick={() => setReviewMode(false)}
                className="cursor-pointer px-5 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded text-xs font-bold transition flex items-center gap-1.5"
              >
                Score Summary
              </button>
            )}

            <button
              onClick={() => {
                if (currentIndex < shuffledQuizData.length - 1) {
                  setCurrentIndex(prev => prev + 1);
                } else if (!reviewMode) {
                  setShowEndConfirm(true);
                }
              }}
              className="cursor-pointer px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded text-xs font-bold transition flex items-center gap-1.5"
            >
              {currentIndex === shuffledQuizData.length - 1 && !reviewMode ? 'Finish Exam' : 'Next'}
            </button>
          </div>
        </div>

      </div>

      {/* Confirmation End Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-sm w-full border border-zinc-800 bg-zinc-950 text-center animate-scale-in rounded-xl">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white mb-2">End Mock Exam?</h3>
            <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
              You have answered {Object.keys(userAnswers).length} out of {shuffledQuizData.length} questions. Are you sure you want to submit and grade your exam?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="cursor-pointer flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-xs font-semibold text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowEndConfirm(false); handleEndMock(); }}
                className="cursor-pointer flex-1 py-2 bg-red-600 hover:bg-red-500 rounded text-xs font-bold text-white transition"
              >
                Submit & Grade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}