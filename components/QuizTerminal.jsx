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
      <div className="glass-card p-8 max-w-2xl mx-auto text-center animate-slide-up">
        <Award className="w-16 h-16 text-glass-accent mx-auto mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold tracking-wide text-gradient mb-2">Mock Exam Complete</h2>
        <p className="text-sm text-glass-muted mb-6">Your performance has been recorded</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-5 text-center">
            <div className="text-xs text-glass-muted uppercase tracking-wider mb-1">Final Score</div>
            <div className="text-xl font-bold text-glass-accent">{score} / {quizData.length}</div>
          </div>
          <div className="glass-card p-5 text-center">
            <div className="text-xs text-glass-muted uppercase tracking-wider mb-1">Precision</div>
            <div className="text-xl font-bold text-glass-success">{accuracy}%</div>
          </div>
          <div className="glass-card p-5 text-center">
            <div className="text-xs text-glass-muted uppercase tracking-wider mb-1">Time Elapsed</div>
            <div className="text-xl font-bold text-glass-amber">{formatTime(timeSpent)}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={resetQuiz}
            className="glass-card-hover cursor-pointer flex items-center justify-center gap-2 px-5 py-3 text-white font-semibold"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
          <button 
            onClick={copyShareLink}
            className="glass-card-hover cursor-pointer flex items-center justify-center gap-2 px-5 py-3 text-glass-accent font-semibold border-glass-accent/20"
          >
            <Share2 className="w-4 h-4" /> {shareCopied ? 'Link Copied!' : 'Share Quiz Link'}
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
    <div className="glass-card p-6 max-w-2xl mx-auto shadow-glow animate-fade-in relative overflow-hidden">
      
      {/* Top HUD Header Status Track */}
      <div className="flex justify-between items-center border-b border-glass-border pb-3 mb-5">
        <span className="glass-card !rounded-lg px-3 py-1.5 text-xs font-semibold text-glass-accent">
          Question {currentIndex + 1} of {quizData.length}
        </span>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Timer className="w-4 h-4 text-glass-amber" />
          <span>{formatTime(timeSpent)}</span>
        </div>
      </div>

      {/* Progress Accents Navigation Bar */}
      <div className="w-full h-1 bg-white/5 rounded-full mb-6 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-glass-accent to-glass-glow rounded-full transition-all duration-300"
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
          
          let optionStyles = "border-white/8 bg-white/[0.03] text-gray-300 hover:bg-white/[0.06] hover:border-glass-accent/20";
          let badgeStyles = "bg-white/5 group-hover:bg-glass-accent/10 group-hover:text-glass-accent";
          let IconElement = null;

          if (isLocked) {
            const isCurrentCorrect = letter === currentQuestion.correctAnswer;
            const isCurrentSelected = idx === selectedOption;

            if (isCurrentCorrect) {
              optionStyles = "border-glass-success/40 bg-glass-success/10 text-glass-success shadow-glow-success";
              badgeStyles = "bg-glass-success/20 text-glass-success";
              IconElement = <CheckCircle2 className="w-5 h-5 shrink-0 text-glass-success" />;
            } else if (isCurrentSelected) {
              optionStyles = "border-glass-danger/40 bg-glass-danger/10 text-glass-danger shadow-glow-danger";
              badgeStyles = "bg-glass-danger/20 text-glass-danger";
              IconElement = <XCircle className="w-5 h-5 shrink-0 text-glass-danger" />;
            } else {
              optionStyles = "border-white/5 opacity-30 text-gray-500 cursor-not-allowed";
              badgeStyles = "bg-white/5 text-gray-500";
            }
          }

          return (
            <button
              key={idx}
              disabled={isLocked}
              onClick={() => handleOptionClick(idx)}
              className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all duration-200 group ${optionStyles}`}
            >
              <div className="flex items-start gap-3">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${badgeStyles}`}>
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
        <div className="glass-card p-4 mb-6 animate-fade-in">
          <h4 className="text-glass-accent text-xs uppercase tracking-wider font-bold mb-1.5">Explanation</h4>
          <p className="text-xs md:text-sm text-gray-300 leading-relaxed">{currentQuestion.explanation}</p>
        </div>
      )}

      {/* Navigation action execution button */}
      {isLocked && (
        <button
          onClick={handleNext}
          className="btn-gradient w-full py-3.5 text-sm"
        >
          {currentIndex === quizData.length - 1 ? 'Finish Exam' : 'Next Question'}
        </button>
      )}
    </div>
  );
}