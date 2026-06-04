'use client';

import { useState } from 'react';
import { Search, BookOpen, Layers, Calendar } from 'lucide-react';

export default function VocabVault({ vocabularyItems }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic localized filtering array logic
  const filteredVocab = vocabularyItems.filter((item) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      item.word.toLowerCase().includes(searchLower) ||
      item.meaning.toLowerCase().includes(searchLower) ||
      (item.context && item.context.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-xl">
      
      {/* Search HUD Header Frame */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5 mb-5">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-zinc-400" />
            Vocabulary Vault
          </h3>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">AI-extracted high-frequency facts and terms</p>
        </div>

        {/* Tactical Border Input Box */}
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search words or meanings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input pl-9 pr-3 py-2 text-xs w-full focus:outline-none"
          />
        </div>
      </div>

      {/* Grid displaying the filtering state results */}
      {filteredVocab.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/10 border border-zinc-900 rounded-lg">
          <Layers className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-xs text-zinc-500">No vocabulary matches found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVocab.map((item, index) => (
            <div 
              key={item._id || index} 
              className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-lg flex flex-col justify-between hover:border-zinc-800 transition"
            >
              <div>
                {/* Header Row: Word Title */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    {item.word}
                  </h4>
                  <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-mono">
                    <Calendar className="w-2.5 h-2.5" />
                    <span>{item.addedAt ? new Date(item.addedAt).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' }) : 'Recent'}</span>
                  </div>
                </div>

                {/* Primary Meaning Definition */}
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {item.meaning}
                </p>
              </div>

              {/* Source Context Block from Raw Image Extract */}
              {item.context && (
                <div className="bg-zinc-950 p-2.5 rounded border border-zinc-900 mt-3 select-none">
                  <span className="text-zinc-500 text-[8px] uppercase tracking-wider block mb-1">Source Context</span>
                  <p className="text-[11px] italic text-zinc-400 leading-normal">
                    "{item.context}"
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footnote Data Tracker Count */}
      <div className="mt-5 pt-3 border-t border-zinc-900 text-right text-zinc-600 text-[9px] font-mono">
        Total entries indexed: {filteredVocab.length}
      </div>
    </div>
  );
}