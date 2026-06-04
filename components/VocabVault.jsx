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
    <div className="w-full bg-cyber-obsidian border border-cyber-slate/30 rounded-xl p-5 backdrop-blur-md">
      
      {/* Search HUD Header Frame */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyber-slate/30 pb-5 mb-5">
        <div>
          <h3 className="text-xl font-bold font-mono tracking-wide text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyber-cyan" /> VOCABULARY VAULT
          </h3>
          <p className="text-xs text-gray-400 mt-1">AI-Extracted High-Frequency High-Yield Repositories</p>
        </div>

        {/* Tactical Border Input Box */}
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search words, concepts, or historical context..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-cyber-void border border-cyber-slate/40 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyber-cyan focus:shadow-[0_0_10px_rgba(6,182,212,0.1)] transition"
          />
        </div>
      </div>

      {/* Grid displaying the filtering state results */}
      {filteredVocab.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-cyber-slate/20 rounded-xl bg-cyber-void/20">
          <Layers className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-mono">NO_RECORDS_MATCHING_QUERY</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVocab.map((item, index) => (
            <div 
              key={item._id || index} 
              className="group bg-cyber-void/80 border border-cyber-slate/30 hover:border-cyber-cyan/30 p-4 rounded-xl transition duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Header Row: Word Title */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-base font-bold font-mono text-cyber-cyan tracking-wide group-hover:text-cyan-400 transition">
                    {item.word}
                  </h4>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{item.addedAt ? new Date(item.addedAt).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' }) : 'Recent'}</span>
                  </div>
                </div>

                {/* Primary Meaning Definition */}
                <p className="text-sm text-gray-200 mb-3 leading-relaxed font-sans">
                  {item.meaning}
                </p>
              </div>

              {/* Source Context Block from Raw Image Extract */}
              {item.context && (
                <div className="mt-2 pt-2 border-t border-cyber-slate/20">
                  <span className="font-mono text-[10px] text-gray-500 block mb-0.5 uppercase tracking-wider">Contextual Extraction</span>
                  <p className="text-xs italic text-gray-400 bg-cyber-slate/10 p-2 rounded border border-cyber-slate/10 font-sans leading-normal">
                    "{item.context}"
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footnote Data Tracker Count */}
      <div className="mt-4 pt-3 border-t border-cyber-slate/20 text-right font-mono text-[10px] text-gray-500">
        TOTAL ENTIRES INDEXED: {filteredVocab.length}
      </div>
    </div>
  );
}