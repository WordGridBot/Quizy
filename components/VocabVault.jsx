'use client';

import { useState } from 'react';
import { Search, BookOpen, Layers, Calendar } from 'lucide-react';

export default function VocabVault({ vocabularyItems }) {
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Dynamic localized filtering array logic
  const filteredVocab = vocabularyItems.filter((item) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      item.word.toLowerCase().includes(searchLower) ||
      item.meaning.toLowerCase().includes(searchLower) ||
      (item.context && item.context.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="glass-card p-6">
      
      {/* Search HUD Header Frame */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5 mb-5">
        <div>
          <h3 className="text-xl font-bold tracking-wide text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-glass-accent" />
            <span className="text-gradient">Vocabulary Vault</span>
          </h3>
          <p className="text-xs text-glass-muted mt-1">AI-extracted high-frequency revision terms</p>
        </div>

        {/* Tactical Border Input Box */}
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-glass-muted" />
          <input
            type="text"
            placeholder="Search words, meanings, or context..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input pl-10 pr-4 py-3 text-sm w-full"
          />
        </div>
      </div>

      {/* Grid displaying the filtering state results */}
      {filteredVocab.length === 0 ? (
        <div className="glass-card text-center py-14">
          <Layers className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-glass-muted text-sm">No matching results found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVocab.map((item, index) => (
            <div 
              key={item._id || index} 
              className="glass-card-hover p-5 flex flex-col justify-between"
            >
              <div>
                {/* Header Row: Word Title */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-gradient text-base font-bold tracking-wide">
                    {item.word}
                  </h4>
                  <div className="flex items-center gap-1 text-[10px] text-glass-muted">
                    <Calendar className="w-3 h-3 text-glass-muted" />
                    <span>{item.addedAt ? new Date(item.addedAt).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' }) : 'Recent'}</span>
                  </div>
                </div>

                {/* Primary Meaning Definition */}
                <p className="text-sm text-gray-200/90 leading-relaxed">
                  {item.meaning}
                </p>
              </div>

              {/* Source Context Block from Raw Image Extract */}
              {item.context && (
                <div className="glass-card !rounded-lg p-3 mt-3">
                  <span className="text-glass-muted text-[10px] uppercase tracking-wider block mb-1">Source Context</span>
                  <p className="text-xs italic text-gray-400 leading-normal">
                    "{item.context}"
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footnote Data Tracker Count */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] text-right text-glass-muted text-[10px]">
        Total entries indexed: {filteredVocab.length}
      </div>
    </div>
  );
}