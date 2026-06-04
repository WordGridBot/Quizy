'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Timer, Award, RotateCcw, Share2 } from 'lucide-react';

export default function QuizTerminal({ quizData, quizId, userId }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const currentQuestion = quizData[currentIndex];

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

    // Map option index (0, 1, 2, 3) to standard ABCD designator string
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
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId,
          score,
          totalQuestions: quizData.length,
          timeSpentSeconds: timeSpent
        })
      });
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
  };

  // Format digital stopwatch display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ==========================================
  // VIEW RENDER: Complete Mock Summary Display
  // ==========================================
  if (quizComplete) {
    const accuracy = Math.round((score / quizData.length) * 100);
    return (
      <div className="w-full bg-cyber-obsidian border border-cyber-slate/40 p-6 rounded-xl max-w-2xl mx-auto text-center backdrop-blur-md">
        <Award className="w-16 h-16 text-cyber-cyan mx-auto mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold font-mono tracking-wide text-white mb-2">MOCK MATRIX EVALUATION</h2>
        <p className="text-sm text-gray-400 mb-6">TCS Standard Metrics Logged Successfully</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-cyber-void border border-cyber-slate/20 p-4 rounded-lg">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Final Score</div>
            <div className="text-xl font-bold font-mono text-cyber-cyan">{score} / {quizData.length}</div>
          </div>
          <div className="bg-cyber-void border border-cyber-slate/20 p-4 rounded-lg">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Precision</div>
            <div className="text-xl font-bold font-mono text-cyber-emerald">{accuracy}%</div>
          </div>
          <div className="bg-cyber-void border border-cyber-slate/20 p-4 rounded-lg">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Time Elapsed</div>
            <div className="text-xl font-bold font-mono text-amber-400">{formatTime(timeSpent)}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={resetQuiz}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold bg-cyber-slate hover:bg-gray-700 text-white border border-gray-600 transition"
          >
            <RotateCcw className="w-4 h-4" /> Re-attempt Drill
          </button>
          <button 
            onClick={copyShareLink}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold bg-cyber-cyan/10 hover:bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 transition"
          >
            <Share2 className="w-4 h-4" /> {shareCopied ? 'Link Copied!' : 'Share Matrix Link'}
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW RENDER: Active Live Testing Layout
  // ==========================================
  const alphabeticDesignations = ['A', 'B', 'C', 'D'];

  return (
    <div className="w-full bg-cyber-obsidian border border-cyber-slate/30 rounded-xl p-5 max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
      
      {/* Top HUD Header Status Track */}
      <div className="flex justify-between items-center border-b border-cyber-slate/30 pb-3 mb-5">
        <span className="font-mono text-xs text-cyber-cyan bg-cyber-cyan/5 border border-cyber-cyan/20 px-2.5 py-1 rounded-md">
          QUESTION {currentIndex + 1} OF {quizData.length}
        </span>
        <div className="flex items-center gap-2 font-mono text-sm text-gray-300">
          <Timer className="w-4 h-4 text-amber-400" />
          <span>{formatTime(timeSpent)}</span>
        </div>
      </div>

      {/* Progress Accents Navigation Bar */}
      <div className="w-full h-1 bg-cyber-void rounded-full mb-6 overflow-hidden">
        <div 
          className="h-full bg-cyber-cyan transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / quizData.length) * 100}%` }}
        />
      </div>

      {/* Question Text Layer */}
      <p className="text-lg text-gray-100 font-medium mb-6 leading-relaxed">
        {currentQuestion.question}
      </p>

      {/* Grid containing selectable option wrappers */}
      <div className="space-y-3 mb-6">
        {currentQuestion.options.map((option, idx) => {
          const letter = alphabeticDesignations[idx];
          
          let optionStyles = "border-cyber-slate/30 bg-cyber-void/60 text-gray-300 hover:border-cyber-cyan/40 hover:bg-cyber-slate/20";
          let IconElement = null;

          if (isLocked) {
            const isCurrentCorrect = letter === currentQuestion.correctAnswer;
            const isCurrentSelected = idx === selectedOption;

            if (isCurrentCorrect) {
              optionStyles = "border-cyber-emerald bg-cyber-emerald/10 text-cyber-emerald";
              IconElement = <CheckCircle2 className="w-5 h-5 shrink-0 text-cyber-emerald" />;
            } else if (isCurrentSelected) {
              optionStyles = "border-cyber-crimson bg-cyber-crimson/10 text-cyber-crimson";
              IconElement = <XCircle className="w-5 h-5 shrink-0 text-cyber-crimson" />;
            } else {
              optionStyles = "border-cyber-slate/20 opacity-40 text-gray-500 cursor-not-allowed";
            }
          }

          return (
            <button
              key={idx}
              disabled={isLocked}
              onClick={() => handleOptionClick(idx)}
              className={`w-full text-left p-4 rounded-xl border flex items-center justify-between font-sans transition-all duration-200 group ${optionStyles}`}
            >
              <div className="flex items-start gap-3">
                <span className={`w-6 h-6 rounded-md flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                  isLocked ? 'bg-black/20' : 'bg-cyber-slate group-hover:bg-cyber-cyan/10 group-hover:text-cyber-cyan'
                }`}>
                  {letter}
                </span>
                <span className="text-sm md:text-base leading-tight pt-0.5">{option}</span>
              </div>
              {IconElement}
            </button>
          );
        })}
      </div>

      {/* Interactive Explanation Collapse Module */}
      {isLocked && (
        <div className="bg-cyber-void/80 border border-cyber-slate/30 rounded-xl p-4 mb-6 animate-fadeIn">
          <h4 className="font-mono text-xs text-cyber-cyan uppercase tracking-wider mb-1.5 font-bold">Examiner Rationale</h4>
          <p className="text-xs md:text-sm text-gray-300 leading-relaxed">{currentQuestion.explanation}</p>
        </div>
      )}

      {/* Navigation action execution button */}
      {isLocked && (
        <button
          onClick={handleNext}
          className="w-full py-3.5 rounded-xl font-mono text-sm font-bold bg-cyber-cyan text-cyber-void hover:bg-cyan-400 active:scale-[0.99] transition shadow-[0_0_15px_rgba(6,182,212,0.2)]"
        >
          {currentIndex === quizData.length - 1 ? 'FINALIZE EXAM MATRIX' : 'FORWARD NEXT_'}
        </button>
      )}
    </div>
  );
}