'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Timer, Award, RotateCcw, Share2, FileText, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

export default function QuizTerminal({ quizData, quizId, userId, imageBase64 = null, imagesBase64 = null, onCompleteRefresh = null }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Notes view states
  const [showNotes, setShowNotes] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  const currentQuestion = quizData[currentIndex];

  // Compile list of note images
  const hasNotes = !!imageBase64 || (Array.isArray(imagesBase64) && imagesBase64.length > 0);
  const allImages = Array.isArray(imagesBase64) ? imagesBase64 : (imageBase64 ? [imageBase64] : []);

  // 1. Core Exam Clock Timer
  useEffect(() => {
    if (quizComplete) return;
    const interval = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [quizComplete]);

  // 2. Select Option Processing Logic
  const handleOptionClick = (optionIndex) => {
    if (isLocked) return;
    
    setSelectedOption(optionIndex);
    setIsLocked(true);

    const targetMap = ['A', 'B', 'C', 'D'];
    if (targetMap[optionIndex] === currentQuestion.correctAnswer) {
      setScore((prev) => prev + 1);
    }
  };

  // 3. Slide Progression Handling Route
  const handleNext = async () => {
    if (currentIndex < quizData.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsLocked(false);
    } else {
      setQuizComplete(true);
      await saveFinalScore();
    }
  };

  // 4. API Core Integration: Commit metrics to Cloud Database
  const saveFinalScore = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId,
          score,
          totalQuestions: quizData.length,
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

  // 5. Utility: Generate Shareable Mock Link Address
  const copyShareLink = () => {
    const origin = window.location.origin;
    const path = `${origin}/mock/${quizId}`;
    navigator.clipboard.writeText(path);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 3000);
  };

  // 6. Utility: Reset state fields for a re-attempt loop
  const resetQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsLocked(false);
    setScore(0);
    setTimeSpent(0);
    setQuizComplete(false);
    setZoomLevel(1);
    setActiveImageIndex(0);
  };

  // Format digital stopwatch display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Option labels
  const alphabeticDesignations = ['A', 'B', 'C', 'D'];

  // ==========================================
  // VIEW RENDER: Complete Mock Summary Display
  // ==========================================
  if (quizComplete) {
    const accuracy = Math.round((score / quizData.length) * 100);
    return (
      <div className="glass-card p-8 max-w-2xl mx-auto text-center animate-slide-up border border-zinc-800 bg-zinc-950">
        <Award className="w-12 h-12 text-zinc-100 mx-auto mb-4" />
        <h2 className="text-xl font-bold tracking-wide text-white mb-1">Mock Exam Complete</h2>
        <p className="text-xs text-zinc-500 mb-6">Attempt recorded on server</p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Final Score</div>
            <div className="text-lg font-bold text-white">{score * 2} / {quizData.length * 2} Marks</div>
            <div className="text-[9px] text-zinc-600 mt-0.5">({score} / {quizData.length} Qs correct)</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Accuracy</div>
            <div className="text-lg font-bold text-emerald-400">{accuracy}%</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Time Elapsed</div>
            <div className="text-lg font-bold text-amber-500 font-mono">{formatTime(timeSpent)}</div>
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
            onClick={copyShareLink}
            className="cursor-pointer flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-md transition"
          >
            <Share2 className="w-3.5 h-3.5" /> {shareCopied ? 'Link Copied!' : 'Share Results'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full mx-auto transition-all duration-300 animate-fade-in ${showNotes && hasNotes ? 'max-w-6xl' : 'max-w-2xl'}`}>
      <div className={`glass-card p-6 bg-zinc-950 border border-zinc-800 rounded-xl ${
        showNotes && hasNotes ? 'grid grid-cols-1 lg:grid-cols-12 gap-6' : 'flex flex-col'
      }`}>
        
        {/* ==========================================
            LEFT COLUMN: ZOOMABLE STUDY NOTES VIEWER
            ========================================== */}
        {showNotes && hasNotes && (
          <div className="lg:col-span-6 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800 pb-6 lg:pb-0 lg:pr-6 h-[560px]">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <h4 className="text-xs font-semibold text-zinc-300">Original Notes</h4>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Note tabs if mixed */}
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
                
                {/* Zoom controls */}
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

            {/* Note Canvas Container */}
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
            RIGHT COLUMN: ACTIVE LIVE TESTING WORKSPACE
            ========================================== */}
        <div className={showNotes && hasNotes ? 'lg:col-span-6 flex flex-col justify-between' : 'w-full flex flex-col justify-between'}>
          <div>
            {/* Top HUD Header Status Track */}
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-5 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-semibold text-zinc-300">
                  Question {currentIndex + 1} of {quizData.length}
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-900/50 border border-zinc-900 text-[9px] font-bold text-zinc-500 font-mono">
                  +2 MARKS
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
                style={{ width: `${((currentIndex + 1) / quizData.length) * 100}%` }}
              />
            </div>

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

                if (isLocked) {
                  const isCurrentCorrect = letter === currentQuestion.correctAnswer;
                  const isCurrentSelected = idx === selectedOption;

                  if (isCurrentCorrect) {
                    optionStyles = "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
                    badgeStyles = "bg-emerald-500/20 text-emerald-400";
                    IconElement = <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-emerald-400" />;
                  } else if (isCurrentSelected) {
                    optionStyles = "border-red-500/20 bg-red-500/10 text-red-300";
                    badgeStyles = "bg-red-500/20 text-red-400";
                    IconElement = <XCircle className="w-4.5 h-4.5 shrink-0 text-red-400" />;
                  } else {
                    optionStyles = "border-zinc-900/60 opacity-30 text-zinc-600 cursor-not-allowed bg-transparent";
                    badgeStyles = "bg-zinc-950 text-zinc-600";
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isLocked}
                    onClick={() => handleOptionClick(idx)}
                    className={`w-full text-left p-3.5 rounded-lg border flex items-center justify-between transition-all duration-150 group ${optionStyles}`}
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
            {isLocked && (
              <div className="bg-zinc-900/30 border border-zinc-900 rounded-lg p-4 mb-5 animate-fade-in">
                <h4 className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold mb-1">Explanation</h4>
                <p className="text-xs text-zinc-300 leading-relaxed">{currentQuestion.explanation}</p>
              </div>
            )}
          </div>

          {/* Action Footer */}
          {isLocked && (
            <button
              onClick={handleNext}
              className="w-full py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-lg transition"
            >
              {currentIndex === quizData.length - 1 ? 'Finish Exam' : 'Next Question'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}